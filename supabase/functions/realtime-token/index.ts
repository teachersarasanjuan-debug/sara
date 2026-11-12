import { withSupabase } from "npm:@supabase/server@1";


const corsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  const allowed = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "https://teachersara.es,https://www.teachersara.es")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return {
    ...(origin && allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

function monthStartUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

async function safetyIdentifier(userId: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("teacher-sara-ai:" + userId)));
  return Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function voiceInstructions(track: string, level: string) {
  const base = `You are Teacher Sara AI, a British English practice coach guided by an experienced teacher. You are an AI, not Sara or a human teacher. Keep the interaction warm, natural and concise. Work at ${level}. Ask one question at a time and give the learner plenty of speaking time. Give no more than one high-value correction at a time. Explain useful corrections in simple English and invite the learner to retry. Never claim to certify CEFR level or provide official Cambridge marks. Do not request personal information. This session is for an adult learner; if a child says they are using it, ask them to stop and involve their parent or teacher. Do not request or retain identifying information or voice recordings.`;
  const detail: Record<string, string> = {
    cambridge: "Practise original speaking tasks suitable for Cambridge-style preparation. Focus on developing an answer with reasons and examples, clear organisation, vocabulary and grammatical control. Do not reproduce official exam questions.",
    business: "Role-play professional situations such as meetings, project updates, presentations and calls. Coach clarity, register, diplomacy and action-focused communication. Do not provide legal, HR or financial advice.",
    general: "Practise everyday English conversation, vocabulary and grammar using realistic situations.",
  };
  return base + " " + (detail[track] ?? detail.general);
}

const authenticatedHandler = withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const userId = ctx.userClaims?.sub;
    if (!userId) return json({ error: "unauthorized" }, 401);

    if (Deno.env.get("ENABLE_REALTIME_VOICE") !== "true") {
      return json({ error: "voice_not_enabled", message: "Voice practice is not enabled for launch yet." }, 403);
    }
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) return json({ error: "ai_not_configured" }, 503);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const track = String(body?.track ?? "general");
    const level = String(body?.level ?? "B1");
    if (!["general", "cambridge", "business"].includes(track)) {
      return json({ error: "invalid_track" }, 400);
    }
    if (!["A2", "B1", "B2", "C1", "C2"].includes(level)) return json({ error: "invalid_level" }, 400);

    const { data: subscription, error: subError } = await ctx.supabase
      .from("subscriptions").select("status,current_period_end")
      .eq("user_id", userId).in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false }).limit(1).maybeSingle();
    if (subError) return json({ error: "subscription_check_failed" }, 500);
    const paid = !!subscription && ["active", "trialing"].includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now());
    if (!paid) return json({ error: "paid_plan_required", message: "Live voice practice is included with a paid Teacher Sara AI plan." }, 402);

    const limit = Number(Deno.env.get("AI_VOICE_MONTHLY_SESSION_LIMIT") ?? "12");
    const { data: allowed, error: quotaError } = await ctx.supabaseAdmin.rpc("consume_voice_credit", {
      p_user_id: userId, p_month_start: monthStartUtc(), p_monthly_limit: limit,
    });
    if (quotaError) return json({ error: "voice_usage_check_failed" }, 500);
    if (allowed !== true) return json({ error: "voice_monthly_limit_reached", message: "You've used this month's voice-session allowance." }, 402);

    const model = Deno.env.get("OPENAI_REALTIME_MODEL") ?? "gpt-realtime-2.1-mini";
    let createResponse: Response;
    try {
      createResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": await safetyIdentifier(userId),
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 60 },
        session: {
          type: "realtime",
          model,
          instructions: voiceInstructions(track, level),
          max_output_tokens: 250,
          audio: {
            input: {
              noise_reduction: { type: "near_field" },
              transcription: { model: "gpt-4o-mini-transcribe" },
              turn_detection: { type: "server_vad" },
            },
            output: { voice: "marin" },
          },
          tracing: null,
        },
      }),
      });
    } catch (error) {
      console.error("Realtime client secret network failure", String(error).slice(0, 300));
      await ctx.supabaseAdmin.rpc("refund_voice_credit", { p_user_id: userId, p_month_start: monthStartUtc() });
      return json({ error: "voice_session_creation_failed", message: "A voice session could not be started. Your session credit has been returned." }, 502);
    }
    if (!createResponse.ok) {
      const details = await createResponse.text();
      console.error("Realtime client secret creation failed", createResponse.status, details.slice(0, 500));
      await ctx.supabaseAdmin.rpc("refund_voice_credit", { p_user_id: userId, p_month_start: monthStartUtc() });
      return json({ error: "voice_session_creation_failed", message: "A voice session could not be started. Your session credit has been returned." }, 502);
    }
    const result = await createResponse.json();
    if (!result?.value) {
      await ctx.supabaseAdmin.rpc("refund_voice_credit", { p_user_id: userId, p_month_start: monthStartUtc() });
      return json({ error: "voice_token_missing" }, 502);
    }

    // The client secret is short-lived, but started sessions can outlive it. Voice remains disabled by default until server-side session-cost controls are verified.
    return json({ value: result.value, expiresAt: result.expires_at, model, maxSessionSeconds: 480 });
  });

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders(req) });
    }
    const response = await authenticatedHandler(req);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(req))) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};