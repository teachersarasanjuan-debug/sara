import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {buildVoiceInstructions,type Track} from "@/lib/coach-prompts";
import {createHash} from "node:crypto";
import {sameOrigin} from "@/lib/security";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});
 const {data:profile}=await auth.supabase.from("profiles").select("subscription_status").eq("id",auth.user.id).maybeSingle();
 if(!profile||!["active","trialing"].includes(profile.subscription_status))return NextResponse.json({error:"Voice practice is a paid-member feature."},{status:402});
 let body:{track?:string;level?:string};try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 const track=body.track as Track,level=body.level??"B1";
 if(!["cambridge","business"].includes(track)||!["A2","B1","B2","C1"].includes(level))return NextResponse.json({error:"Unsupported voice settings."},{status:400});
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Voice service is not configured."},{status:503});
 const {data:credit,error}=await auth.supabase.rpc("consume_voice_credit");
 const q=Array.isArray(credit)?credit[0]:credit;
 if(error||!q?.allowed)return NextResponse.json({error:"Your included voice sessions have been used."},{status:402});
 try{
  const response=await fetch("https://api.openai.com/v1/realtime/client_secrets",{method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json","OpenAI-Safety-Identifier":createHash("sha256").update(auth.user.id).digest("hex")},body:JSON.stringify({session:{type:"realtime",model:process.env.OPENAI_REALTIME_MODEL??"gpt-realtime-2.1-mini-mini",audio:{output:{voice:"marin"}},instructions:buildVoiceInstructions(track,level)}}),cache:"no-store"});
  const result=await response.json();if(!response.ok){await auth.supabase.rpc("refund_voice_credit");return NextResponse.json({error:"Could not create a voice session."},{status:503});}
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){await auth.supabase.rpc("refund_voice_credit");console.error("Voice setup failed:",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Voice practice is temporarily unavailable."},{status:503});}
}