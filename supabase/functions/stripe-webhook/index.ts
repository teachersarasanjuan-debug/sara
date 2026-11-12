import { withSupabase } from "npm:@supabase/server@1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new TextEncoder().encode(`${timestamp}.${rawBody}`);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));
  const expected = toHex(digest);
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}

async function stripeGetSubscription(id: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("stripe_not_configured");
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error("stripe_subscription_fetch_failed");
  return data;
}

async function findUserId(admin: any, subscription: any): Promise<string | null> {
  const metadataUserId = subscription?.metadata?.app_user_id;
  if (typeof metadataUserId === "string" && metadataUserId.length > 0) return metadataUserId;
  const customerId = typeof subscription?.customer === "string" ? subscription.customer : subscription?.customer?.id;
  if (!customerId) return null;
  const { data } = await admin.from("billing_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.user_id ?? null;
}

async function syncSubscription(admin: any, subscription: any) {
  const userId = await findUserId(admin, subscription);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!userId || !customerId || !subscription.id) throw new Error("subscription_missing_customer_or_user");

  await admin.from("billing_customers").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });

  const firstPrice = subscription.items?.data?.[0]?.price;
  const row = {
    owner_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: firstPrice?.id ?? null,
    plan_key: "individual_monthly",
    status: subscription.status,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end === true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "owner_id" });
  if (error) throw new Error("subscription_sync_failed");
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const signature = req.headers.get("stripe-signature");
    if (!secret || !signature) return json({ error: "webhook_not_configured" }, 503);

    const rawBody = await req.text();
    const valid = await verifySignature(rawBody, signature, secret);
    if (!valid) return json({ error: "invalid_signature" }, 400);

    let event: any;
    try { event = JSON.parse(rawBody); } catch { return json({ error: "invalid_event" }, 400); }
    if (!event?.id || !event?.type) return json({ error: "invalid_event" }, 400);

    const admin = ctx.supabaseAdmin;
    const { data: prior } = await admin.from("stripe_webhook_events").select("event_id")
      .eq("event_id", event.id).maybeSingle();
    if (prior) return json({ received: true, duplicate: true });

    const object = event.data?.object;
    switch (event.type) {
      case "checkout.session.completed": {
        if (object?.mode === "subscription" && object?.subscription) {
          const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
          const userId = object.metadata?.app_user_id ?? object.client_reference_id;
          if (customerId && userId) {
            const { error } = await admin.from("billing_customers").upsert({
              user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString(),
            });
            if (error) throw new Error("customer_sync_failed");
          }
          const subscription = await stripeGetSubscription(object.subscription);
          await syncSubscription(admin, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(admin, object);
        break;
      case "invoice.payment_failed": {
        const customerId = typeof object?.customer === "string" ? object.customer : object?.customer?.id;
        const subscriptionId = typeof object?.subscription === "string" ? object.subscription : object?.subscription?.id;
        if (subscriptionId) {
          const { error } = await admin.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);
          if (error) throw new Error("failed_payment_update_failed");
        } else if (customerId) {
          const { error } = await admin.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId).in("status", ["active", "trialing"]);
          if (error) throw new Error("failed_payment_update_failed");
        }
        break;
      }
      default:
        break;
    }

    const { error: eventError } = await admin.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
    });
    if (eventError && eventError.code !== "23505") throw new Error("webhook_event_record_failed");
    return json({ received: true });
  }),
};
