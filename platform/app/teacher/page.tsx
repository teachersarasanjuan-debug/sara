import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser,isTeacherEmail} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export default async function TeacherPage(){
 const auth=await getCurrentUser();if(!auth)redirect("/login");if(!isTeacherEmail(auth.user.email))redirect("/studio");
 const db=createAdminClient();const {data:rows}=await db.from("profiles").select("id,email,plan,subscription_status,monthly_used,created_at").order("created_at",{ascending:false}).limit(100);
 return <><header className="top"><Link className="brand" href="/"><span className="pill">TS</span><span><strong>Teacher Sara AI</strong><small>Teacher view</small></span></Link><Link href="/studio">Back to studio</Link></header><main className="page wrap"><section className="panel"><p className="eyebrow">TEACHER DASHBOARD</p><h1>Account overview</h1><p className="muted">Account and usage metadata only. The application does not retain chat transcripts.</p><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Account</th><th>Plan</th><th>Status</th><th>Messages this month</th></tr></thead><tbody>{(rows??[]).map(row=><tr key={row.id}><td>{row.email}</td><td>{row.plan}</td><td>{row.subscription_status}</td><td>{row.monthly_used}</td></tr>)}</tbody></table></div></section></main></>;
}