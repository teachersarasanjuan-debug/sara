import {NextResponse} from "next/server";
import Stripe from "stripe";
import {getCurrentUser} from "@/lib/auth";
import {getStripe} from "@/lib/stripe";
import {sameOrigin} from "@/lib/security";
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});
 if(!process.env.STRIPE_PRICE_ID_MONTHLY)return NextResponse.json({error:"Paid checkout is not configured. A product and monthly EUR price must be created in Stripe first."},{status:503});
 const base=process.env.NEXT_PUBLIC_APP_URL;if(!base)return NextResponse.json({error:"Application URL is not configured."},{status:503});
 try{
  const {data:profile}=await auth.supabase.from("profiles").select("stripe_customer_id,subscription_status").eq("id",auth.user.id).maybeSingle();\n  if(profile?.subscription_status==="active"||profile?.subscription_status==="trialing")return NextResponse.json({error:"You already have an active membership. Use Manage subscription instead."},{status:409});
  const params:Stripe.Checkout.SessionCreateParams={
   mode:"subscription",line_items:[{price:process.env.STRIPE_PRICE_ID_MONTHLY,quantity:1}],
   client_reference_id:auth.user.id,metadata:{user_id:auth.user.id},
   subscription_data:{metadata:{user_id:auth.user.id}},
   success_url:base+"/studio?checkout=success",cancel_url:base+"/pricing?checkout=cancelled",
   allow_promotion_codes:false
  };
  if(profile?.stripe_customer_id)params.customer=profile.stripe_customer_id;else if(auth.user.email)params.customer_email=auth.user.email;
  const session=await getStripe().checkout.sessions.create(params);
  if(!session.url)throw new Error("Stripe did not return a checkout URL");
  return NextResponse.json({url:session.url},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("Checkout creation failed:",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Could not start checkout. Please contact Teacher Sara."},{status:503});}
}