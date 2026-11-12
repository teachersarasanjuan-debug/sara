import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser,isTeacherEmail} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

export default async function TeacherPage(){
 const auth=await getCurrentUser();if(!auth)redirect("/login");if(!isTeacherEmail(auth.user.email))redirect("/studio");
 const db=createAdminClient();
 const {data:rows}=await db.from("profiles").select("id,email,plan,subscription_status,monthly_used,created_at").order("created_at",{ascending:false}).limit(100);
 const {data:notes}=await db.from("learning_notes").select("id,user_id,track,scenario,level,note,created_at").order("created_at",{ascending:false}).limit(200);
 const ids=[...new Set((notes??[]).map(note=>note.user_id))];
 const {data:owners}=ids.length?await db.from("profiles").select("id,email").in("id",ids):{data:[]};
 const emails=new Map((owners??[]).map(owner=>[owner.id,owner.email]));
 return <><header className="top"><Link className="brand" href="/"><span className="pill">TS</span><span><strong>Teacher Sara AI</strong><small>Teacher view</small></span></Link><Link href="/studio">Back to studio</Link></header>
 <main className="page wrap">
  <section className="panel"><p className="eyebrow">TEACHER DASHBOARD</p><h1>Account overview</h1><p className="muted">Account and usage metadata. Chat transcripts and voice recordings are not retained.</p><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Account</th><th>Plan</th><th>Status</th><th>Messages this month</th></tr></thead><tbody>{(rows??[]).map(row=><tr key={row.id}><td>{row.email}</td><td>{row.plan}</td><td>{row.subscription_status}</td><td>{row.monthly_used}</td></tr>)}</tbody></table></div></section>
  <section className="panel" style={{marginTop:18}}><p className="eyebrow">OPT-IN LEARNING NOTES</p><h2>What learners are working on</h2><p className="muted">Only learners who have explicitly enabled sharing appear here. These are short, general skill notes—not answers, chat history, recordings or official scores. Turning sharing off deletes that learner's existing notes.</p>
   {(notes??[]).length===0?<p className="small">No learners have shared a learning note yet.</p>:<div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Learner</th><th>Learning path</th><th>Scenario</th><th>Level</th><th>Skill note</th><th>Date</th></tr></thead><tbody>{(notes??[]).map(note=><tr key={note.id}><td>{emails.get(note.user_id)??"Learner"}</td><td>{note.track==="business"?"Business English":"Cambridge practice"}</td><td>{note.scenario}</td><td>{note.level}</td><td>{note.note}</td><td>{new Date(note.created_at).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table></div>}
  </section>
 </main></>;
}