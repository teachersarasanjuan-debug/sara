# Teacher Sara AI — secure paid-platform foundation

This application is separate from the existing static Teacher Sara website. The live public pages at the repository root are not changed.

## What is in this branch
- Next.js App Router application in this directory.
- Supabase email magic-link authentication and protected studio pages.
- Server-side OpenAI Responses API chat with input moderation, structured teaching feedback and monthly quota checks.
- Stripe subscription checkout, customer portal and signed webhook handler.
- Server-minted Realtime API ephemeral credentials for short-lived browser voice sessions.
- Teacher account overview (email allowlist, server-side admin client).
- Draft privacy and terms pages.
- Adult-only beta. Child chat is disabled until guardian controls, safeguarding and legal checks are complete.
- Chat transcripts are not saved by the application; only account, subscription and usage metadata are stored.

## IMPORTANT: this is not yet a live paid service
The code has been added to GitHub, but no production server, database, API credentials, Stripe product, subscription price, domain or deployment has been connected. Do not tell customers they can buy access yet. The paid checkout route returns a configuration error until Stripe is set up.

An OpenAI API key is billed separately from ChatGPT. Never paste secrets into this chat or commit them to GitHub.

## Architecture
- Public marketing site: GitHub Pages from the repository root; existing domain stays as it is.
- AI learning app: a separate Vercel project with Root Directory set to this directory.
- Login/database: Supabase.
- AI: OpenAI API, called only by server routes.
- Payments: Stripe Checkout subscriptions and Customer Portal.

Vercel supports deploying a chosen subdirectory from a Git repository as a separate project. See https://vercel.com/docs/monorepos

## Setup

### A. Connect provider accounts
Connect the Supabase, Vercel and Stripe apps to the working environment. The user must authorise those connections. We can then work directly with the actual projects. Do not share any secret keys in messages.

### B. Supabase
1. Create a project in an EU region appropriate for the business.
2. Run the SQL in supabase/migrations/001_initial.sql.
3. Copy project URL and publishable key into Vercel environment variables.
4. Set SUPABASE_SERVICE_ROLE_KEY as a server-only Vercel secret.
5. In Authentication > URL Configuration, set the Site URL to the final app domain and add /auth/callback to Redirect URLs.
6. Configure production email delivery for magic links.
7. Test sign-in, sign-out, RLS and cross-user isolation.

### C. Vercel
1. Import the existing repository as a NEW Vercel project.
2. Set Root Directory to platform.
3. Add variables listed in .env.example.
4. Deploy first to a Vercel preview URL; test before adding the custom domain.
5. Configure learn.teachersara.es only after verifying DNS. Keep teachersara.es serving the existing GitHub Pages website.

### D. OpenAI
1. Create an API project and separate API billing account.
2. Set an account usage budget/alerts.
3. Add OPENAI_API_KEY only to Vercel server environment variables.
4. Use a supported model identifier in OPENAI_MODEL and OPENAI_REALTIME_MODEL.
5. Test cost per session, moderation, response quality and latency before inviting users.

### E. Stripe
1. Create a product for Teacher Sara AI membership.
2. Decide the EUR recurring monthly price, VAT presentation, included usage, trial policy and cancellation/refund wording.
3. Create the recurring monthly Price and set STRIPE_PRICE_ID_MONTHLY.
4. Configure the webhook endpoint https://learn.teachersara.es/api/billing/webhook for:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
5. Put the webhook signing secret in STRIPE_WEBHOOK_SECRET.
6. Configure the Stripe Customer Portal.
7. Test checkout, successful payment, failed payment, cancellation, renewal, webhook replay and portal in Stripe test mode before live mode.

### F. Teacher access
Add Sara's sign-in email to TEACHER_EMAILS in Vercel (comma-separated). This gives access to the teacher metadata overview. The teacher page uses the service-role key server-side; the key is never sent to the browser.

## Current allowances in the SQL migration
- Free beta: 10 text messages per calendar month.
- Active paid plan: 300 text messages per month.
- Active paid plan: up to 40 voice-session credentials per month.
These are provisional product guardrails. They need to be compared with actual API cost and customer value before setting the public subscription price. A voice session is a connection allowance, not a promise of unlimited minutes.

## Important pre-launch requirements
- Replace and legally review the draft privacy notice and terms. Add the legal data controller identity, purposes/legal bases, retention, processors, international transfers, user rights process, support and complaint route.
- Confirm Spanish/EU consumer subscription rules, VAT treatment, withdrawal/cancellation/refund terms and accessibility with an appropriate adviser.
- Independent child accounts and open child chat are disabled. A child service must have verified guardian controls, appropriate consent, safeguarding, data minimisation and a separate data-protection assessment. Spain's general consent threshold for processing based on a minor's consent is 14, subject to exceptions; see https://www.aepd.es/preguntas-frecuentes/10-menores-y-educacion/FAQ-1001-cual-es-la-edad-para-que-los-menores-puedan-prestar-consentimiento-para-tratar-sus-datos-personales
- Add a data export/deletion workflow, support inbox, incident procedure, monitoring, backup/recovery and abuse controls.
- Security review: RLS tests, webhook signature/replay tests, CSRF/origin checks, rate limits, account verification, dependency audit, prompt-injection tests and output validation.
- Run supervised adult pilot sessions first. Do not claim official Cambridge scoring, recognised certification or guaranteed CEFR progress.

## Known incomplete items
- Browser WebRTC voice UI and the server-minted ephemeral session token flow are implemented; verify on supported browsers and with a real paid test account.
- Voice audio is streamed to OpenAI Realtime; the application does not store voice recordings. There is no separate pronunciation scoring or speech transcript report yet.
- Teacher page shows account/usage metadata only; no student transcript monitoring.
- Pricing amount is intentionally unset pending the user's decision.
- Stripe webhook needs end-to-end test-mode verification and payment lifecycle review.
- No final legal documents, support portal, export/delete screen, VAT display or production monitoring yet.
- No public child accounts.

## Environment variables
See .env.example. Never use a NEXT_PUBLIC_ prefix for secret values. Never share private keys in chat.
