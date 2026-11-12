"use client";
import {useState} from "react";
export default function BillingButtons({active}:{active:boolean}){
 const[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function go(path:string){setBusy(true);setError("");try{const res=await fetch(path,{method:"POST"});const data=await res.json();if(!res.ok)throw new Error(data.error??"Billing is not configured.");if(data.url)window.location.href=data.url;else throw new Error("No checkout link returned.");}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}finally{setBusy(false);}}
 return <div style={{marginTop:10,display:"grid",gap:7}}><button className="btn" disabled={busy} onClick={()=>go(active?"/api/billing/portal":"/api/billing/checkout")}>{busy?"Opening…":active?"Manage subscription":"View paid membership"}</button>{error&&<span className="error">{error}</span>}</div>;
}