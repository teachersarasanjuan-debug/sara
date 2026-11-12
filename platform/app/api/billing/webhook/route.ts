import {NextResponse} from "next/server";
import Stripe from "stripe";
import {getStripe} from "@/lib/stripe";
import {createAdminClient} from "@/lib/supabase/admin";
export const runtime="nodejs";
export async function POST(request:Request){
 const signature=request.headers.get("stripe-signature"),secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!signature||!secret)return NextResponse.json({error:"Webhook is not configured."},{status:400});
 let event:Stripe.Event;
 try{event=getStripe().webhooks.constructEvent(await request.text(),signature,secret);}catch{return NextResponse.json({error:"Invalid webhook signature."},{status:400});}
 const db=createAdminClient();
 try{
  if(event.type==="checkout.session.completed"){
   const session=event.data.object as Stripe.Checkout.Session;
   const uid=session.metadata?.user_id??session.client_reference_id;
   const customer=typeof session.customer==="string"?session.customer:session.customer?.id;
   if(uid&&customer){const result=await db.from("profiles").update({stripe_customer_id:customer}).eq("id",uid);if(result.error)throw result.error;}
   if(uid&&session.subscription){
    const subResponse=await getStripe().subscriptions.retrieve(String(session.subscription));
    const sub=subResponse;
    const status=sub.status;
    const result=await db.from("profiles").update({stripe_customer_id:customer,stripe_subscription_id:sub.id,subscription_status:status,plan:status==="active"||status==="trialing"?"pro":"free",current_period_end:new Date((sub.items.data[0]?.current_period_end??Math.floor(Date.now()/1000))*1000).toISOString()}).eq("id",uid);
    if(result.error)throw result.error;
   }
  }
  if(event.type==="customer.subscription.updated"||event.type==="customer.subscription.deleted"){
   const sub=event.data.object as Stripe.Subscription;
   const uid=sub.metadata?.user_id;
   const customer=typeof sub.customer==="string"?sub.customer:sub.customer.id;
   if(uid){const result=await db.from("profiles").update({stripe_customer_id:customer,stripe_subscription_id:sub.id,subscription_status:sub.status,plan:sub.status==="active"||sub.status==="trialing"?"pro":"free",current_period_end:new Date((sub.items.data[0]?.current_period_end??Math.floor(Date.now()/1000))*1000).toISOString()}).eq("id",uid);if(result.error)throw result.error;}
  }
  if(event.type==="invoice.payment_failed"){
   const invoice=event.data.object as Stripe.Invoice;
   const customer=typeof invoice.customer==="string"?invoice.customer:invoice.customer?.id;
   if(customer){const result=await db.from("profiles").update({subscription_status:"past_due",plan:"free"}).eq("stripe_customer_id",customer);if(result.error)throw result.error;}
  }
  return NextResponse.json({received:true});
 }catch(error){console.error("Stripe webhook processing failed:",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Webhook processing failed."},{status:500});}
}