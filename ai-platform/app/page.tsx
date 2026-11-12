import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    // The preview remains readable until Supabase is provisioned.
  }

  return (
    <>
      <header className="top">
        <Link href="/" className="brand"><span className="brand-mark">TS</span><span>Teacher Sara<small>AI LEARNING STUDIO</small></span></Link>
        <nav className="nav">
          <a href="#tracks">Learning tracks</a>
          <a href="#method">Our method</a>
          <Link className="button secondary" href={signedIn ? "/dashboard" : "/login"}>{signedIn ? "My learning" : "Sign in"}</Link>
        </nav>
      </header>
      <main>
        <section className="hero wrap">
          <div>
            <p className="eyebrow">TEACHER-LED ENGLISH PRACTICE</p>
            <h1>Practise with purpose.<br/><em>Improve with confidence.</em></h1>
            <p className="lead">Thoughtful English practice for real life and work. Every session has a clear objective, focused feedback and a chance to try again — with a teacher behind the method.</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
              <Link className="button" href={signedIn ? "/practice" : "/login"}>Start practising →</Link>
              <a className="button secondary" href="#method">How it works</a>
            </div>
            <p className="mini" style={{marginTop:16}}>Created with the teaching experience of Sara, a British English teacher with 15+ years in Spanish schools.</p>
          </div>
          <aside className="hero-card">
            <span className="pill">THE LEARNING CYCLE</span>
            <h3 style={{marginTop:17}}>Not another endless chatbot.</h3>
            <p className="muted" style={{fontSize:13}}>A useful lesson follows a structure that helps you notice, practise and remember.</p>
            <div className="track-list">
              {[
                ["01","Set a goal","Know what you are practising."],
                ["02","Try in context","Use English in a real situation."],
                ["03","Get clear feedback","Understand one improvement."],
                ["04","Try it again","Show you can use it independently."]
              ].map(([n,t,d])=><div className="track" key={n}><div className="track-icon">{n}</div><div><strong>{t}</strong><small>{d}</small></div></div>)}
            </div>
          </aside>
        </section>
        <section className="section" id="tracks" style={{background:"#f1f6f2"}}>
          <div className="wrap">
            <p className="eyebrow">LEARNING TRACKS</p><h2>Three paths. One thoughtful approach.</h2>
            <p className="section-lead">Choose the practice that matches your goal. The initial online beta is for adults. Child accounts and open chat are held back until parent consent and safeguarding controls have been completed.</p>
            <div className="grid3" style={{marginTop:22}}>
              <article className="card"><span className="pill">ADULT BETA</span><h3>Business English</h3><p>Meetings, presentations, calls, project updates and professional conversations.</p><Link href={signedIn?"/practice?track=business":"/login"}>Explore Business English →</Link></article>
              <article className="card"><span className="pill">ADULT BETA</span><h3>Cambridge-style practice</h3><p>Original speaking and writing practice for adult learners, with a transparent skills rubric. Not official exam scoring.</p><Link href={signedIn?"/practice?track=cambridge-adult":"/login"}>Explore practice →</Link></article>
              <article className="card"><span className="badge">SUPERVISED PILOT ONLY</span><h3>Young learners</h3><p>Short teacher-approved activities are being designed. Unrestricted child-facing AI chat is not enabled in this beta.</p><span className="muted" style={{fontSize:12}}>Launching only after safeguarding review.</span></article>
            </div>
          </div>
        </section>
        <section className="section wrap" id="method">
          <p className="eyebrow">THE TEACHER SARA METHOD</p><h2>Feedback should help you learn, not just sound clever.</h2>
          <div className="grid3" style={{marginTop:22}}>
            <article className="card"><h3>Specific</h3><p>See the exact phrase, a more natural version and why it works.</p></article>
            <article className="card"><h3>Balanced</h3><p>Keep what is already correct. Focus on one or two high-value improvements.</p></article>
            <article className="card"><h3>Measured</h3><p>Try the skill in a fresh context. We do not invent scores or promise fluency.</p></article>
          </div>
        </section>
        <section className="wrap section">
          <div className="note"><strong>Beta notice:</strong> AI features and paid plans will be enabled only after server credentials, data protection settings, pricing and payment testing are verified. No payment is collected on this preview.</div>
        </section>
      </main>
      <footer className="footer"><div className="wrap" style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span>© Teacher Sara AI · A Teacher Sara project</span><span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/login">Account</Link></span></div></footer>
    </>
  );
}