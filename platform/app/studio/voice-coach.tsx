"use client";
import {useEffect,useRef,useState} from "react";

type Track="cambridge"|"business";
type TranscriptLine={speaker:"You"|"Teacher Sara AI";text:string};
export default function VoiceCoach({canUse}:{canUse:boolean}){
 const [track,setTrack]=useState<Track>("cambridge");
 const [level,setLevel]=useState("B1");
 const [state,setState]=useState<"idle"|"connecting"|"live"|"error">("idle");
 const [message,setMessage]=useState("");
 const [transcript,setTranscript]=useState<TranscriptLine[]>([]);
 const [partial,setPartial]=useState({learner:"",coach:""});
 const pcRef=useRef<RTCPeerConnection|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const audioRef=useRef<HTMLAudioElement|null>(null);
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 function releaseMedia(){
  if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
  pcRef.current?.getSenders().forEach(sender=>sender.track?.stop());
  pcRef.current?.close();pcRef.current=null;
  streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
  if(audioRef.current){audioRef.current.pause();audioRef.current.srcObject=null;audioRef.current=null;}
 }
 useEffect(()=>()=>{releaseMedia();},[]);
 function stop(){
  releaseMedia();setState("idle");
  setMessage("Voice session ended. Your microphone has been switched off.");
 }
 async function start(){
  if(!canUse){setMessage("Voice practice is available with an active paid membership.");return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){setState("error");setMessage("This browser does not support secure microphone access. Use an up-to-date browser over HTTPS.");return;}
  setState("connecting");setMessage("Requesting microphone permission…");setTranscript([]);setPartial({learner:"",coach:""});
  let pc:RTCPeerConnection|null=null;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   streamRef.current=stream;
   pc=new RTCPeerConnection();pcRef.current=pc;
   const audio=new Audio();audio.autoplay=true;audioRef.current=audio;
   pc.ontrack=event=>{audio.srcObject=event.streams[0];audio.play().catch(()=>setMessage("Voice connected. Tap the page once if you cannot hear the coach."));};
   stream.getTracks().forEach(track=>pc?.addTrack(track,stream));
   const channel=pc.createDataChannel("oai-events");
   channel.addEventListener("open",()=>{
    setState("live");setMessage("Connected. Speak naturally. The in-app session will end after 10 minutes.");
    timerRef.current=setTimeout(()=>{releaseMedia();setState("idle");setMessage("Your 10-minute voice session has ended. You can start another session when ready.");},10*60*1000);
   });
   channel.addEventListener("message",event=>{
    try{
     const item=JSON.parse(event.data) as {type?:string;transcript?:string;delta?:string;error?:{message?:string}};
     if(item.type==="error"){setMessage(item.error?.message??"The voice service reported an error.");return;}
     if(item.type==="conversation.item.input_audio_transcription.completed"&&typeof item.transcript==="string"){
      setTranscript(old=>[...old,{speaker:"You",text:item.transcript!.trim()}]);
      setPartial(old=>({...old,learner:""}));
     }
     if(item.type==="response.output_audio_transcript.delta"&&typeof item.delta==="string"){
      setPartial(old=>({...old,coach:old.coach+item.delta}));
     }
     if(item.type==="response.output_audio_transcript.done"&&typeof item.transcript==="string"){
      setTranscript(old=>[...old,{speaker:"Teacher Sara AI",text:item.transcript!.trim()}]);
      setPartial(old=>({...old,coach:""}));
     }
    }catch{}
   });
   pc.onconnectionstatechange=()=>{
    if(pc?.connectionState==="failed"||pc?.connectionState==="disconnected"){releaseMedia();setState("error");setMessage("The connection was interrupted. Please start another session.");}
   };
   setMessage("Creating a secure voice connection through Teacher Sara's server…");
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   const response=await fetch("/api/voice/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({track,level,sdp:offer.sdp??""})});
   const answer=await response.text();
   if(!response.ok){let reason="Voice connection was rejected. Please try again.";try{const parsed=JSON.parse(answer) as {error?:string};if(parsed.error)reason=parsed.error;}catch{}throw new Error(reason);}
   await pc.setRemoteDescription({type:"answer",sdp:answer});
   setMessage("Connecting your microphone and speaker…");
  }catch(error){
   pc?.close();pcRef.current=null;
   streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;
   setState("error");setMessage(error instanceof Error?error.message:"Voice practice could not start.");
  }
 }
 return <section className="panel" style={{marginTop:18}}>
  <div className="row space"><div><p className="eyebrow">SPEAKING PRACTICE</p><h2>Talk with your English coach</h2><p className="small">Live spoken conversation using your microphone and speakers.</p></div><span className="pill">VOICE BETA</span></div>
  <div className="row" style={{margin:"14px 0"}}>
   <label className="small">Practice <select value={track} onChange={e=>setTrack(e.target.value as Track)} disabled={state==="live"||state==="connecting"} style={{marginLeft:8,padding:8,borderRadius:8,border:"1px solid #dfe9e2"}}><option value="cambridge">Cambridge-style speaking</option><option value="business">Business English role-play</option></select></label>
   <label className="small">Level <select value={level} onChange={e=>setLevel(e.target.value)} disabled={state==="live"||state==="connecting"} style={{marginLeft:8,padding:8,borderRadius:8,border:"1px solid #dfe9e2"}}><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label>
  </div>
  <div className="notice">{state==="live"?"Your coach is listening. Take your time and speak in complete thoughts.":state==="connecting"?"Setting up a secure audio connection.":canUse?"Paid allowance: up to 10 voice session starts per month, with a 10-minute in-app session limit. Audio streams through OpenAI; this app does not save recordings.":"Voice practice requires an active paid membership."}</div>
  <div className="row" style={{marginTop:14}}>
   {state==="live"||state==="connecting"?<button className="btn" onClick={stop}>End session</button>:<button className="btn" onClick={start} disabled={!canUse}>Start voice practice</button>}
   {state==="connecting"&&<span className="small">Connecting…</span>}{state==="live"&&<span className="success">● Microphone connected</span>}
  </div>
  {message&&<p className={state==="error"?"error":"small"} style={{marginTop:10}}>{message}</p>}
  <div style={{marginTop:16,border:"1px solid #dfe9e2",borderRadius:12,padding:12,background:"#f8fbf8"}}>
   <div className="row space"><strong style={{fontSize:12}}>Live session transcript</strong><span className="small">Not saved</span></div>
   <p className="small">The transcript is an approximate guide and may differ from what the AI understood. It disappears when you leave this page.</p>
   <div aria-live="polite" style={{display:"grid",gap:9,maxHeight:220,overflowY:"auto"}}>
    {transcript.length===0&&!partial.learner&&!partial.coach&&<p className="small">Your spoken words and the coach's replies will appear here during a voice session.</p>}
    {transcript.map((line,index)=><div key={index} style={{background:line.speaker==="You"?"#eaf0f8":"#edf5f0",borderRadius:9,padding:10,fontSize:12}}><strong>{line.speaker}</strong><div>{line.text}</div></div>)}
    {partial.learner&&<div className="small"><strong>You (transcribing):</strong> {partial.learner}</div>}
    {partial.coach&&<div className="small"><strong>Teacher Sara AI (speaking):</strong> {partial.coach}</div>}
   </div>
  </div>
  <p className="small" style={{marginTop:12}}>Use headphones where possible. Do not speak personal, health, financial or confidential information. Microphone permission is required. The 10-minute timer is an in-app limit, not a server-side forced disconnect.</p>
 </section>;
}