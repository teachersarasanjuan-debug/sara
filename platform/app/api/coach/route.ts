import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {getOpenAI} from "@/lib/openai";
import {buildCoachInstructions, type Track} from "@/lib/coach-prompts";
import {sameOrigin} from "@/lib/security";
export const runtime="nodejs";
const tracks:Track[]=["cambridge","business"];
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});
 let body:{track?:string;level?:string;message?:string};try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 const message=typeof body.message==="string"?body.message.trim():"";const track=body.track as Track;const level=body.level??"B1";
 if(track==="young")return NextResponse.json({error:"Young learner sessions are not open. Guardian and teacher safeguards must be completed first."},{status:403});
 if(!tracks.includes(track)||!["A2","B1","B2","C1"].includes(level))return NextResponse.json({error:"Unsupported learning path or level."},{status:400});
 if(message.length<2||message.length>1600)return NextResponse.json({error:"Please enter between 2 and 1,600 characters."},{status:400});
 try{
  const ai=getOpenAI();
  const moderation=await ai.moderations.create({model:process.env.OPENAI_MODERATION_MODEL??"omni-moderation-latest",input:message});
  if(moderation.results[0]?.flagged)return NextResponse.json({error:"This message cannot be processed. Please rephrase it as an English-learning exercise."},{status:400});
  const {data:quota,error:quotaError}=await auth.supabase.rpc("consume_ai_credit");
  if(quotaError)return NextResponse.json({error:"Usage limits are not configured. Please try again later."},{status:503});
  const q=Array.isArray(quota)?quota[0]:quota;
  if(!q?.allowed)return NextResponse.json({error:"You have used this month's included messages. Please view membership options to continue."},{status:402});
  try{
   const response=await ai.responses.create({
    model:process.env.OPENAI_MODEL??"gpt-4.1-mini",
    instructions:buildCoachInstructions(track,level),
    input:message,store:false,text:{format:{type:"json_object"}}
   });
   const text=response.output_text;if(!text)throw new Error("Empty model output");
   const result=JSON.parse(text) as {reply?:string;correction?:{original?:string;improved?:string;why?:string};retry_prompt?:string;skill_note?:string};
   if(typeof result.reply!=="string"||result.reply.length>2400)throw new Error("Invalid output shape");
   return NextResponse.json({
    reply:result.reply,
    correction:{original:typeof result.correction?.original==="string"?result.correction.original.slice(0,500):"",improved:typeof result.correction?.improved==="string"?result.correction.improved.slice(0,500):"",why:typeof result.correction?.why==="string"?result.correction.why.slice(0,700):""},
    retryPrompt:typeof result.retry_prompt==="string"?result.retry_prompt.slice(0,500):"",
    skillNote:typeof result.skill_note==="string"?result.skill_note.slice(0,300):"",
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