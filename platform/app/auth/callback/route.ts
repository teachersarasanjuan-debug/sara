import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function GET(request:Request){
 const {searchParams,origin}=new URL(request.url);const code=searchParams.get("code");const requested=searchParams.get("next")??"/studio";const next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/studio";
 if(code){const supabase=await createClient();const{error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,origin));}
 return NextResponse.redirect(new URL("/login?error=link",origin));
}