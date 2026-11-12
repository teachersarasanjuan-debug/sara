import Link from "next/link";

export default function TermsPage() {
 return <main className="wrap"><header className="top"><Link className="brand" href="/"><span className="brand-mark">TS</span><span>Teacher Sara<small>TERMS</small></span></Link></header><section className="section">
 <p className="eyebrow">SERVICE TERMS · DRAFT</p><h1>Using Teacher Sara AI</h1>
 <div className="note">These draft terms are not ready for a commercial launch. They require review for Spanish consumer law, digital subscriptions, VAT, refunds, cancellation, accessibility and the legal identity of the provider.</div>
 <h2 style={{fontSize:20,marginTop:24}}>Learning support, not certification</h2><p className="muted">AI feedback is for practice and learning support. It is not an official exam result, professional qualification, legal advice or a guarantee of language improvement.</p>
 <h2 style={{fontSize:20}}>Responsible use</h2><p className="muted">The initial self-serve beta is for adults aged 18 or older. Do not share personal, confidential, medical or workplace-sensitive information. Do not use the service to impersonate, harass or harm others.</p>
 <h2 style={{fontSize:20}}>Subscriptions</h2><p className="muted">No subscription will be offered until pricing, renewal, cancellation, tax and refund terms are confirmed and displayed before checkout.</p>
 <p><Link href="/">← Back</Link></p></section></main>;
}