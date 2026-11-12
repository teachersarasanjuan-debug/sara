import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {buildVoiceInstructions,type Track} from "@/lib/coach-prompts";
import {createHash} from "node:crypto";
import {sameOrigin} from "@/lib/security";

export const runtime="nodejs";

export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();
 if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});

 const {data:profile}=await auth.supabase.from("profiles").select("subscription_status").eq("id",auth.user.id).maybeSingle();
 if(!profile||!["active","trialing"].includes(profile.subscription_status))
  return NextResponse.json({error:"Voice practice is a paid-member feature."},{status:402});

 let body:{track?:string;level?:string;sdp?:string};
 try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 const track=body.track as Track,level=body.level??"B1",sdp=typeof body.sdp==="string"?body.sdp:"";
 if(!["cambridge","business"].includes(track)||!["A2","B1","B2","C1"].includes(level))
  return NextResponse.json({error:"Unsupported voice settings."},{status:400});
 if(sdp.length<100||sdp.length>100000)
  return NextResponse.json({error:"The browser did not provide a valid voice connection offer."},{status:400});
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Voice service is not configured."},{status:503});

 let admin:ReturnType<typeof createAdminClient>|null=null;
 let creditConsumed=false;
 try{
  admin=createAdminClient();
  const {data:credit,error}=await admin.rpc("consume_voice_credit",{p_user_id:auth.user.id});
  const q=Array.isArray(credit)?credit[0]:credit;
  if(error)return NextResponse.json({error:"Voice usage limits are not configured."},{status:503});
  if(!q?.allowed)return NextResponse.json({error:"Your included monthly voice sessions have been used."},{status:402});
  creditConsumed=true;

  const session={
   type:"realtime",
   model:process.env.OPENAI_REALTIME_MODEL??"gpt-realtime-2.1-mini",
   audio:{output:{voice:"marin"}},
   instructions:buildVoiceInstructions(track,level)
  };
  const form=new FormData();
  form.set("sdp",sdp);
  form.set("session",new Blob([JSON.stringify(session)],{type:"application/json"}));
  const response=await fetch("https://api.openai.com/v1/realtime/calls",{
   method:"POST",
   headers:{
    "Authorization":"Bearer "+process.env.OPENAI_API_KEY,
    "OpenAI-Safety-Identifier":createHash("sha256").update(auth.user.id).digest("hex")
   },
   body:form,
   cache:"no-store"
  });
  const answer=await response.text();
  if(!response.ok||!answer.startsWith("v="))throw new Error("Realtime call setup was rejected.");
  creditConsumed=false;
  return new NextResponse(answer,{status:200,headers:{"Content-Type":"application/sdp","Cache-Control":"no-store"}});
 }catch(error){
  if(admin&&creditConsumed){
   try{await admin.rpc("refund_voice_credit",{p_user_id:auth.user.id});}
   catch(refundError){console.error("Voice credit refund failed:",refundError instanceof Error?refundError.message:"unknown");}
  }
  console.error("Voice call setup failed:",error instanceof Error?error.message:"unknown");
  return NextResponse.json({error:"Voice practice is temporarily unavailable."},{status:503});
 }
}