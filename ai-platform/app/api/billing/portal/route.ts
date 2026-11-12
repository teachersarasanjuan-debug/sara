import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data:{user} }=await supabase.auth.getUser();
  if (!user) return Response.json({error:"Please sign in."},{status:401});

  const secret=process.env.STRIPE_SECRET_KEY;
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL;
  if(!secret||!siteUrl) return Response.json({error:"Billing is not configured yet."},{status:503});

  const {data:subscription}=await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id",user.id).maybeSingle();
  if(!subscription?.stripe_customer_id) return Response.json({error:"No billing customer is linked to this account."},{status:404});

  try {
    const stripe=new Stripe(secret);
    const portal=await stripe.billingPortal.sessions.create({
      customer:subscription.stripe_customer_id,
      return_url:new URL("/billing",siteUrl).toString()
    });
    return Response.json({url:portal.url},{headers:{"Cache-Control":"no-store"}});
  } catch {
    return Response.json({error:"The billing portal is temporarily unavailable."},{status:502});
  }
}