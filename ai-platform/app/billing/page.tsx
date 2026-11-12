"use client";

import Link from "next/link";
import { useState } from "react";

export default function BillingPage() {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function go(path:string) {
    setBusy(true);setError("");
    try {
      const res=await fetch(path,{method:"POST"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"This billing action is unavailable.");
      window.location.assign(data.url);
    } catch(e) {setError(e instanceof Error?e.message:"Unable to open billing.");}
    finally {setBusy(false);}
  }
  return <main className="wrap">
    <header className="top"><Link className="brand" href="/dashboard"><span className="brand-mark">TS</span><span>Teacher Sara<small>MEMBERSHIP</small></span></Link><Link href="/dashboard" className="button secondary">Dashboard</Link></header>
    <section className="section">
      <p className="eyebrow">MEMBERSHIP</p><h1>Choose how you learn</h1>
      <p className="section-lead">The beta has a limited free daily allowance. Paid plans will be enabled only after Teacher Sara confirms the price, usage, renewal, cancellation and tax details.</p>
      <div className="grid3" style={{marginTop:25}}>
        <article className="card"><span className="pill">STARTER</span><h2>Free</h2><p>Try the teaching experience with a small daily allowance.</p><strong>5 AI replies per day</strong></article>
        <article className="card"><span className="pill">PLANNED</span><h2>Learning</h2><p>For regular independent English practice.</p><strong>Up to 60 AI replies per day</strong><p className="mini">Price to be confirmed. Limits may change after cost testing.</p><button className="button" onClick={()=>go("/api/billing/checkout")} disabled={busy}>Subscribe when available</button></article>
        <article className="card"><span className="pill">PLANNED</span><h2>Teacher + AI</h2><p>AI practice combined with human teacher feedback.</p><strong>Proposed future plan</strong><p className="mini">Availability and price must be agreed with Sara.</p></article>
      </div>
      <div style={{marginTop:22,display:"flex",gap:12,flexWrap:"wrap"}}><button className="button secondary" onClick={()=>go("/api/billing/portal")} disabled={busy}>Manage existing subscription</button><Link className="button secondary" href="/privacy">Privacy information</Link></div>
      {error&&<p className="error" role="alert">{error}</p>}
      <p className="mini" style={{marginTop:20}}>No payment is taken until an active EUR subscription price and Stripe test/live configuration have been set.</p>
    </section>
  </main>;
}