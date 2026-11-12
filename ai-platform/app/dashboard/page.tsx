import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data:subscription } = await supabase.from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id",user.id).maybeSingle();

  const isPaid = subscription && ["active","trialing"].includes(subscription.status);
  return <main className="wrap">
    <header className="top" style={{margin:"0 -20px",padding:"0 20px"}}>
      <Link href="/" className="brand"><span className="brand-mark">TS</span><span>Teacher Sara<small>AI LEARNING STUDIO</small></span></Link>
      <form action={signOut}><button className="button secondary" type="submit">Sign out</button></form>
    </header>
    <section className="dashboard-head">
      <p className="eyebrow">YOUR LEARNING SPACE</p>
      <h1 style={{fontSize:34,margin:"5px 0"}}>Welcome back</h1>
      <p className="muted">{user.email}</p>
    </section>
    <div className="dash-grid">
      <section className="panel">
        <span className="pill">AVAILABLE NOW</span><h2>Practice English</h2>
        <p className="muted">Start a focused session with one clear goal and one useful next step.</p>
        <Link className="button" href="/practice">Start practice →</Link>
      </section>
      <section className="panel">
        <span className={isPaid?"pill":"badge"}>{isPaid?"SUBSCRIBED":"FREE STARTER"}</span>
        <h2>Membership</h2>
        <p className="muted">{isPaid?"Your paid access is active.":"Try a limited number of AI practice sessions each day. Paid plans will be shown once pricing is confirmed."}</p>
        <Link className="button secondary" href="/billing">{isPaid?"Manage billing":"View plans"}</Link>
      </section>
    </div>
    <section className="section">
      <div className="note"><strong>Adult beta:</strong> Do not use this account on behalf of a child. Young learner AI sessions will remain disabled until parent/guardian consent, safeguarding and data protection requirements are completed.</div>
    </section>
  </main>;
}