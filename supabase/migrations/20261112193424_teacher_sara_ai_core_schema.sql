-- Teacher Sara AI core schema. All learner data is owner-scoped with RLS.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  audience text not null check (audience in ('young_learner','cambridge','business')),
  cefr_level text not null check (cefr_level in ('PRE_A1','A1','A2','B1','B2','C1')),
  age_band text not null check (age_band in ('under_14','14_plus','adult')),
  parent_consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint under_14_requires_parent_consent check (
    age_band <> 'under_14' or (parent_consent_at is not null and consent_version is not null)
  )
);

create table if not exists public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learner_profiles(id) on delete set null,
  learning_mode text not null check (learning_mode in ('cambridge','business','young')),
  cefr_level text not null check (cefr_level in ('PRE_A1','A1','A2','B1','B2','C1')),
  scenario_key text not null,
  objective text not null,
  teacher_summary text,
  next_step text,
  self_rating text check (self_rating in ('too_easy','right_level','too_difficult')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0 and duration_seconds <= 7200),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.skill_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  skill text not null check (skill in ('speaking','grammar','vocabulary','listening','writing','pronunciation','pragmatics')),
  level_band text check (level_band in ('PRE_A1','A1','A2','B1','B2','C1')),
  confidence numeric(3,2) not null default 0.50 check (confidence between 0 and 1),
  evidence text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_key text check (plan_key in ('individual_monthly','family_monthly','business_monthly')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('ai_turn','voice_session','voice_minute','checkout_started')),
  units numeric(12,2) not null default 1 check (units > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists learner_profiles_owner_idx on public.learner_profiles(owner_id);
create index if not exists lesson_sessions_owner_created_idx on public.lesson_sessions(owner_id, created_at desc);
create index if not exists skill_evidence_owner_created_idx on public.skill_evidence(owner_id, created_at desc);
create index if not exists usage_events_owner_created_idx on public.usage_events(owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.skill_evidence enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "learner_profiles_select_own" on public.learner_profiles;
create policy "learner_profiles_select_own" on public.learner_profiles for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "learner_profiles_insert_own" on public.learner_profiles;
create policy "learner_profiles_insert_own" on public.learner_profiles for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "learner_profiles_update_own" on public.learner_profiles;
create policy "learner_profiles_update_own" on public.learner_profiles for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "learner_profiles_delete_own" on public.learner_profiles;
create policy "learner_profiles_delete_own" on public.learner_profiles for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "lesson_sessions_select_own" on public.lesson_sessions;
create policy "lesson_sessions_select_own" on public.lesson_sessions for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "lesson_sessions_insert_own" on public.lesson_sessions;
create policy "lesson_sessions_insert_own" on public.lesson_sessions for insert to authenticated with check (
  (select auth.uid()) = owner_id and (
    learner_profile_id is null or exists (
      select 1 from public.learner_profiles p
      where p.id = learner_profile_id and p.owner_id = (select auth.uid())
    )
  )
);
drop policy if exists "lesson_sessions_update_own" on public.lesson_sessions;
create policy "lesson_sessions_update_own" on public.lesson_sessions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "skill_evidence_select_own" on public.skill_evidence;
create policy "skill_evidence_select_own" on public.skill_evidence for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own" on public.usage_events for select to authenticated using ((select auth.uid()) = owner_id);

-- Explicit Data API grants are required for projects created after the 2026 Supabase change.
grant usage on schema public to authenticated, service_role;
grant select, insert on public.profiles to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.learner_profiles to authenticated;
grant select, insert, update on public.lesson_sessions to authenticated;
grant select on public.skill_evidence to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.usage_events to authenticated;
grant all on public.profiles, public.learner_profiles, public.lesson_sessions, public.skill_evidence, public.subscriptions, public.usage_events, public.stripe_webhook_events to service_role;
