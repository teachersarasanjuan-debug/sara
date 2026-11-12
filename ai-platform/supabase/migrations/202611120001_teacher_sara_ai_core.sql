-- Teacher Sara AI initial schema migration.
-- Raw learner transcripts and voice recordings are deliberately not stored.
-- Usage counters are isolated in a private schema and may only be changed through
-- a narrowly scoped, user-bound SECURITY DEFINER routine.

create extension if not exists pgcrypto;

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('business','cambridge-adult')),
  level text not null check (level in ('A2','B1','B2','C1')),
  message_count integer not null default 1 check (message_count between 1 and 30),
  skills_practised text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.learning_sessions enable row level security;
revoke all on public.learning_sessions from public, anon, authenticated;
grant select, insert, delete on public.learning_sessions to authenticated;
grant all on public.learning_sessions to service_role;

create policy "Learners read their own learning sessions"
  on public.learning_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Learners create their own learning sessions"
  on public.learning_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Learners delete their own learning sessions"
  on public.learning_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists learning_sessions_user_created_idx
  on public.learning_sessions(user_id, created_at desc);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

create policy "Learners read only their own subscription"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

-- Private usage table: no Data API access and no direct authenticated grants.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);
alter table private.usage_daily enable row level security;
revoke all on private.usage_daily from public, anon, authenticated;
grant all on private.usage_daily to service_role;

-- The SECURITY DEFINER routine validates auth.uid() itself and accepts no user_id
-- argument, so a caller can only consume their own quota. It lives in a non-exposed
-- schema and does not read or return private rows.
create or replace function private.consume_ai_quota(p_day date, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_user uuid := auth.uid();
begin
  if v_user is null or p_day is null or p_limit < 1 or p_limit > 100 then
    return false;
  end if;

  insert into private.usage_daily(user_id, usage_date, request_count)
  values (v_user, p_day, 1)
  on conflict (user_id, usage_date)
  do update set request_count = private.usage_daily.request_count + 1
  where private.usage_daily.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function private.consume_ai_quota(date, integer) from public, anon;
grant execute on function private.consume_ai_quota(date, integer) to authenticated;

-- Public RPC is SECURITY INVOKER and merely forwards to the fixed, user-bound
-- private routine. Only authenticated users can execute it.
create or replace function public.consume_ai_quota(p_day date, p_limit integer)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.consume_ai_quota(p_day, p_limit);
$$;

revoke all on function public.consume_ai_quota(date, integer) from public, anon;
grant execute on function public.consume_ai_quota(date, integer) to authenticated;
