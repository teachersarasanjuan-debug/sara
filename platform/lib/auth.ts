import { createClient } from "@/lib/supabase/server";
export async function getCurrentUser() {
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)return null;
  return {supabase,user:data.user};
}
export function isTeacherEmail(email?:string|null) {
  const allowed=(process.env.TEACHER_EMAILS??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}