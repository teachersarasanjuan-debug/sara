# Teacher Sara AI — full-stack application

This is a separate Next.js application in `ai-platform/`. The existing Teacher Sara static website is not replaced.

## Status

- Responsive Next.js application.
- Supabase email/password authentication structure.
- Server-side AI teaching endpoint through Vercel AI Gateway.
- Structured teacher feedback validated with Zod.
- Daily quota enforcement through an atomic Postgres function.
- Stripe subscription Checkout, customer portal and signed webhook handlers.
- Database migration with row-level security.
- Text sessions only; raw chat transcripts and audio recordings are not stored by this app.
- Child-facing unrestricted AI is deliberately disabled.

**It is not yet deployed or ready to take real payments.** It needs a Supabase project and migration, Vercel project/deployment, secure secrets, AI model selection, Stripe product/price, webhook setup, email/auth configuration, privacy/terms review and end-to-end tests.

## Stack

Pinned dependencies: Next.js 16.4.6, React 19.3.1, Supabase JS 2.119.0, Supabase SSR 0.12.7, AI SDK 7.0.170, Vercel Gateway provider 4.0.143, Stripe Node SDK 23.1.0, Zod 4.6.7. Node 22+.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in Supabase URL and publishable key.
3. Fill in the server-only Supabase secret key.
4. Set `AI_GATEWAY_MODEL` to a currently supported model chosen after review of price, availability and data processing. Local use needs `AI_GATEWAY_API_KEY`; Vercel can authenticate with OIDC when configured.
5. Configure Stripe **test-mode** secret, webhook signing secret and a recurring EUR price ID.
6. Set `NEXT_PUBLIC_SITE_URL` to local or deployed origin.
7. Run `npm install`, `npm run typecheck`, `npm run build`.

Never commit `.env.local`. Never place secrets in browser variables or GitHub.

## Supabase

Create a dedicated project in an EU region. Apply `supabase/migrations/202611120001_teacher_sara_ai_core.sql`. Verify RLS is enabled and test that one user cannot read another user's sessions, usage or subscription. Configure Auth email confirmation and allowed redirect URLs for the deployed origin.

Tables:
- `learning_sessions`: minimal learning metadata only, never raw chat content.
- `subscriptions`: read-only to subscriber; writes happen via server-side Stripe webhook.
- `usage_daily`: per-user/day counters with atomic quota checks.
- `stripe_webhook_events`: no public policies.

## Vercel

Deploy as a separate Vercel project linked to `teachersarasanjuan-debug/sara` with Root Directory `ai-platform`. Do not modify the existing Teacher Sara website project. Configure environment variables for Preview first. Keep secrets in Vercel environment variables only.

Vercel AI Gateway supports OIDC for Vercel deployments. For local use, use an AI Gateway API key. Configure AI Gateway spend limits/alerts before letting customers use the AI.

## Stripe

Start in the connected Teacher Sara **sandbox/test** account.

1. Agree subscription plan names, EUR prices, billing interval, included usage, VAT display, trial/cancellation/refund terms.
2. Create a recurring EUR price in test mode and set `STRIPE_PRICE_ID`.
3. Add webhook endpoint `/api/billing/webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Store signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Test successful checkout, payment failure, cancellation, renewal, duplicate delivery and account ownership before switching to live mode.

The code does not create a Stripe product/price or activate live payments by itself. The connected Stripe account is currently a sandbox account, not a live account.

## AI and teaching safety

- API accepts only `business` and `cambridge-adult` tracks.
- Initial login is adult-only and asks users to confirm they are 18+. This is a declaration, not robust age verification.
- Do not enable child chat until parent/guardian consent, age-appropriate design, safeguarding escalation, lawful basis, retention/deletion and processor arrangements are reviewed.
- AI gives practice feedback, not official Cambridge grades, pronunciation ratings or CEFR certification.
- Learner messages are processed transiently for generation and not stored as transcripts by this app.
- Add safety moderation, abuse handling, human support and provider data-processing review before public rollout.

## Remaining work before launch

- Confirm Vercel team access and create a separate linked Vercel project.
- Create Supabase project and apply/verify migration.
- Configure auth email, callback URLs, Vercel Gateway model and budget.
- Agree subscription pricing, create test price and configure webhook.
- Add voice sessions using short-lived credentials, explicit opt-in and no default recording retention.
- Build parent/guardian flow and child pilot only after compliance/safeguarding review.
- Complete security, RLS, accessibility, billing, load and teaching-quality tests.
- Obtain professional review of Spanish/EU privacy notice, consumer terms, VAT/invoicing and digital subscription rules.
