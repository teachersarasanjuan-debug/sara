# Teacher Sara AI — secure MVP implementation

**Status:** development branch only. The public website and main branch have not been changed. The UI includes a scripted sample lesson; secure account, tutor, voice and billing integrations are implemented in code but are **not connected to a running Supabase project yet**.

## What is built in this branch

- Responsive learning studio with three distinct tracks: young learner sample, Cambridge/school English and Business English.
- Scripted demo lesson that works without account credentials.
- Supabase email/password account flow (requires project configuration).
- Authenticated text tutor endpoint using OpenAI Responses API.
- Moderation before generation, request validation, monthly user quotas and credit restoration after provider failures.
- Adult paid-user voice endpoint using short-lived OpenAI Realtime client secrets and browser WebRTC.
- Voice usage quota (default 12 sessions/month) and automatic 8-minute session end.
- Stripe-hosted Checkout, subscription status, customer billing portal and signature-verified webhook synchronisation.
- Postgres migrations for parent-owned learner profiles, private billing tables, subscription state, usage limits, voice quotas and RLS.
- No chat transcripts or voice recordings are stored in the app database.
- **Real AI voice, live billing and real student accounts remain disabled until credentials, project, price and launch checks are completed.**
- Live AI for children is deliberately disabled. The young-learner card is a scripted sample only.

## Architecture

- Static front end: existing GitHub Pages site at `teachersara.es`.
- Authentication/database: Supabase Auth + Postgres + RLS.
- Backend: Supabase Edge Functions in `supabase/functions/`.
- Text AI: OpenAI Responses API from the server.
- Voice AI: OpenAI Realtime API using a short-lived client secret created server-side. The permanent OpenAI API key never reaches the browser.
- Payments: Stripe Billing in test mode initially, hosted Checkout and Customer Portal.
- No Vercel project is required for this architecture.

## Required setup before the product can be used

### 1. Create and configure Supabase

Create a Supabase project in an EU region (recommended for this Spain/EU launch). Record:
- Project URL
- Publishable key (safe to use in a browser)
- Project reference

Do not share secret/service-role keys in chat or add them to GitHub.

In Supabase Auth settings:
- Set the Site URL to `https://teachersara.es`.
- Add `https://teachersara.es/ai/` and `https://www.teachersara.es/ai/` to allowed redirect URLs.
- Enable email confirmation for new accounts.
- Configure a suitable password policy and rate limits.

### 2. Apply the database migrations in order

Apply every file under `supabase/migrations/` in chronological filename order:
1. `202611120001_teacher_sara_ai.sql`
2. `202611120002_voice_quota.sql`
3. `202611120003_refund_failed_ai_requests.sql`

Then verify:
- all tables exist;
- RLS is enabled on all exposed tables;
- no anonymous access exists to billing, usage or webhook tables;
- `consume_ai_credit`, `consume_voice_credit` and `refund_ai_credit` are executable by service_role only.

### 3. Deploy Edge Functions

Deploy:
- `tutor`
- `billing`
- `stripe-webhook`
- `realtime-token`

Use the `supabase/config.toml` function settings. The authenticated functions use `withSupabase({ auth: "user" })`; the Stripe webhook verifies Stripe's own signature.

### 4. Configure server-side secrets

Set these in Supabase **Edge Functions → Secrets** (or a secure CLI environment), never in source code:

| Secret | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI server key |
| `OPENAI_MODEL` | Approved Responses API model |
| `OPENAI_REALTIME_MODEL` | Realtime model (default example: `gpt-realtime`) |
| `STRIPE_SECRET_KEY` | Stripe **test-mode** secret key for initial testing |
| `STRIPE_WEBHOOK_SECRET` | Secret from the Stripe test-mode webhook endpoint |
| `STRIPE_PRICE_INDIVIDUAL_MONTHLY` | Test-mode monthly Price ID, created only after price is approved |
| `APP_PUBLIC_URL` | `https://teachersara.es` |
| `APP_ALLOWED_ORIGINS` | `https://teachersara.es,https://www.teachersara.es` |
| `AI_FREE_MONTHLY_REQUEST_LIMIT` | Default `10` text turns/month |
| `AI_PAID_MONTHLY_REQUEST_LIMIT` | Default `500` text turns/month |
| `AI_VOICE_MONTHLY_SESSION_LIMIT` | Default `12` paid voice sessions/month |
| `ENABLE_REALTIME_VOICE` | Keep `false` until provider costs and tests are reviewed |
| `ENABLE_CHILD_MODE` | Keep `false`; child AI is not implemented for production |

The request and voice limits are conservative starting defaults, not tested commercial quotas. Measure real API costs before increasing them.

### 5. Configure the public browser settings

Set `ai/config.js` to the Supabase Project URL and **publishable key only**:

```js
window.TEACHER_SARA_AI_CONFIG = Object.freeze({
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabasePublishableKey: "sb_publishable_...",
  configured: true
});
```

Never put OpenAI keys, Stripe secret keys or Supabase secret keys in this file.

### 6. Configure Stripe test mode

The connected Stripe account at the time this branch was created is a **sandbox/test account**. No product, price or payment has been created by this code.

Before testing Checkout:
1. Agree the monthly customer price and what is included.
2. In Stripe test mode, create the product and recurring monthly EUR price.
3. Put the resulting Price ID in `STRIPE_PRICE_INDIVIDUAL_MONTHLY`.
4. Configure the Customer Portal (subscription cancellation, payment-method updates and invoice history).
5. Add a test webhook endpoint pointing to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`.
6. Subscribe it to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
7. Put its signing secret into `STRIPE_WEBHOOK_SECRET`.

Never switch to Stripe live mode or sell subscriptions until test payments, webhook fulfilment, cancellation and access removal have been verified and the user has explicitly approved the launch price.

### 7. Deploy the static preview

This work lives on `feature/teacher-sara-ai-first-prototype` and draft PR #6. The live website remains unchanged. Review the PR and publish the `/ai/` page only after backend configuration and testing. It is not a live service while the config remains blank.

## Important product and safety limits

- **Children:** the young learner experience is a scripted sample. Do not enable live child AI until the guardian account/consent flow, age-appropriate moderation, safe topic boundaries, teacher review, deletion process, data protection impact assessment and applicable Spanish/EU legal checks have been completed. Current schema includes a parent-owned learner profile structure but no production child chat.
- **Voice:** browser microphone is requested only after the user presses Start. The app does not persist audio files. Voice data is still processed by OpenAI; update privacy notices and review provider data-control settings before activation.
- **Cambridge:** exercises must be original and skill-aligned; do not copy Cambridge exam papers or imply official scoring/certification.
- **Progress:** current MVP records aggregate request/session usage only. It does not yet include validated progress analytics or an operational teacher dashboard. Those need a later iteration and careful assessment design.
- **Pricing and taxes:** customer price, VAT treatment, subscription terms, refunds, withdrawal rights and cancellation wording must be reviewed for the business's Spain/EU obligations before public sale.
- **No overclaim:** the app does not promise CEFR level gains or certified exam outcomes. Product performance must be evaluated in a pilot.

## Test checklist before paid pilot

- Sign-up, confirmation email, sign-in, sign-out and password reset.
- A user cannot see another user's profiles or subscription.
- Anonymous requests cannot invoke tutor, billing or realtime functions.
- Free tier stops exactly at its monthly quota; provider errors return the reserved credit.
- Moderation fails closed when provider moderation is unavailable.
- Stripe test Checkout creates a subscription; webhook is signature-verified and idempotent.
- Failed payment changes status to past_due and paid AI access stops.
- Customer Portal cancellation updates entitlement and access ends when subscription period ends.
- Voice is paid-only, quota-limited, time-limited and microphone tracks close on sign-out, error and stop.
- Child mode remains blocked in every server route.
- Mobile layout, keyboard navigation, browser microphone permissions and audio fallback are tested.
