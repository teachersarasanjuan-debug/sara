import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getOpenAI} from "@/lib/openai";
import {buildCoachInstructions,isValidScenario,type Track,type Scenario} from "@/lib/coach-prompts";
import {sameOrigin} from "@/lib/security";

export const runtime="nodejs";
type HistoryItem={role:"user"|"assistant";content:string};
const tracks:Track[]=["cambridge","business"];

export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();
 if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});

 const declaredLength=Number(request.headers.get("content-length")??"0");
 if(declaredLength>18000)return NextResponse.json({error:"This request is too large. Please shorten your message or start a new practice."},{status:413});
 let body:{track?:string;level?:string;message?:string;scenario?:string;history?:HistoryItem[]};
 try{
  const raw=await request.text();
  if(raw.length>18000)return NextResponse.json({error:"This request is too large. Please shorten your message or start a new practice."},{status:413});
  body=JSON.parse(raw);
 }catch{return NextResponse.json({error:"Invalid request."},{status:400});}

 const message=typeof body.message==="string"?body.message.trim():"";
 const track=body.track as Track;
 const level=body.level??"B1";
 const scenario=(body.scenario??(track==="business"?"project-update":"personal-response")) as Scenario;
 if(track==="young")return NextResponse.json({error:"Young learner sessions are not open. Guardian and teacher safeguards must be completed first."},{status:403});
 if(!tracks.includes(track)||!["A2","B1","B2","C1"].includes(level)||!isValidScenario(track,scenario))return NextResponse.json({error:"Unsupported learning path, level or lesson scenario."},{status:400});
 if(message.length<2||message.length>1600)return NextResponse.json({error:"Please enter between 2 and 1,600 characters."},{status:400});

 const history=Array.isArray(body.history)?body.history.slice(-8):[];
 if(history.length>0&&history.some(item=>!item||!["user","assistant"].includes(item.role)||typeof item.content!=="string"||item.content.length>1600))
  return NextResponse.json({error:"Invalid conversation history."},{status:400});
 const totalHistory=history.reduce((sum,item)=>sum+(typeof item?.content==="string"?item.content.length:0),0);
 if(totalHistory>6000)return NextResponse.json({error:"Please start a new practice to keep this conversation short."},{status:400});

 let admin:ReturnType<typeof createAdminClient>|null=null;
 let creditConsumed=false;
 try{
  // Quota is consumed before paid AI/moderation calls to prevent free abuse.
  // All quota RPCs use the server-only service role; browser users cannot invoke refunds.
  admin=createAdminClient();
  const {data:quota,error:quotaError}=await admin.rpc("consume_ai_credit",{p_user_id:auth.user.id});
  if(quotaError)return NextResponse.json({error:"Usage limits are not configured. Please try again later."},{status:503});
  const q=Array.isArray(quota)?quota[0]:quota;
  if(!q?.allowed)return NextResponse.json({error:"You have used this month's included messages. Please view membership options to continue."},{status:402});
  creditConsumed=true;

  const ai=getOpenAI();
  const moderationModel=process.env.OPENAI_MODERATION_MODEL??"omni-moderation-latest";
  const learnerContext=[...history.filter(item=>item.role==="user").map(item=>item.content),message].join("\n");
  const inputCheck=await ai.moderations.create({model:moderationModel,input:learnerContext});
  if(inputCheck.results[0]?.flagged){
   await admin.rpc("refund_ai_credit",{p_user_id:auth.user.id});
   creditConsumed=false;
   return NextResponse.json({error:"This message cannot be processed. Please rephrase it as an English-learning exercise."},{status:400});
  }

  const response=await ai.responses.create({
   model:process.env.OPENAI_MODEL??"gpt-5.4-mini",
   instructions:buildCoachInstructions(track,level,scenario),
   input:[...history,{role:"user",content:message}],
   max_output_tokens:450,
   store:false,
   text:{format:{type:"json_object"}}
  });
  const raw=response.output_text;
  if(!raw)throw new Error("Empty model output");
  const result=JSON.parse(raw) as {
   reply?:string;
   correction?:{original?:string;improved?:string;why?:string};
   retry_prompt?:string;
   skill_note?:string;
  };
  if(typeof result.reply!=="string"||result.reply.length>2400)throw new Error("Invalid output shape");

  const moderationPayload=[
   result.reply,result.correction?.original,result.correction?.improved,
   result.correction?.why,result.retry_prompt,result.skill_note
  ].filter(Boolean).join(" | ");
  const outputCheck=await ai.moderations.create({model:moderationModel,input:moderationPayload});
  const unsafe=!!outputCheck.results[0]?.flagged;

  const skillNote=unsafe?"":typeof result.skill_note==="string"?result.skill_note.trim().slice(0,300):"";
  if(!unsafe&&skillNote){
   const {error:noteError}=await admin.rpc("save_learning_note",{p_user_id:auth.user.id,p_track:track,p_scenario:scenario,p_level:level,p_note:skillNote});
   if(noteError)console.error("Optional learning note was not saved:",noteError.message);
  }
  const payload={
   reply:unsafe?"Let's keep our practice focused on a safe, respectful English-learning topic. Please try a different example.":result.reply,
   correction:unsafe?{original:"",improved:"",why:""}:{
    original:typeof result.correction?.original==="string"?result.correction.original.slice(0,500):"",
    improved:typeof result.correction?.improved==="string"?result.correction.improved.slice(0,500):"",
    why:typeof result.correction?.why==="string"?result.correction.why.slice(0,700):""
   },
   retryPrompt:unsafe?"":typeof result.retry_prompt==="string"?result.retry_prompt.slice(0,500):"",
   skillNote,
   remaining:q.remaining
  };
  creditConsumed=false;
  return NextResponse.json(payload,{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(admin&&creditConsumed){
   try{await admin.rpc("refund_ai_credit",{p_user_id:auth.user.id});}catch(refundError){console.error("AI credit refund failed:",refundError instanceof Error?refundError.message:"unknown");}
  }
  console.error("Coach request failed:",error instanceof Error?error.message:"unknown error");
  return NextResponse.json({error:"The coach is temporarily unavailable. Please try again."},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}