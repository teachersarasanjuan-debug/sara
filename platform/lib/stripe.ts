import Stripe from "stripe";
let client:Stripe|null=null;
export function getStripe() {
  if(!process.env.STRIPE_SECRET_KEY) throw new Error("Billing is not configured.");
  if(!client) client=new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}