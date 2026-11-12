# Teacher Sara AI — connected MVP

**Status (12 November 2026):** A dedicated EU Supabase project has been created; the database schema and four Edge Functions are deployed. The existing public website is unchanged. This work remains on the development branch and draft PR #6 until reviewed and approved.

## What exists now

- Responsive AI Learning Studio at `/ai/` with Cambridge/school English, Business English and a scripted young-learner sample.
- A working sample lesson that demonstrates the teaching flow without sending learner text anywhere.
- Supabase email/password authentication wired to the project using the public publishable key.
- Server-side OpenAI text-tutor Edge Function with moderation, input limits, monthly quotas and credit restoration if the provider request fails.
- Stripe-hosted subscription Checkout, subscription status, customer portal and signature-verified webhook code.
- Realtime voice-token function using short-lived credentials. **Voice is disabled by default** until cost and privacy checks are complete.
- Parent-owned learner-profile data structure. **Live child AI is disabled**; there are no child chat accounts in this pilot.
- The sign-up age check is a self-declaration checkbox, not robust age verification. Treat the pilot as invite-only for known adults; never permit a child to use an adult account.
- Row-level security on all 10 public tables, explicit grants, service-role-only usage/billing tables, and atomic quota RPCs.
- No lesson transcript or voice recording is written to the Teacher Sara database. Text is sent to OpenAI to generate the tutor response; usage counters are stored.

## Live backend

- Supabase project: `teacher-sara-ai`
- Project reference: `zyvjemwhrvkdpnckigfx`
- Region: `eu-west-1`
- Project URL: `https://zyvjemwhrvkdpnckigfx.supabase.co`
- Project creation quote: `$0/month` at the time of setup. This does not include OpenAI API usage, Stripe processing fees, email delivery, tax, or other optional services.
- Deployed Edge Functions: `tutor`, `billing`, `stripe-webhook`, `realtime-token`.

The browser configuration in `ai/config.js` contains only the Supabase project URL and public publishable key. Do not place secret keys in that file or any other public file.

## Database migrations

The active migration files correspond to the remote Supabase migration history:

1. `20261112193424_teacher_sara_ai_core_schema.sql`
2. `20261112194605_teacher_sara_ai_usage_and_billing_tables.sql`
3. `20261112194825_teacher_sara_ai_usage_and_billing_tables.sql` (documented no-op; this version was recorded twice during the initial setup)
4. `20261112195341_teacher_sara_ai_foreign_key_indexes.sql`
5. `20261112195555_teacher_sara_ai_explicit_server_table_denies.sql`

The older `202611120001–004` migration drafts have been removed from the active migration folder because they targeted a previous, incompatible schema.

Security checks:
- RLS is enabled on all 10 public tables.
- Anonymous and authenticated users cannot execute the AI quota RPCs.
- Only `service_role` can execute quota RPCs and access billing/customer/usage/webhook tables.
- The `billing_customers`, `ai_usage_monthly`, `ai_voice_usage_monthly` and `stripe_webhook_events` tables have explicit deny policies for client roles.
- Foreign-key indexes were added for lesson/profile and skill-evidence/session relationships.

## Required setup before real use

### 1. Supabase Auth settings

Open the [Teacher Sara AI Supabase project](https://supabase.com/dashboard/project/zyvjemwhrvkdpnckigfx).

In **Authentication → URL Configuration**:
- Site URL: `https://teachersara.es`
- Add redirect URL: `https://teachersara.es/ai/`
- Add redirect URL: `https://www.teachersara.es/ai/`

Keep email confirmation enabled. Configure a production email sender/SMTP before inviting the public; default test email delivery is not a production mail service.

The adult-only checkbox is an attestation only. It does not verify identity or age, so do not use it as a child-safeguarding control.

### 2. Add server-side Function secrets

Open **Project Settings → Edge Functions → Secrets** in the Supabase dashboard:

`https://supabase.com/dashboard/project/zyvjemwhrvkdpnckigfx/settings/functions`

Add:

| Secret | Value / purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for server-side text tutoring |
| `OPENAI_MODEL` | `gpt-6.1-terra` (change only to a model available in your API project) |
| `STRIPE_SECRET_KEY` | Stripe test-mode secret key, beginning `sk_test_` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe test webhook |
| `STRIPE_PRICE_INDIVIDUAL_MONTHLY` | Test-mode recurring EUR Price ID after a price is approved and created |
| `APP_PUBLIC_URL` | `https://teachersara.es` |
| `APP_ALLOWED_ORIGINS` | `https://teachersara.es,https://www.teachersara.es` |
| `AI_FREE_MONTHLY_REQUEST_LIMIT` | `10` |
| `AI_PAID_MONTHLY_REQUEST_LIMIT` | `500` |
| `AI_VOICE_MONTHLY_SESSION_LIMIT` | `12` |
| `ENABLE_REALTIME_VOICE` | `false` for the initial launch |
| `ENABLE_CHILD_MODE` | `false` |

Supabase injects its project URL and service-role key into Edge Functions. Do not add a service-role key manually unless Supabase explicitly requires it. Never paste OpenAI, Stripe or Supabase secret keys into GitHub, the browser, or this chat.

### 3. Stripe test-mode setup

The connected Stripe account is currently the **Teacher Sara sandbox/test account**. No product, price, subscription or payment has been created.

Once the monthly price has been approved:
1. In Stripe test mode, create one recurring EUR product/price for the Individual plan.
2. Put its Price ID in `STRIPE_PRICE_INDIVIDUAL_MONTHLY`.
3. In Stripe Billing, configure the customer portal to allow payment-method updates, invoice history and cancellation.
4. Create a test webhook endpoint pointing to:
   `https://zyvjemwhrvkdpnckigfx.supabase.co/functions/v1/stripe-webhook`
5. Subscribe it to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
6. Put the test endpoint's `whsec_` signing secret in `STRIPE_WEBHOOK_SECRET`.

The app supports one Individual monthly plan at present. Family and company plans are not enabled. Do not switch to live mode until the test checkout, webhook, failed-payment handling, cancellation and access revocation have been verified.

### 4. OpenAI setup and cost controls

The tutor sends the learner's recent text conversation to the OpenAI Responses API. It first checks the latest learner answer with the Moderations API. The database stores aggregate usage counters, not transcripts.

Current defaults:
- Free: 10 text requests per calendar month.
- Paid: 500 text requests per calendar month.
- Voice: disabled.
- Child live chat: disabled.

These are conservative development defaults, not final commercial limits. Review actual API usage and per-user cost after pilot testing before increasing limits or setting a subscription price.

### 5. Production legal, privacy and safeguarding review

Before taking public payments:
- Complete the site's legal notice with the correct legal business name, NIF/NIE or company number where applicable, registered business address and contact email.
- Have the subscription terms, cancellation, refund/withdrawal, renewal and VAT treatment reviewed for Spanish/EU consumer and tax requirements.
- Update the privacy notice to explain Supabase account data, OpenAI text processing, Stripe payment processing, retention and data-subject rights. The fact that Teacher Sara does not save chat transcripts does not mean the AI provider never processes or retains data under its own service terms.
- Confirm the applicable OpenAI and Supabase data-processing terms and settings.
- Keep the pilot restricted to adults until guardian identity/consent, age-appropriate moderation, bounded child activities, teacher review, retention/deletion and safeguarding processes have been reviewed. The current under-14 database profile check is not by itself a complete consent or safeguarding system.
- Keep voice disabled until microphone/voice processing, cost controls, privacy wording and browser behaviour have been tested.

## What is not finished yet

- Secret values have not been entered into Supabase; live OpenAI tutoring will return a configuration message until the OpenAI key/model are added.
- Stripe Checkout is coded but cannot take payment until the test secret and approved recurring Price ID are configured, and the test webhook is connected.
- The domain's Supabase Auth redirect allow-list and production email sender still need configuration.
- Voice is deployed but deliberately off.
- The child learning track is a scripted demo only.
- The database has the basis for learner profiles, lessons and skill evidence, but a full teacher dashboard and validated progress analytics are not yet implemented.
- The app currently supports one Individual monthly plan, not family or company subscriptions.
- This branch has not been merged or published. The live `teachersara.es` pages are unchanged.

## Test checklist before launch

- Auth redirect, email confirmation, password policy, sign-in/out and recovery.
- A user cannot read or modify another user's data.
- Anonymous requests cannot use the tutor, billing or voice functions.
- Free and paid request limits are enforced atomically.
- Moderation failure is closed safely; failed provider requests restore a reserved credit.
- Stripe test Checkout creates the correct subscription and webhook synchronises access.
- Duplicate webhook events are idempotent.
- Failed payments stop paid access; cancellation is reflected and access ends at the subscription period end.
- Customer Portal allows a user to manage their subscription.
- Voice remains inaccessible while disabled; when later enabled it is paid-only, quota-limited and time-limited.
- The public pages, privacy notice, legal terms, accessibility, mobile layout and account flows are reviewed before the branch is merged.
