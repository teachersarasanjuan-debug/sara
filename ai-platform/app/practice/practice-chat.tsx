"use client";

import { useState } from "react";

type Track = "business" | "cambridge-adult";
type Message = { role:"user"|"assistant"; content:string };
type CoachReply = {
  reply:string; correction:string|null; explanation:string; retryPrompt:string;
  nextStep:string; skillLabels:string[]; encouragement:string
};

export function PracticeChat() {
  const [track,setTrack]=useState<Track>("business");
  const [level,setLevel]=useState("B1");
  const [input,setInput]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const [lastFeedback,setLastFeedback]=useState<CoachReply|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function sendMessage(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text=input.trim();
    if(!text||busy) return;
    setError(""); setBusy(true); setInput("");
    const nextMessages=[...messages,{role:"user" as const,content:text}];
    setMessages(nextMessages);
    try {
      const response=await fetch("/api/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({track,level,message:text,history:messages.slice(-8)})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"The learning service could not respond.");
      const coach:CoachReply=data;
      setLastFeedback(coach);
      setMessages([...nextMessages,{role:"assistant",content:coach.reply}]);
    } catch(e) {
      setMessages(messages);
      setInput(text);
      setError(e instanceof Error?e.message:"Something went wrong. Please try again.");
    } finally {setBusy(false);}
  }

  return <section className="panel chat">
    <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div><p className="eyebrow">YOUR PRACTICE SESSION</p><h2 style={{margin:"0 0 8px",fontSize:22}}>{track==="business"?"Business English":"Cambridge-style practice"}</h2></div>
      <span className="pill">ADULT BETA · TEXT</span>
    </div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"12px 0"}}>
      <label style={{fontSize:11,fontWeight:800}}>TRACK <select value={track} onChange={e=>{setTrack(e.target.value as Track);setMessages([]);setLastFeedback(null);}} style={{display:"block",padding:9,border:"1px solid var(--line)",borderRadius:8,marginTop:4}}><option value="business">Business English</option><option value="cambridge-adult">Cambridge-style adult</option></select></label>
      <label style={{fontSize:11,fontWeight:800}}>LEVEL <select value={level} onChange={e=>setLevel(e.target.value)} style={{display:"block",padding:9,border:"1px solid var(--line)",borderRadius:8,marginTop:4}}>{["A2","B1","B2","C1"].map(x=><option key={x}>{x}</option>)}</select></label>
    </div>
    <div className="note" style={{marginBottom:10}}>Goal: {track==="business"?"Give clear, appropriate and confident contributions in workplace situations.":"Develop a clear answer, support it with reasons/examples and use a relevant range of language."}</div>
    <div className="chat-log" aria-live="polite">
      {messages.length===0&&<div className="bubble">Hello! I'm your Teacher Sara AI coach. Tell me what you'd like to practise, or start here: {track==="business"?"Your manager asks for a quick update on a delayed project. What would you say?":"Describe a skill you would like to learn and explain why it matters to you."}</div>}
      {messages.map((m,i)=><div key={i} className={"bubble "+(m.role==="user"?"user":"")}>{m.content}</div>)}
      {busy&&<div className="bubble">Preparing focused feedback…</div>}
      {lastFeedback&&<div className="feedback">
        <strong>{lastFeedback.encouragement}</strong>
        {lastFeedback.correction&&<p><b>Your words:</b> {lastFeedback.correction.split(" ⇢ ")[0]}<br/><b>Try:</b> {lastFeedback.correction.split(" ⇢ ")[1]??lastFeedback.correction}</p>}
        {lastFeedback.explanation&&<p><b>Why:</b> {lastFeedback.explanation}</p>}
        <p><b>Next try:</b> {lastFeedback.retryPrompt}</p>
        <p className="mini"><b>Focus:</b> {lastFeedback.skillLabels.join(" · ")}</p>
      </div>}
    </div>
    <form className="composer" onSubmit={sendMessage}>
      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Write your answer…" maxLength={1200} aria-label="Your English answer" disabled={busy}/>
      <button className="button" type="submit" disabled={busy||!input.trim()} aria-label="Send">↑</button>
    </form>
    {error&&<p className="error" role="alert">{error}</p>}
    <p className="mini" style={{marginBottom:0}}>Your messages are processed to produce a reply and are not stored as a transcript by this application.</p>
  </section>;
}