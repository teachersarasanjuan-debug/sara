"use client";
import {useState} from "react";
import type {FormEvent} from "react";
type Track="cambridge"|"business";
type ScenarioOption={value:string;label:string;objective:string};
const CAMBRIDGE_SCENARIOS:ScenarioOption[]=[
 {value:"personal-response",label:"Personal response",objective:"Give a developed answer with a reason and a real example."},
 {value:"picture-comparison",label:"Compare two situations",objective:"Compare two described scenes, speculate and explain a preference."},
 {value:"discussion",label:"Discussion and opinion",objective:"State a view, support it and respond to another point of view."}
];
const BUSINESS_SCENARIOS:ScenarioOption[]=[
 {value:"project-update",label:"Project update",objective:"Explain status, a risk, the impact and the next action."},
 {value:"meeting-opinion",label:"Meeting contribution",objective:"Agree or disagree diplomatically and justify your view."},
 {value:"presentation-questions",label:"Presentation Q&A",objective:"Answer a follow-up question clearly and support your point."},
 {value:"client-call",label:"Client call",objective:"Clarify a request, confirm details and summarise the next step."}
];
type Message={role:"coach"|"learner";text:string;correction?:{original:string;improved:string;why:string};retryPrompt?:string;skillNote?:string};
export default function Coach(){
 const[track,setTrack]=useState<Track>("cambridge");
 const[scenario,setScenario]=useState("personal-response");
 const[level,setLevel]=useState("B1");
 const[messages,setMessages]=useState<Message[]>([]);
 const[input,setInput]=useState("");
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");
 const options=track==="business"?BUSINESS_SCENARIOS:CAMBRIDGE_SCENARIOS;
 const selected=options.find(item=>item.value===scenario)??options[0];
 async function send(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const text=input.trim();if(!text||busy)return;setInput("");setError("");
  const history=messages.slice(-8).map(m=>({role:m.role==="coach"?"assistant" as const:"user" as const,content:m.text}));
  setMessages(old=>[...old,{role:"learner",text}]);setBusy(true);
  try{
   const res=await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({track,scenario,level,message:text,history})});
   const data=await res.json();if(!res.ok)throw new Error(data.error??"The coach could not respond.");
   setMessages(old=>[...old,{role:"coach",text:data.reply,correction:data.correction,retryPrompt:data.retryPrompt,skillNote:data.skillNote}]);
  }catch(err){setError(err instanceof Error?err.message:"Could not connect. Please try again.");}
  finally{setBusy(false);}
 }
 function reset(){setMessages([]);setError("");}
 return <section className="panel">
  <div className="row space"><div><p className="eyebrow">AI PRACTICE COACH</p><h2>Let's practise English</h2><p className="small">A guided task, one focused improvement, a short explanation and a chance to retry.</p></div><span className="pill">ADULT BETA</span></div>
  <div className="row" style={{margin:"16px 0"}}>
   <label className="small">Learning path <select value={track} onChange={e=>{const next=e.target.value as Track;setTrack(next);setScenario(next==="business"?"project-update":"personal-response");reset();}} style={{marginLeft:8,padding:8,borderRadius:8,border:"1px solid #dfe9e2"}}><option value="cambridge">Cambridge-style practice</option><option value="business">Business English</option></select></label>
   <label className="small">Lesson scenario <select value={scenario} onChange={e=>{setScenario(e.target.value);reset();}} style={{marginLeft:8,padding:8,borderRadius:8,border:"1px solid #dfe9e2"}}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
   <label className="small">Level <select value={level} onChange={e=>{setLevel(e.target.value);reset();}} style={{marginLeft:8,padding:8,borderRadius:8,border:"1px solid #dfe9e2"}}><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label>
   <button className="btn secondary" type="button" onClick={reset}>New practice</button>
  </div>
  <div className="notice"><strong>Today's objective:</strong> {selected.objective}</div>
  <div className="chat" aria-live="polite" style={{marginTop:12}}>
   {messages.length===0&&<div className="notice"><strong>Your coach is ready.</strong><p className="small">Send a short answer to begin the selected task. The coach will respond with a focused teaching prompt.</p></div>}
   {messages.map((m,i)=><div key={i} className={"bubble "+(m.role==="learner"?"user":"coach")}><strong>{m.role==="learner"?"YOU":"TEACHER SARA AI"}</strong><div>{m.text}</div>{m.correction&&(m.correction.original||m.correction.improved)&&<div className="feedback"><strong>One useful improvement</strong>{m.correction.original&&<div>Original: {m.correction.original}</div>}{m.correction.improved&&<div>Try: {m.correction.improved}</div>}{m.correction.why&&<div>Why: {m.correction.why}</div>}</div>}{m.retryPrompt&&<div className="feedback"><strong>Try again</strong><div>{m.retryPrompt}</div></div>}{m.skillNote&&<p className="small">{m.skillNote}</p>}</div>)}
   {busy&&<div className="bubble coach">Thinking about your answer…</div>}
  </div>
  <form className="composer" onSubmit={send}><input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} maxLength={1600} placeholder="Write your answer in English…" disabled={busy}/><button className="btn" disabled={busy||!input.trim()}>Send</button></form>
  {error&&<p className="error">{error}</p>}<p className="small">AI feedback may be imperfect. Ask Sara to review anything important. Do not enter confidential information.</p>
 </section>;
}