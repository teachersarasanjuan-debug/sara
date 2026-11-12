"use client";
import {useState} from "react";
export default function LearningNotesConsent({initialEnabled}:{initialEnabled:boolean}){
 const[enabled,setEnabled]=useState(initialEnabled),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function toggle(){
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/profile/preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shareLearningNotes:!enabled})});
   const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not update the preference.");
   setEnabled(data.shareLearningNotes);
   setMessage(data.shareLearningNotes?"Sara can now see your short, general English-skill notes.":"Sharing is off. Previously shared learning notes have been deleted.");
  }catch(e){setError(e instanceof Error?e.message:"Could not update your preference.");}
  finally{setBusy(false);}
 }
 return <section className="card" style={{marginTop:18}}>
  <p className="eyebrow">YOUR PRIVACY CHOICE</p>
  <h3>Share learning notes with Sara</h3>
  <p className="small">Optional and off by default. When enabled, Teacher Sara can see short, general notes about English skills to help guide future lessons. Your exact answers, chat transcripts and voice recordings are not shared or stored by this feature. Turning this off deletes your existing shared notes.</p>
  <div className="row" style={{marginTop:12}}>
   <button className={enabled?"btn secondary":"btn"} type="button" onClick={toggle} disabled={busy}>{busy?"Saving…":enabled?"Turn off and delete notes":"Allow short skill notes"}</button>
   <span className="pill">{enabled?"ON":"OFF"}</span>
  </div>
  {message&&<p className="success">{message}</p>}{error&&<p className="error">{error}</p>}
 </section>;
}