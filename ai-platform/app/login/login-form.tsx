"use client";

import { useState } from "react";
import { signIn, signUp } from "@/app/auth/actions";

export function LoginForm() {
  const [mode,setMode] = useState<"signin"|"signup">("signin");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true); setMessage("");
    const result = mode === "signin" ? await signIn(formData) : await signUp(formData);
    if (result?.error) setMessage(result.error);
    if (result?.success) setMessage(result.success);
    setBusy(false);
  }

  return <>
    <div style={{display:"flex",gap:8,margin:"20px 0"}}>
      <button className={mode==="signin"?"button":"button secondary"} type="button" onClick={()=>setMode("signin")}>Sign in</button>
      <button className={mode==="signup"?"button":"button secondary"} type="button" onClick={()=>setMode("signup")}>Create account</button>
    </div>
    <form action={submit}>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254}/></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={10} autoComplete={mode==="signin"?"current-password":"new-password"} required/></div>
      <label style={{display:"flex",gap:9,alignItems:"flex-start",fontSize:11,color:"var(--muted)",margin:"14px 0"}}>
        <input type="checkbox" name="adult_confirmed" value="yes" required/>
        I confirm that I am 18 or older and I am using this adult beta for myself.
      </label>
      <button className="button" disabled={busy} type="submit" style={{width:"100%"}}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button>
    </form>
    {message && <p className={message.toLowerCase().includes("check")?"success":"error"} role="status">{message}</p>}
  </>;
}