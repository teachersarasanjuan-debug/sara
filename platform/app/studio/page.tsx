import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import Coach from "./coach";
import VoiceCoach from "./voice-coach";
import BillingButtons from "./billing-buttons";
import LearningNotesConsent from "./learning-notes-consent";

export default async function StudioPage(){
 const auth=await getCurrentUser();if(!auth)redirect("/login");
 const {data:profile}=await auth.supabase.from("profiles").select("plan,subscription_status,monthly_used,usage_month,voice_sessions_used,voice_usage_month,share_learning_notes").eq("id",auth.user.id).maybeSingle();
 const active=profile?.subscription_status==="active"||profile?.subscription_status==="trialing";
 const month=new Date().toISOString().slice(0,7);
 const used=profile?.usage_month?.slice(0,7)===month?(profile?.monthly_used??0):0;
 const voiceUsed=profile?.voice_usage_month?.slice(0,7)===month?(profile?.voice_sessions_used??0):0;
 const limit=active?300:10;
 const {data:notes}=await auth.supabase.from("learning_notes").select("id,track,scenario,level,note,created_at").order("created_at",{ascending:false}).limit(12);
 return <><header className="top"><Link className="brand" href="/"><span className="pill">TS</span><span><strong>Teacher Sara AI</strong><small>Your learning studio</small></span></Link><div className="nav"><span className="small">{auth.user.email}</span><form action="/auth/signout" method="post"><button className="btn secondary">Sign out</button></form></div></header>
 <main className="page wrap">
  <div className="row space"><div><p className="eyebrow">YOUR PRIVATE STUDIO</p><h1 style={{fontFamily:"Manrope"}}>Welcome back</h1><p className="muted">Practise, understand the feedback, then try it in a new situation.</p></div><div className="card"><span className="pill">{active?"MEMBERSHIP ACTIVE":"FREE BETA"}</span><p className="small">{used} of {limit} monthly AI messages used</p><div style={{height:7,background:"#e7eee8",borderRadius:9,width:180}}><div style={{height:7,background:"#176b57",borderRadius:9,width:Math.min(100,limit?used/limit*100:0)+"%"}}/></div>{active&&<p className="small">{voiceUsed} of 10 monthly voice sessions used</p>}<BillingButtons active={active}/></div></div>
  <div style={{marginTop:28}}><Coach/><VoiceCoach canUse={active}/></div>
  <LearningNotesConsent initialEnabled={profile?.share_learning_notes??false}/>
  <section className="panel" style={{marginTop:18}}><div className="row space"><div><p className="eyebrow">YOUR LEARNING NOTES</p><h2>Skills to work on</h2></div><span className="small">Private to your account</span></div>
   {profile?.share_learning_notes?(notes&&notes.length>0?<div style={{display:"grid",gap:10,marginTop:12}}>{notes.map(note=><article className="card" key={note.id}><div className="row space"><span className="pill">{note.track==="business"?"BUSINESS ENGLISH":"CAMBRIDGE PRACTICE"} · {note.level}</span><span className="small">{new Date(note.created_at).toLocaleDateString("en-GB")}</span></div><p style={{marginBottom:0}}>{note.note}</p></article>)}</div>:<p className="small">No notes yet. After a practice session, a short skill note may appear here and be available to Sara while sharing is enabled.</p>):<p className="small">Sharing is off. Turn it on above if you would like Sara to see short, general skill notes to guide future lessons.</p>}
  </section>
  <p className="small" style={{marginTop:24}}>Messages are sent to the AI provider to generate a reply. Voice sessions stream microphone audio to the Realtime provider. This application does not store chat transcripts or recordings. Only account, subscription and usage metadata are stored by default. Optional skill notes are stored only when you turn on sharing.</p>
  <div className="notice warning" style={{marginTop:12}}>Young learner accounts are not enabled. Child-facing AI remains closed until guardian controls, safeguarding and legal review are complete.</div>
 </main></>;
}