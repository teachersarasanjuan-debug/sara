# Teacher Sara AI — first prototype

This is a **reviewable prototype**, not a live AI service.

## Open locally
Open `index.html` in a modern browser, or serve the repository root with any static web server and visit `/ai/`.

## What currently works
- Switch between supervised young learners, Cambridge practice and Business English.
- Choose a level and guided practice scenario.
- Start a sample lesson and exchange a few messages with the deterministic demo coach.
- See a sample correction and retry prompt.
- Reset the session.

## What is deliberately not live yet
- The chat is a scripted teaching demonstration, **not a connected generative AI model**.
- Voice input/output, accounts, saved profiles, progress history, payments and teacher dashboard are not connected.
- Nothing in this prototype sends or stores learner messages.
- The prototype does not collect names, dates of birth, recordings or payment information.

## Live AI connection — required next
The existing site is deployed as static GitHub Pages. A secure backend is required before enabling real AI:
1. Deploy a small server-side endpoint (Cloudflare Worker or another managed backend).
2. Store `OPENAI_API_KEY` as a server secret, never in this repository or browser code.
3. Restrict the endpoint to the Teacher Sara origin; validate request size, message count, mode and level; add rate limiting and usage quotas.
4. Return structured feedback fields (coach reply, exact learner phrase, suggested version, explanation, one retry task, and confidence/uncertainty).
5. Add human escalation/report-feedback controls and automated tests for feedback quality.
6. For voice, use the server to mint short-lived Realtime API client credentials. Do not expose the permanent API key.

Suggested server-side configuration:
- `OPENAI_API_KEY` — secret
- `OPENAI_MODEL` — selected model identifier
- `ALLOWED_ORIGIN` — exact production origin
- rate-limit configuration — platform-specific binding/service

## Before real student accounts
- Review Spanish/EU privacy, children's consent, safeguarding and data-processing requirements.
- Choose a data store and retention policy; default to minimal data and no stored voice recordings.
- Add parent/guardian controls for children and keep their activities bounded and teacher-approved.
- Do not put under-14 users into an unrestricted open chat.
- Add a data deletion process, support contact and incident procedure.
- Verify all CEFR/Cambridge claims and use original practice content.

## Product research
See [AI_PRODUCT_RESEARCH.md](../AI_PRODUCT_RESEARCH.md).
