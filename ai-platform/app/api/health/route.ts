export async function GET() {
  const env = {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    aiGatewayModel: Boolean(process.env.AI_GATEWAY_MODEL),
    aiGatewayAuth: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET)
  };
  return Response.json({status:"ok",features:env,childrenEnabled:process.env.CHILD_AI_ENABLED==="true"},{
    headers:{"Cache-Control":"no-store"}
  });
}