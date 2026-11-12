import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request:NextRequest) {
  let response=NextResponse.next({request});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return response;
  const supabase=createServerClient(url,key,{cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
  }});
  const {data:{user}}=await supabase.auth.getUser();
  if((request.nextUrl.pathname.startsWith("/studio")||request.nextUrl.pathname.startsWith("/teacher"))&&!user){
    const login=new URL("/login",request.url);login.searchParams.set("next",request.nextUrl.pathname);return NextResponse.redirect(login);
  }
  return response;
}
export const config={matcher:["/studio/:path*","/teacher/:path*"]};