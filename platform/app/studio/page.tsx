import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import Coach from "./coach";
import VoiceCoach from "./voice-coach";
import BillingButtons from "./billing-buttons";
export default async function StudioPage(){
 const auth=await getCurrentUser();if(!auth)redirect("/login");
 const {data:profile}=await auth.supabase.from("profiles").select("plan,subscription_status,monthly_used,usage_month,voice_sessions_used,voice_usage_month").eq("id",auth.user.id).maybeSingle();
 const active=profile?.subscription_status==="active"||profile?.subscription_status==="trialing";
 const month=new Date().toISOString().slice(0,7);
 const used=profile?.usage_month?.slice(0,7)===month?(profile?.monthly_used??0):0;
 const voiceUsed=profile?.voice_usage_month?.slice(0,7)===month?(profile?.voice_sessions_used??0):0;
 const limit=active?300:10;
 return <><header className="top"><Link className="brand" href="/"><span className="pill">TS</span><span><strong>Teacher Sara AI</strong><small>Your learning studio</small></span></Link><div className="nav"><span className="small">{auth.user.email}</span><form action="/auth/signout" method="post"><button className="btn secondary">Sign out</button></form></div></header>
 <main className="page wrap"><div className="row space"><div><p className="eyebrow">YOUR PRIVATE STUDIO</p><h1 style={{fontFamily:"Manrope"}}>Welcome back</h1><p className="muted">Practise, understand the feedback, then try it in a new situation.</p></div><div className="card"><span className="pill">{active?"MEMBERSHIP ACTIVE":"FREE BETA"}</span><p className="small">{used} of {limit} monthly AI messages used</p><div style={{height:7,background:"#e7eee8",borderRadius:9,width:180}}><div style={{height:7,background:"#176b57",borderRadius:9,width:Math.min(100,limit?used/limit*100:0)+"%"}}/></div>{active&&<p className="small">{voiceUsed} of 10 monthly voice sessions used</p>}<BillingButtons active={active}/></div></div>
 <div style={{marginTop:28}}><Coach/><VoiceCoach canUse={active}/></div><p className="small" style={{marginTop:24}}>Messages are sent to the AI provider to generate a reply. Voice sessions stream microphone audio to the Realtime provider. This application does not store chat transcripts or recordings. Usage counts and membership metadata are stored. Do not enter personal, health, financial or confidential workplace information.</p>
 <div className="notice warning" style={{marginTop:12}}>Young learner accounts are not enabled. Child-facing AI remains closed until guardian controls, safeguarding and legal review are complete.</div></main></>;
}