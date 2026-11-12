-- Covering indexes for the two foreign keys flagged by Supabase's performance advisor.
create index if not exists lesson_sessions_learner_profile_idx
  on public.lesson_sessions(learner_profile_id);
create index if not exists skill_evidence_session_idx
  on public.skill_evidence(session_id);
