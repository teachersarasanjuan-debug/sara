import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request:Request) {
  const secret=process.env.STRIPE_SECRET_KEY;
  const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret||!webhookSecret) return new Response("Webhook is not configured.",{status:503});
  const stripe=new Stripe(secret);
  const signature=request.headers.get("stripe-signature");
  if(!signature) return new Response("Missing signature.",{status:400});

  let event:Stripe.Event;
  try {
    const rawBody=await request.text();
    event=stripe.webhooks.constructEvent(rawBody,signature,webhookSecret);
  } catch {
    return new Response("Invalid webhook signature.",{status:400});
  }

  const admin=createAdminClient();
  const {error:seenError}=await admin.from("stripe_webhook_events").insert({
    event_id:event.id,event_type:event.type
  });
  if(seenError) {
    const {data:existing}=await admin.from("stripe_webhook_events").select("event_id").eq("event_id",event.id).maybeSingle();
    if(existing?.event_id) return new Response("Already processed.",{status:200});
    return new Response("Could not record event.",{status:500});
  }

  try {
    if(event.type.startsWith("customer.subscription.")) {
      const sub=event.data.object as Stripe.Subscription;
      const userId=sub.metadata?.userId;
      const customerId=typeof sub.customer==="string"?sub.customer:sub.customer.id;
      const priceId=sub.items.data[0]?.price.id??null;
      if(!userId) throw new Error("Subscription metadata is missing userId.");
      const currentPeriodEnd = "current_period_end" in sub && typeof sub.current_period_end==="number"
        ? new Date(sub.current_period_end*1000).toISOString() : null;
      const {error}=await admin.from("subscriptions").upsert({
        user_id:userId,stripe_customer_id:customerId,stripe_subscription_id:sub.id,
        status:sub.status,price_id:priceId,current_period_end:currentPeriodEnd,
        cancel_at_period_end:sub.cancel_at_period_end
      },{onConflict:"user_id"});
      if(error) throw error;
    } else if(event.type==="checkout.session.completed") {
      const session=event.data.object as Stripe.Checkout.Session;
      if(session.mode==="subscription" && typeof session.subscription==="string" && session.metadata?.userId) {
        const sub=await stripe.subscriptions.retrieve(session.subscription);
        const customerId=typeof sub.customer==="string"?sub.customer:sub.customer.id;
        const priceId=sub.items.data[0]?.price.id??null;
        const currentPeriodEnd = "current_period_end" in sub && typeof sub.current_period_end==="number"
          ? new Date(sub.current_period_end*1000).toISOString() : null;
        const {error}=await admin.from("subscriptions").upsert({
          user_id:session.metadata.userId,stripe_customer_id:customerId,
          stripe_subscription_id:sub.id,status:sub.status,price_id:priceId,
          current_period_end:currentPeriodEnd,cancel_at_period_end:sub.cancel_at_period_end
        },{onConflict:"user_id"});
        if(error) throw error;
      }
    }
    await admin.from("stripe_webhook_events").update({processed_at:new Date().toISOString()}).eq("event_id",event.id);
    return new Response("OK",{status:200});
  } catch(error) {
    await admin.from("stripe_webhook_events").delete().eq("event_id",event.id);
    console.error("Stripe webhook processing failed",error instanceof Error?error.message:"UnknownError");
    return new Response("Webhook processing failed.",{status:500});
  }
}