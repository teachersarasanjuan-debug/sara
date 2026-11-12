import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <main className="wrap">
    <div className="form-wrap card">
      <p className="eyebrow">YOUR LEARNING SPACE</p>
      <h1>Welcome back</h1>
      <p className="muted">Create an account or sign in to continue. The first online beta is intended for adults aged 18+.</p>
      <LoginForm/>
      <p className="mini" style={{marginTop:20}}>By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy information</Link>.</p>
      <p className="mini"><Link href="/">← Back to Teacher Sara AI</Link></p>
    </div>
  </main>;
}