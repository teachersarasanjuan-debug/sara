-- Teacher Sara AI: secure accounts, parent-owned learner profiles, billing and usage.
-- No chat transcripts or voice recordings are stored by this schema.

create extension if not exists pgcrypto;

create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(display_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 40),
  age_band text not null check (age_band in ('under_8','8_11','12_14','15_17','adult')),
  track text not null default 'general' check (track in ('general','cambridge','business')),
  level text not null default 'A1' check (level in ('Pre-A1','A1','A2','B1','B2','C1','C2')),
  guardian_consent_at timestamptz,
  consent_copy_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, display_name)
);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  plan_key text not null default 'individual',
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status, current_period_end desc);

create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, month_start)
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learner_profiles(id) on delete cascade,
  track text not null check (track in ('general','cambridge','business','young')),
  skill text not null check (length(skill) between 1 and 50),
  evidence_count integer not null default 1 check (evidence_count >= 0),
  confidence_band text check (confidence_band in ('emerging','developing','consistent')),
  updated_at timestamptz not null default now(),
  unique(user_id, learner_profile_id, track, skill)
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- Create a minimal profile when an auth user is created.
create or replace function public.handle_new_teacher_sara_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_profiles(user_id, display_name)
  values (new.id, nullif(new.raw_user_meta_data->>'display_name',''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_teacher_sara_user() from public, anon, authenticated;

drop trigger if exists on_teacher_sara_auth_user_created on auth.users;
create trigger on_teacher_sara_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_teacher_sara_user();

-- Atomic monthly quota reservation. Only the server-side service_role may execute it.
create or replace function public.consume_ai_credit(
  p_user_id uuid,
  p_month_start date,
  p_monthly_limit integer
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_monthly_limit < 1 then
    return false;
  end if;

  insert into public.ai_usage_monthly(user_id, month_start, request_count)
  values (p_user_id, p_month_start, 1)
  on conflict (user_id, month_start)
  do update
    set request_count = public.ai_usage_monthly.request_count + 1,
        updated_at = now()
    where public.ai_usage_monthly.request_count < p_monthly_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.consume_ai_credit(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_credit(uuid, date, integer) to service_role;

-- Enable RLS everywhere; exposed tables are never public.
alter table public.account_profiles enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_usage_monthly enable row level security;
alter table public.learning_progress enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "profile_owner_select" on public.account_profiles;
create policy "profile_owner_select" on public.account_profiles
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "profile_owner_update" on public.account_profiles;
create policy "profile_owner_update" on public.account_profiles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "learner_owner_select" on public.learner_profiles;
create policy "learner_owner_select" on public.learner_profiles
for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "learner_owner_insert" on public.learner_profiles;
create policy "learner_owner_insert" on public.learner_profiles
for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists "learner_owner_update" on public.learner_profiles;
create policy "learner_owner_update" on public.learner_profiles
for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "learner_owner_delete" on public.learner_profiles;
create policy "learner_owner_delete" on public.learner_profiles
for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "subscription_owner_select" on public.subscriptions;
create policy "subscription_owner_select" on public.subscriptions
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "progress_owner_select" on public.learning_progress;
create policy "progress_owner_select" on public.learning_progress
for select to authenticated using ((select auth.uid()) = user_id);

-- Least-privilege grants: no client writes to billing, quota or webhook tables.
revoke all on public.account_profiles from anon, authenticated;
revoke all on public.learner_profiles from anon, authenticated;
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.ai_usage_monthly from anon, authenticated;
revoke all on public.learning_progress from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;

grant select on public.account_profiles to authenticated;
grant update(display_name) on public.account_profiles to authenticated;
grant select, insert, update, delete on public.learner_profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.learning_progress to authenticated;

grant all on public.billing_customers to service_role;
grant all on public.subscriptions to service_role;
grant all on public.ai_usage_monthly to service_role;
grant all on public.learning_progress to service_role;
grant all on public.stripe_webhook_events to service_role;
grant all on public.account_profiles to service_role;

-- Do not grant client access to ai_usage_monthly, billing_customers or webhook events.
