import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request:Request) {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return Response.json({error:"Please sign in before subscribing."},{status:401});

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !priceId || !siteUrl) {
    return Response.json({error:"Subscriptions are not open yet. Pricing and payment setup are being finalised."},{status:503});
  }

  try {
    const stripe = new Stripe(secret);
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.type !== "recurring" || price.currency !== "eur") {
      return Response.json({error:"The configured subscription price is not an active recurring EUR price."},{status:503});
    }
    const {data:existing}=await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id",user.id).maybeSingle();
    const session=await stripe.checkout.sessions.create({
      mode:"subscription",
      line_items:[{price:priceId,quantity:1}],
      success_url:new URL("/dashboard?billing=success",siteUrl).toString(),
      cancel_url:new URL("/billing?billing=cancelled",siteUrl).toString(),
      client_reference_id:user.id,
      customer:existing?.stripe_customer_id??undefined,
      customer_email:existing?.stripe_customer_id?undefined:user.email??undefined,
      metadata:{userId:user.id},
      subscription_data:{metadata:{userId:user.id}},
      allow_promotion_codes:false
    });
    if (!session.url) return Response.json({error:"Stripe did not return a checkout link."},{status:502});
    return Response.json({url:session.url},{headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({error:"Secure checkout could not be created. Please try again later."},{status:502});
  }
}