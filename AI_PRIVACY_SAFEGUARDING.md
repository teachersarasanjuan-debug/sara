# Teacher Sara AI — privacy, safeguarding and launch checklist

This is a product implementation checklist, **not a legal privacy notice or legal advice**.

## Data handled by the current MVP design

- Supabase Auth handles adult account email/password and confirmation.
- Account profile stores a display name only.
- Subscription/customer/plan data is stored for entitlement and billing operations.
- Aggregate monthly text requests and voice-session counts are stored.
- Optional learner profiles can be parent-owned and use a display nickname, age band, track and level.
- Chat transcripts and voice recordings are not written to the app database.
- The OpenAI API receives learner prompts, and the Realtime API receives live microphone audio during a voice session.

## Before any public launch

- Identify the legal business/data controller and publish complete contact details.
- Complete the privacy notice, lawful-basis assessment, processor list, retention schedule, data-subject rights route and deletion procedure.
- Review OpenAI and Supabase data processing terms and applicable data-transfer arrangements.
- Determine whether a DPIA is required, especially before processing children's data or systematic learner assessments.
- Review Spain's and EU's applicable rules for children's consent, parental/guardian permission, age verification, online services and education.
- Update cookie/analytics and tracking disclosures if new services or analytics are introduced.
- Decide where data is hosted and document region/backup/retention arrangements.
- Add a human contact and a clear route to report incorrect or unsafe feedback.
- Make clear that AI feedback may be imperfect and is not an official Cambridge assessment.

## Child mode is disabled

Do not change `ENABLE_CHILD_MODE` to true until all of the following exist and have been reviewed:
- verified parent/guardian account and consent;
- guardian-owned child learner profiles;
- strict age-appropriate bounded activities rather than open-ended chat;
- moderated topics and safe completion/refusal pathways;
- no direct messaging or social features;
- parent controls, access and deletion;
- teacher review/escalation mechanism;
- child-specific terms and privacy notice;
- documented safeguarding and incident procedure.

The current young learner tile is a scripted sample, not a live AI service.

## Voice privacy

- Microphone access begins only after a deliberate Start action.
- The browser stops microphone tracks when a session ends, the user signs out, or a connection fails.
- The app database does not save audio recordings or transcripts.
- Audio is transmitted to OpenAI for live inference; explain this clearly before the user grants microphone access.
- Review provider data controls, retention settings and account eligibility before enabling real voice sessions.
- The Realtime token is short-lived; the permanent OpenAI key stays server-side.
