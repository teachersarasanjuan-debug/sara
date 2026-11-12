import OpenAI from "openai";
let client:OpenAI|null=null;
export function getOpenAI() {
  if(!process.env.OPENAI_API_KEY) throw new Error("AI service is not configured.");
  if(!client) client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:1,timeout:30000});
  return client;
}