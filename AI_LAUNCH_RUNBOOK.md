# Teacher Sara AI — launch runbook

Last reviewed: 12 November 2026

## Release architecture

The intended first beta is the existing static learning studio at `/ai/`, served by the Teacher Sara website. Supabase hosts the authenticated database and server-side Edge Functions. The browser contains only the Supabase publishable key; OpenAI and Stripe secret keys stay in Supabase Edge Function secrets.

Supabase project:
- Project ref: `zyvjemwhrvkdpnckigfx`
- Region: `eu-west-1`
- Functions already deployed: `tutor`, `billing`, `stripe-webhook`, `realtime-token`
- Database tables and row-level security have been provisioned.
- Security advisor currently reports no security lints.

Do not deploy the experimental `ai-platform/` Next.js app as the production app yet. Its initial database assumptions differ from the already provisioned Supabase schema. The static `/ai/` app is the current release path and already calls the deployed Edge Functions.

## Required server secrets

Open the [Teacher Sara AI Supabase Edge Function secrets page](https://supabase.com/dashboard/project/zyvjemwhrvkdpnckigfx/functions/secrets).

Add secrets there; never put them in `ai/config.js`, the website, GitHub, or a chat message.

### OpenAI — required for live AI text

Create an API key in the OpenAI API dashboard, then add:

```env
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_MODEL=gpt-6.1-terra
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini
```

The selected text and voice model IDs are listed in the current OpenAI API model catalogue. API usage is billed separately from a ChatGPT subscription.

### Stripe — test mode only until checkout has passed end-to-end tests

Use the Teacher Sara Stripe sandbox account. Add:

```env
STRIPE_SECRET_KEY=<Stripe test-mode secret key>
STRIPE_WEBHOOK_SECRET=<Stripe test webhook signing secret>
STRIPE_PRICE_INDIVIDUAL_MONTHLY=<Stripe recurring EUR test price ID>
```

Create the Stripe test webhook endpoint:

`https://zyvjemwhrvkdpnckigfx.supabase.co/functions/v1/stripe-webhook`

Subscribe it to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`. Do not use a live key or live webhook secret during testing.

### Application controls

Add or confirm these values:

```env
APP_PUBLIC_URL=https://teachersara.es
APP_ALLOWED_ORIGINS=https://teachersara.es,https://www.teachersara.es
AI_FREE_MONTHLY_REQUEST_LIMIT=10
AI_PAID_MONTHLY_REQUEST_LIMIT=500
AI_VOICE_MONTHLY_SESSION_LIMIT=12
ENABLE_REALTIME_VOICE=false
ENABLE_CHILD_MODE=false
```

Supabase supplies its own project URL and internal keys to Edge Functions. Do not manually add the publishable key as a secret.

## Supabase Auth settings

In Authentication > URL Configuration:
- Site URL: `https://teachersara.es`
- Add `https://teachersara.es/ai/` to the allowed redirect URLs.
- Keep email confirmation enabled for the beta.

## First beta boundaries

- Adult accounts only (18+ self-declaration).
- Live child chat stays disabled. The young-learner tile is a scripted demonstration only.
- Text AI uses input and output moderation and does not store raw chat transcripts.
- The learning record stores session metadata and brief skill evidence, not the original learner message.
- Voice remains disabled until the voice session cost limit, privacy wording, and end-to-end disconnect behaviour have been tested.
- AI feedback is practice guidance, not an official Cambridge grade or CEFR certification.

## Test checklist before public release

1. Create an adult test account and confirm its email.
2. Sign in at `https://teachersara.es/ai/`.
3. Test Cambridge-style adult practice at A2, B1, B2 and C1.
4. Test Business English at B1, B2 and C1.
5. Check that feedback separates what worked, one useful correction, an explanation, a retry and a next step.
6. Check that a safety refusal does not consume a monthly AI credit.
7. Check that an AI/network failure refunds the reserved credit.
8. Confirm that a learning session and skill evidence are saved without storing raw chat text.
9. Confirm one account cannot read another account's learner records.
10. In Stripe test mode, complete checkout using a Stripe test card, then verify that the webhook activates the subscription.
11. Test failed payment, cancellation, renewal, duplicate webhook delivery and the Customer Portal.
12. Confirm the free allowance and paid allowance are enforced server-side.
13. Test on mobile and desktop, including a microphone-denied browser.
14. Complete privacy, consumer terms, VAT/invoicing and safeguarding review before public sale.

## Commercial settings still to decide

- Monthly EUR price for the individual plan.
- Whether the displayed price includes VAT and how invoices are issued.
- Final free allowance and paid allowance after real AI cost testing.
- Refund, cancellation and consumer withdrawal wording.
- Whether a future family/parent plan is needed. It must not activate child AI until the safeguarding and parental-consent work is complete.

## Important security rule

Never send an OpenAI API key, Stripe secret key, webhook signing secret, or Supabase secret key through chat, email, GitHub issues, or source code. Add each value directly in the appropriate provider dashboard and rotate it immediately if it is exposed.
