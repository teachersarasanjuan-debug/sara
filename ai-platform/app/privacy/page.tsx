import Link from "next/link";

export default function PrivacyPage() {
 return <main className="wrap"><header className="top"><Link className="brand" href="/"><span className="brand-mark">TS</span><span>Teacher Sara<small>PRIVACY</small></span></Link></header><section className="section">
 <p className="eyebrow">PRIVACY INFORMATION · DRAFT</p><h1>Privacy by design</h1>
 <div className="note">This is a technical draft, not a complete GDPR privacy notice. The data controller identity, legal bases, retention periods, processor agreements, international transfer safeguards and contact details must be reviewed and completed before public launch.</div>
 <h2 style={{marginTop:24,fontSize:20}}>What the first beta is designed to process</h2>
 <ul className="list"><li>Account email and authentication data to secure sign-in.</li><li>Messages submitted during a practice session, sent to the AI provider to generate a reply.</li><li>Coarse usage counters and session metadata for usage limits and learning history.</li><li>Stripe customer and subscription identifiers to manage paid access.</li></ul>
 <h2 style={{fontSize:20}}>What the first beta is designed not to retain</h2>
 <ul className="list"><li>Raw chat transcripts and voice recordings.</li><li>Exact dates of birth, home addresses or school names.</li><li>Pronunciation scores from text-only sessions.</li></ul>
 <h2 style={{fontSize:20}}>Children</h2><p className="muted">Open child-facing AI chat is disabled. It must not be enabled until a lawful parent/guardian consent flow, age-appropriate design, safeguarding rules, data minimisation, retention/deletion and human escalation have been reviewed.</p>
 <h2 style={{fontSize:20}}>Your rights</h2><p className="muted">The final notice must explain how to access, correct, export and delete personal data, how long it is kept, and how to contact the controller and supervisory authority.</p>
 <p><Link href="/">← Back</Link></p></section></main>;
}