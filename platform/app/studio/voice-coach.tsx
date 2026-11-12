"use client";
import {useEffect,useRef,useState} from "react";

type Track="cambridge"|"business";
export default function VoiceCoach({canUse}:{canUse:boolean}){
 const [track,setTrack]=useState<Track>("cambridge");
 const [level,setLevel]=useState("B1");
 const [state,setState]=useState<"idle"|"connecting"|"live"|"error">("idle");
 const [message,setMessage]=useState("");
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
  releaseMedia();
  setState("idle");
  setMessage("Voice session ended. Your microphone has been switched off.");
 }
 async function start(){
  if(!canUse){setMessage("Voice practice is available with an active paid membership.");return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){setState("error");setMessage("This browser does not support secure microphone access. Use an up-to-date browser over HTTPS.");return;}
  setState("connecting");setMessage("Requesting microphone permission…");
  let pc:RTCPeerConnection|null=null;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   streamRef.current=stream;
   setMessage("Creating your private voice session…");
   const tokenResponse=await fetch("/api/voice/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({track,level})});
   const tokenData=await tokenResponse.json();
   if(!tokenResponse.ok)throw new Error(tokenData.error??"Could not start voice practice.");
   const ephemeralKey=tokenData.value??tokenData.client_secret?.value;
   if(typeof ephemeralKey!=="string")throw new Error("The voice service did not return a temporary session credential.");
   pc=new RTCPeerConnection();pcRef.current=pc;
   const audio=new Audio();audio.autoplay=true;audioRef.current=audio;
   pc.ontrack=event=>{audio.srcObject=event.streams[0];audio.play().catch(()=>setMessage("Voice connected. Tap the page once if you cannot hear the coach."));};
   stream.getTracks().forEach(track=>pc?.addTrack(track,stream));
   const channel=pc.createDataChannel("oai-events");
   channel.addEventListener("open",()=>{
    setState("live");setMessage("Connected. Speak naturally. This session ends automatically after 10 minutes.");
    timerRef.current=setTimeout(()=>{releaseMedia();setState("idle");setMessage("Your 10-minute voice session has ended. You can start another session when ready.");},10*60*1000);
   });
   channel.addEventListener("message",event=>{
    try{const item=JSON.parse(event.data) as {type?:string;error?:{message?:string}};if(item.type==="error")setMessage(item.error?.message??"The voice service reported an error.");}
    catch{}
   });
   pc.onconnectionstatechange=()=>{
    if(pc?.connectionState==="failed"||pc?.connectionState==="disconnected"){setState("error");setMessage("The connection was interrupted. End the session and try again.");}
   };
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   const sdpResponse=await fetch("https://api.openai.com/v1/realtime/calls",{
    method:"POST",body:offer.sdp??"",
    headers:{"Authorization":"Bearer "+ephemeralKey,"Content-Type":"application/sdp"}
   });
   const answerText=await sdpResponse.text();
   if(!sdpResponse.ok)throw new Error("Voice connection was rejected. Please try again.");
   await pc.setRemoteDescription({type:"answer",sdp:answerText});
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
  <div className="notice">{state==="live"?"Your coach is listening. Take your time and speak in complete thoughts.":state==="connecting"?"Setting up a secure audio connection.":canUse?"Paid allowance: up to 40 voice sessions per month, with a 10-minute in-app session limit. Audio streams to OpenAI; this app does not save recordings.":"Voice practice requires an active paid membership."}</div>
  <div className="row" style={{marginTop:14}}>
   {state==="live"||state==="connecting"?<button className="btn" onClick={stop}>End session</button>:<button className="btn" onClick={start} disabled={!canUse}>Start voice practice</button>}
   {state==="connecting"&&<span className="small">Connecting…</span>}
   {state==="live"&&<span className="success">● Microphone connected</span>}
  </div>
  {message&&<p className={state==="error"?"error":"small"} style={{marginTop:10}}>{message}</p>}
  <p className="small" style={{marginTop:12}}>Use headphones where possible. Do not speak personal, health, financial or confidential information. Browser microphone permission is required.</p>
 </section>;
}