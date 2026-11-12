# Teacher Sara AI — product research and design decisions

**Research date:** 12 November 2026  
**Purpose:** Learn from Learnlight and consumer AI language-learning products without copying their protected content, branding, or interface.

## Executive position

Teacher Sara AI should not try to win by having the most avatars or the longest list of languages. Its defensible difference should be **teacher-led learning that can explain its feedback, adapt to the learner's actual skill profile, and show whether the learner can use the skill again without help**.

Learnlight's public positioning is strong in the areas we should respect: avatar-based workplace role-play, learner-goal personalisation, speaking and writing practice, instant feedback, reinforcement, levelled goals, grammar/vocabulary frameworks, and quality review by experienced learning teams. Its site says Fluency Lab supports English, French, German, Italian, Portuguese and Spanish. These are Learnlight's own product claims, not independently verified performance measurements.

## Competitor review

### 1. Learnlight Fluency Lab

**What it does well (public product description):**
- Personalised avatar trainers and real-world workplace topics.
- Guided role-play for professional conversations.
- Speaking and writing activities with instant feedback.
- Reinforcement and learning objectives tied to expert courseware.
- Quality testing by experienced learning teams.

**What Teacher Sara AI should improve or differentiate:**
- Put the teaching rationale in front of the learner: each task should state the skill objective, success criteria and the next step.
- Make feedback inspectable: quote the learner's exact words, show a corrected version, explain why, and let the learner try again.
- Give a teacher a meaningful review view, not only a learner-facing conversation.
- Measure transfer: after practice, give a fresh task that tests whether the learner can use the correction independently.

Source: https://www.learnlight.com/en/ai/

### 2. Praktika

**What its public product and user-review summaries indicate:**
- Avatar-led conversation and short speaking practice are engaging for many users.
- Trustpilot's review summary reports some complaints about speech-recognition glitches, lag, inconsistent level adaptation, irrelevant vocabulary and lessons that can be too advanced for beginners.

**Our design response:**
- Ask for a quick learner level and goal before choosing a scenario.
- Provide a visible "too easy / right level / too difficult" control.
- Do not advance difficulty after one fluent answer; adjust from repeated performance across a session.
- Let learners see and correct the speech transcript before scoring it.
- Do not score pronunciation when the audio/transcript confidence is too low.

Source: https://www.trustpilot.com/review/praktika.ai

### 3. Talkpal

**What its public user-review summaries indicate:**
- Users praise flexible conversation practice and immediate correction.
- Trustpilot's summary also mentions customer-service, unexpected-charge and microphone/technical-performance complaints.

**Our design response:**
- Make pricing, usage limits, renewals and cancellation terms plain and visible.
- Provide a working text fallback if microphone access fails.
- Show connection and microphone state clearly.
- Provide a clear "report a problem" route and a human contact for paid customers.
- Avoid making a learner repeat a full lesson because a connection dropped.

Source: https://www.trustpilot.com/review/talkpal.ai

### 4. ELSA Speak

**What public positioning and review material indicate:**
- ELSA is strongly focused on speech and pronunciation practice.
- A small Trustpilot sample includes complaints about incorrect AI grading and access/support problems. The sample is small and should not be treated as representative of all ELSA users.

**Our design response:**
- Separate pronunciation feedback from grammar and task feedback.
- Treat speech scoring as a best-effort estimate, not an objective judgement of someone's accent or intelligence.
- Give the learner the transcript and let them challenge or correct it.
- Prioritise intelligibility and the sound contrast being practised, not accent elimination.

Source: https://www.trustpilot.com/review/elsaspeak.com

### 5. Speak and other speaking-first apps

Speaking-first products make it easy to practise frequently. Independent comparison/review material also flags paywalls, trial/renewal confusion, uneven speech recognition, and thin or repetitive content at higher levels. These reports vary in quality; treat them as risk signals, not definitive product audits.

**Our design response:**
- A useful free sample with clearly disclosed limits.
- No hidden auto-renewal or unclear trial conversion.
- A cancel/manage subscription control that is easy to find.
- Advanced-level content must include pragmatic nuance, register, argument structure and professional communication—not only more difficult vocabulary.

Source: https://thereviewatnyu.com/blog/best-ai-english-speaking-apps-2026-pricing

## Evidence from language-learning research

A 2026 systematic review of 54 studies reported recurring technical limitations including unreliable AI output (reported in 22 studies), limited contextual understanding (16), speech-recognition limitations (6), and feedback limitations (4). These counts describe how many studies reported a limitation; they are **not** the proportion of learners affected or a ranking of commercial products.

A 2025 systematic review of 30 empirical studies found positive effects for chatbots on several language skills, particularly speaking and writing, while noting limits in nuanced emotional engagement and complex contextual interaction. It recommends thoughtful integration with human instruction.

A 2024 meta-analysis reported positive language-learning outcomes, with medium-duration interventions (6 weeks to 6 months), blended/online environments, adaptive personalisation and diverse feedback sources associated with stronger results.

Sources:
- https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1948091/full
- https://www.sciencedirect.com/science/article/pii/S2215039025000086
- https://www.sciencedirect.com/science/article/pii/S0346251X2400280X

## Product principles: how Teacher Sara AI should be better

1. **Teacher-led, not chatbot-led.** Lessons are built around an objective, a model, guided practice, learner production, feedback, retry and a new transfer task.
2. **Explain every correction.** Show original words, suggested correction, a short rule, why it matters, and one retry. Avoid red-pen walls of feedback.
3. **Don't bluff.** If speech recognition is uncertain, say so. Don't invent pronunciation scores or CEFR levels from a tiny sample.
4. **Skills are separate.** Keep a profile for speaking fluency, grammar control, vocabulary range, listening, writing, pronunciation/intelligibility and pragmatic appropriacy; don't reduce the learner to one magic score.
5. **Adapt carefully.** Use repeated evidence and learner self-report (too easy / right level / too difficult), not one answer.
6. **Human teacher loop.** Sara can review session summaries, set priorities, correct the AI's plan and add teacher-authored material.
7. **Transparent pricing.** Show euros, VAT treatment, limits, renewal date and cancellation policy before checkout. Avoid deceptive trials or hard-to-find cancellation.
8. **Reliable on ordinary devices.** Web-first, mobile friendly, accessible controls, keyboard operation, transcripts and a text fallback when audio fails.
9. **Children's safety by design.** No unrestricted open-ended child chatbot in the first release. Use parent/teacher-supervised, bounded activities; collect the minimum data; no voice recording retention by default; add safeguarding, moderation, parental consent and legal review before real child accounts.
10. **No false exam claims.** Cambridge practice must use original tasks aligned to the relevant skill/level, not copied copyrighted exam items, and must not claim official Cambridge certification or scoring.
11. **Show learning, not vanity metrics.** Track goals, retries, task success and independent transfer over time. Do not promise a CEFR improvement or fluency gain without validation.
12. **Human support for paying customers.** There must be an understandable way to ask for help or challenge a correction.

## Recommended first product

### Learning tracks
- **Young learners (supervised pilot):** short, bounded speaking and vocabulary activities; parent/teacher chooses topic and level. No open social chat.
- **Cambridge practice:** original A2 Key / B1 Preliminary / B2 First / C1 Advanced-style tasks, clear rubrics, explanations and second-attempt practice.
- **Business English:** meetings, presentations, calls, project updates, negotiation and email role-play; feedback on clarity, register, grammar and task completion.

### MVP sequence
1. Reviewable web prototype with a guided sample lesson (current branch).
2. Secure text AI endpoint, structured feedback schema, teacher-authored scenario library, rate limits and privacy controls.
3. Realtime voice practice using short-lived server-issued credentials.
4. Teacher accounts, learner profiles and progress history, after choosing and configuring an appropriate data processor and retention policy.
5. Parent/guardian flow and controlled child pilot only after safeguarding and legal review.
6. Payments and commercial rollout only after pilot evidence and operating costs are known.

## Technical/security constraint

The existing Teacher Sara website is a static GitHub Pages site. Static JavaScript must never contain a permanent OpenAI API key. OpenAI's current guidance is to keep secret keys out of browsers, mobile apps, source control and logs. A live product therefore needs a server-side endpoint (for example a Cloudflare Worker or other secure backend) that owns the key, validates requests, enforces quotas and returns only the data the browser needs. For browser voice, the Realtime API flow uses a server-created ephemeral client secret.

Sources:
- https://developers.openai.com/api/docs/guides/api-keys
- https://developers.openai.com/api/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://developers.openai.com/api/docs/guides/moderation

## What this research does not prove

- It does not prove Teacher Sara AI will be better than Learnlight or any competitor.
- Public marketing pages describe intended features, not independent test results.
- Public customer reviews are self-selected and cannot establish the prevalence of a problem.
- Before making performance claims, we need to pilot the app with learners and evaluate objective outcomes, reliability, accessibility, moderation and cost per completed session.
