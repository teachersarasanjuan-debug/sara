"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthActionResult = { error?: string; success?: string };

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  if (formData.get("adult_confirmed") !== "yes") return { error:"The initial beta is only available to adults aged 18+." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 10 || password.length > 128) return { error:"Enter a valid email and a password of at least 10 characters." };

  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: new URL("/auth/callback?next=/dashboard", origin).toString() }
    });
    if (error) return { error:error.message };
    if (!data.session) return { success:"Please check your email and confirm your account before signing in." };
  } catch {
    return { error:"Account registration is not configured yet. Please try again after setup." };
  }
  redirect("/dashboard");
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  if (formData.get("adult_confirmed") !== "yes") return { error:"The initial beta is only available to adults aged 18+." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error:"Sign-in failed. Check your details and try again." };
  } catch {
    return { error:"Sign-in is not configured yet. Please try again after setup." };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
