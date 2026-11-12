import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PracticeChat } from "./practice-chat";

export default async function PracticePage() {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <main className="wrap">
    <header className="top" style={{margin:"0 -20px",padding:"0 20px"}}>
      <Link href="/dashboard" className="brand"><span className="brand-mark">TS</span><span>Teacher Sara<small>AI LEARNING STUDIO</small></span></Link>
      <Link href="/billing" className="button secondary">Membership</Link>
    </header>
    <div className="practice-layout">
      <aside className="panel">
        <p className="eyebrow">SESSION SETTINGS</p>
        <h2 style={{fontSize:22}}>Choose your practice</h2>
        <p className="muted" style={{fontSize:12}}>Choose the goal closest to what you need today.</p>
        <ul className="list">
          <li>One focused skill per turn</li>
          <li>Clear explanations, not vague scores</li>
          <li>Try again in a fresh context</li>
          <li>Text-only feedback in this first beta</li>
        </ul>
        <div className="note">Pronunciation and listening are not scored in text-only mode.</div>
        <p className="mini" style={{marginTop:22}}><Link href="/dashboard">← Back to dashboard</Link></p>
      </aside>
      <PracticeChat/>
    </div>
  </main>;
}