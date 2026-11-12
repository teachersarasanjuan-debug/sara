import { withSupabase } from "npm:@supabase/server@1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

async function stripeRequest(path: string, method = "GET", params?: URLSearchParams) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("stripe_not_configured");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${key}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params?.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("Stripe API error", response.status, JSON.stringify(data).slice(0, 500));
    throw new Error("stripe_request_failed");
  }
  return data;
}

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "https://teachersara.es,https://www.teachersara.es")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!originAllowed(req)) return json({ error: "origin_not_allowed" }, 403);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const action = String(body?.action ?? "");
    const userId = ctx.userClaims?.sub;
    const userEmail = ctx.userClaims?.email;
    if (!userId) return json({ error: "unauthorized" }, 401);

    if (action === "status") {
      const [{ data: subscription }, { data: usage }] = await Promise.all([
        ctx.supabase.from("subscriptions").select("status,plan_key,current_period_end,cancel_at_period_end")
          .eq("user_id", userId).order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
        ctx.supabaseAdmin.from("ai_usage_monthly").select("request_count")
          .eq("user_id", userId).eq("month_start", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10)).maybeSingle(),
      ]);
      const active = !!subscription && ["active", "trialing"].includes(subscription.status) &&
        (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now());
      const limit = Number(Deno.env.get(active ? "AI_PAID_MONTHLY_REQUEST_LIMIT" : "AI_FREE_MONTHLY_REQUEST_LIMIT") ?? (active ? "500" : "10"));
      return json({
        authenticated: true,
        email: userEmail ?? null,
        subscription: subscription ?? null,
        paid: active,
        usage: { used: usage?.request_count ?? 0, limit },
        checkoutConfigured: !!Deno.env.get("STRIPE_PRICE_INDIVIDUAL_MONTHLY") && !!Deno.env.get("STRIPE_SECRET_KEY"),
      });
    }

    if (action === "plans") {
      const priceId = Deno.env.get("STRIPE_PRICE_INDIVIDUAL_MONTHLY");
      if (!priceId || !Deno.env.get("STRIPE_SECRET_KEY")) return json({ configured: false, plans: [] });
      const price = await stripeRequest(`prices/${encodeURIComponent(priceId)}?expand[]=product`);
      const product = typeof price.product === "object" ? price.product : null;
      return json({
        configured: true,
        plans: [{
          key: "individual",
          name: product?.name ?? "Teacher Sara AI Plus",
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval ?? "month",
          intervalCount: price.recurring?.interval_count ?? 1,
        }],
      });
    }

    if (action === "checkout") {
      const priceId = Deno.env.get("STRIPE_PRICE_INDIVIDUAL_MONTHLY");
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!priceId || !stripeKey) return json({ error: "billing_not_configured", message: "Paid plans are not available yet. No payment can be taken until the plan is configured." }, 503);

      const { data: activeSub } = await ctx.supabase.from("subscriptions").select("stripe_subscription_id,status")
        .eq("user_id", userId).in("status", ["active", "trialing", "past_due"]).limit(1).maybeSingle();
      if (activeSub) return json({ error: "already_subscribed", message: "You already have a subscription. Use Manage billing instead." }, 409);

      let { data: customer } = await ctx.supabaseAdmin.from("billing_customers")
        .select("stripe_customer_id").eq("user_id", userId).maybeSingle();
      if (!customer?.stripe_customer_id) {
        const params = new URLSearchParams();
        if (userEmail) params.set("email", userEmail);
        params.set("metadata[app_user_id]", userId);
        const created = await stripeRequest("customers", "POST", params);
        const { data: saved, error } = await ctx.supabaseAdmin.from("billing_customers")
          .upsert({ user_id: userId, stripe_customer_id: created.id, updated_at: new Date().toISOString() })
          .select("stripe_customer_id").single();
        if (error) return json({ error: "customer_save_failed" }, 500);
        customer = saved;
      }

      const publicUrl = (Deno.env.get("APP_PUBLIC_URL") ?? "https://teachersara.es").replace(/\/$/, "");
      const params = new URLSearchParams();
      params.set("mode", "subscription");
      params.set("customer", customer.stripe_customer_id);
      params.set("line_items[0][price]", priceId);
      params.set("line_items[0][quantity]", "1");
      params.set("success_url", `${publicUrl}/ai/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
      params.set("cancel_url", `${publicUrl}/ai/?checkout=cancel`);
      params.set("client_reference_id", userId);
      params.set("metadata[app_user_id]", userId);
      params.set("subscription_data[metadata][app_user_id]", userId);
      params.set("allow_promotion_codes", "true");
      const session = await stripeRequest("checkout/sessions", "POST", params);
      return json({ checkoutUrl: session.url });
    }

    if (action === "portal") {
      const { data: customer } = await ctx.supabaseAdmin.from("billing_customers")
        .select("stripe_customer_id").eq("user_id", userId).maybeSingle();
      if (!customer?.stripe_customer_id) return json({ error: "billing_customer_not_found" }, 404);
      const publicUrl = (Deno.env.get("APP_PUBLIC_URL") ?? "https://teachersara.es").replace(/\/$/, "");
      const params = new URLSearchParams();
      params.set("customer", customer.stripe_customer_id);
      params.set("return_url", `${publicUrl}/ai/`);
      const session = await stripeRequest("billing_portal/sessions", "POST", params);
      return json({ portalUrl: session.url });
    }

    return json({ error: "unknown_action" }, 400);
  }),
};
