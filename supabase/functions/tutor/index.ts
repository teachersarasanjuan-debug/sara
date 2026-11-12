import { withSupabase } from "npm:@supabase/server@1";


const corsHeaders = (req: Request): HeadersInit => {
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

const monthStartUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
};

function extractOutputText(data: any): string {
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

const instructions = (track: string, level: string) => {
  const common = `You are Teacher Sara AI, a careful English practice coach guided by an experienced British English teacher. You are an AI, not Sara and not a human teacher.

Teaching method:
- Keep the conversation purposeful, warm, respectful and concise.
- Work at the stated learner level (${level}); do not claim to certify a CEFR level from a short chat.
- Ask one useful question at a time. Let the learner do most of the speaking/writing.
- Give no more than ONE high-value correction per turn unless the learner explicitly asks for a full review.
- When correcting, quote the learner's exact wording, provide a natural improved version, explain the reason in plain English, then ask them to try again in a fresh sentence.
- Praise specifically what worked; avoid empty repeated praise, exaggerated claims or long lectures.
- Distinguish grammar, vocabulary, clarity, fluency and task completion. Do not invent pronunciation assessments from text.
- Never give a numerical score or claim exam results from a short sample.
- If you are uncertain about intended meaning, ask a clarifying question instead of guessing.
- Use original learning exercises. Do not reproduce copyrighted Cambridge exam papers or claim to provide official Cambridge scoring.
- Never ask for a child's full name, address, school, contact details or other identifying information.
- Do not request or store voice recordings. The current tutor accepts text only.
- Respond in English unless the learner asks for a short Spanish explanation.`;

  const trackGuidance: Record<string, string> = {
    cambridge: `Track: Cambridge and school English. Use original practice inspired by the relevant skill and level, not real copyrighted exam questions. Develop complete answers, reasoning, examples, vocabulary range, grammatical control and task fulfilment. Give transparent rubric-style comments but never claim official Cambridge marks.`,
    business: `Track: Business English. Role-play realistic professional situations such as project updates, meetings, presentations, calls, email wording and supplier/customer conversations. Correct register, clarity, diplomacy and action-focused communication. Do not provide legal, HR, financial or regulated professional advice.`,
    general: `Track: General English. Practise everyday communication, grammar, vocabulary, reading or writing. Keep tasks practical and level-appropriate.`,
  };
  return common + "\n\n" + (trackGuidance[track] ?? trackGuidance.general) +
    "\n\nFeedback format when a correction is useful:\nYour response: ...\nOne useful improvement: ...\nTry: ...\nWhy: ...\nNow try this: ...";
};

const authenticatedHandler = withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

    const userId = ctx.userClaims?.sub;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const track = String(body?.track ?? "general");
    const level = String(body?.level ?? "B1");
    if (!["general", "cambridge", "business", "young"].includes(track)) {
      return json({ error: "invalid_track" }, 400);
    }
    if (track === "young") {
      if (Deno.env.get("ENABLE_CHILD_MODE") !== "true") {
        return json({ error: "child_mode_not_enabled", message: "Learner accounts for children are not enabled yet. Please use an adult account for this pilot." }, 403);
      }
      return json({ error: "child_mode_requires_guardian_flow", message: "Child mode requires the parent/guardian learner-profile flow and safeguarding review before it can be enabled." }, 403);
    }
    if (!["A2", "B1", "B2", "C1", "C2"].includes(level)) return json({ error: "invalid_level" }, 400);

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length < 1 || messages.length > 10) return json({ error: "invalid_message_count" }, 400);
    let safeMessages: { role: string; content: string }[];
    try {
      safeMessages = messages.map((m: any) => {
        if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string") {
          throw new Error("invalid_message");
        }
        if (m.content.length > 2500 || m.content.trim().length === 0) throw new Error("invalid_message_length");
        return { role: m.role, content: m.content.trim() };
      });
    } catch {
      return json({ error: "invalid_message", message: "One of the messages is invalid or too long." }, 400);
    }
    const lastUser = [...safeMessages].reverse().find((m: any) => m.role === "user");
    if (!lastUser) return json({ error: "missing_user_message" }, 400);

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_MODEL");
    if (!openAiKey || !model) return json({ error: "ai_not_configured", message: "The AI tutor is not connected yet. The sample lesson is still available." }, 503);

    // Moderate learner input before generating a response. If moderation is unavailable, fail closed.
    const modRes = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: lastUser.content }),
    });
    if (!modRes.ok) return json({ error: "safety_check_unavailable", message: "The safety check is temporarily unavailable. Please try again shortly." }, 503);
    const moderation = await modRes.json();
    if (moderation?.results?.[0]?.flagged === true) {
      return json({ error: "message_needs_review", message: "Let's keep our practice safe and respectful. Please try a different example." }, 422);
    }

    const { data: subscription, error: subscriptionError } = await ctx.supabase
      .from("subscriptions")
      .select("status,current_period_end,plan_key")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) return json({ error: "subscription_check_failed" }, 500);

    const paid = !!subscription && ["active", "trialing"].includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now());
    const freeLimit = Number(Deno.env.get("AI_FREE_MONTHLY_REQUEST_LIMIT") ?? "10");
    const paidLimit = Number(Deno.env.get("AI_PAID_MONTHLY_REQUEST_LIMIT") ?? "500");
    const limit = paid ? paidLimit : freeLimit;

    const { data: allowed, error: quotaError } = await ctx.supabaseAdmin.rpc("consume_ai_credit", {
      p_user_id: userId,
      p_month_start: monthStartUtc(),
      p_monthly_limit: limit,
    });
    if (quotaError) return json({ error: "usage_check_failed" }, 500);
    if (allowed !== true) {
      return json({ error: "monthly_limit_reached", message: "You've used this month's practice allowance. You can upgrade your plan to continue.", upgrade_required: true }, 402);
    }

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: instructions(track, level),
        input: safeMessages,
        max_output_tokens: 450,
        store: false,
      }),
    });
    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error("OpenAI response failed", aiRes.status, detail.slice(0, 500));
      await ctx.supabaseAdmin.rpc("refund_ai_credit", { p_user_id: userId, p_month_start: monthStartUtc() });
      return json({ error: "ai_request_failed", message: "I couldn't complete that response. Your practice credit has been returned. Please try again." }, 502);
    }
    const result = await aiRes.json();
    const reply = extractOutputText(result);
    if (!reply) {
      await ctx.supabaseAdmin.rpc("refund_ai_credit", { p_user_id: userId, p_month_start: monthStartUtc() });
      return json({ error: "empty_ai_response", message: "I didn't receive a useful response. Your practice credit has been returned. Please try again." }, 502);
    }

    // No prompts, transcripts or audio are stored. Only the aggregate monthly request count is kept.
    return json({
      reply,
      quota: { monthlyLimit: limit, paid, monthStart: monthStartUtc() },
      model,
    });
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