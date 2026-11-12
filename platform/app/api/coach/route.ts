import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {getOpenAI} from "@/lib/openai";
import {buildCoachInstructions,type Track} from "@/lib/coach-prompts";
import {sameOrigin} from "@/lib/security";

export const runtime="nodejs";
type HistoryItem={role:"user"|"assistant";content:string};
const tracks:Track[]=["cambridge","business"];

export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();
 if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});

 let body:{track?:string;level?:string;message?:string;history?:HistoryItem[]};
 try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}

 const message=typeof body.message==="string"?body.message.trim():"";
 const track=body.track as Track;
 const level=body.level??"B1";
 if(track==="young")return NextResponse.json({error:"Young learner sessions are not open. Guardian and teacher safeguards must be completed first."},{status:403});
 if(!tracks.includes(track)||!["A2","B1","B2","C1"].includes(level))return NextResponse.json({error:"Unsupported learning path or level."},{status:400});
 if(message.length<2||message.length>1600)return NextResponse.json({error:"Please enter between 2 and 1,600 characters."},{status:400});

 const history=Array.isArray(body.history)?body.history.slice(-8):[];
 if(history.some(item=>!item||!["user","assistant"].includes(item.role)||typeof item.content!=="string"||item.content.length>1600))
  return NextResponse.json({error:"Invalid conversation history."},{status:400});

 try{
  const ai=getOpenAI();
  const moderationModel=process.env.OPENAI_MODERATION_MODEL??"omni-moderation-latest";
  const inputCheck=await ai.moderations.create({model:moderationModel,input:message});
  if(inputCheck.results[0]?.flagged)
   return NextResponse.json({error:"This message cannot be processed. Please rephrase it as an English-learning exercise."},{status:400});

  const {data:quota,error:quotaError}=await auth.supabase.rpc("consume_ai_credit");
  if(quotaError)return NextResponse.json({error:"Usage limits are not configured. Please try again later."},{status:503});
  const q=Array.isArray(quota)?quota[0]:quota;
  if(!q?.allowed)return NextResponse.json({error:"You have used this month's included messages. Please view membership options to continue."},{status:402});

  try{
   const response=await ai.responses.create({
    model:process.env.OPENAI_MODEL??"gpt-4.1-mini",
    instructions:buildCoachInstructions(track,level),
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

   return NextResponse.json({
    reply:unsafe?"Let's keep our practice focused on a safe, respectful English-learning topic. Please try a different example.":result.reply,
    correction:unsafe?{original:"",improved:"",why:""}:{
     original:typeof result.correction?.original==="string"?result.correction.original.slice(0,500):"",
     improved:typeof result.correction?.improved==="string"?result.correction.improved.slice(0,500):"",
     why:typeof result.correction?.why==="string"?result.correction.why.slice(0,700):""
    },
    retryPrompt:unsafe?"":typeof result.retry_prompt==="string"?result.retry_prompt.slice(0,500):"",
    skillNote:unsafe?"":typeof result.skill_note==="string"?result.skill_note.slice(0,300):"",
    remaining:q.remaining
   },{headers:{"Cache-Control":"no-store"}});
  }catch(inner){
   await auth.supabase.rpc("refund_ai_credit");
   throw inner;
  }
 }catch(error){
  console.error("Coach request failed:",error instanceof Error?error.message:"unknown error");
  return NextResponse.json({error:"The coach is temporarily unavailable. Your message was not saved; please try again."},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}