import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {getStripe} from "@/lib/stripe";
import {sameOrigin} from "@/lib/security";
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Request origin rejected."},{status:403});
 const auth=await getCurrentUser();if(!auth)return NextResponse.json({error:"Please sign in first."},{status:401});
 const base=process.env.NEXT_PUBLIC_APP_URL;if(!base)return NextResponse.json({error:"Application URL is not configured."},{status:503});
 const {data:profile}=await auth.supabase.from("profiles").select("stripe_customer_id").eq("id",auth.user.id).maybeSingle();
 if(!profile?.stripe_customer_id)return NextResponse.json({error:"No billing account is linked yet."},{status:404});
 try{const portal=await getStripe().billingPortal.sessions.create({customer:profile.stripe_customer_id,return_url:base+"/studio"});return NextResponse.json({url:portal.url},{headers:{"Cache-Control":"no-store"}});}
 catch(error){console.error("Billing portal failed:",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Could not open subscription management."},{status:503});}
}