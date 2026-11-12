-- Voice session quotas: count short-lived sessions, not transcripts or recordings.
create table if not exists public.ai_voice_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  session_count integer not null default 0 check (session_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, month_start)
);

alter table public.ai_voice_usage_monthly enable row level security;
revoke all on public.ai_voice_usage_monthly from anon, authenticated;
grant all on public.ai_voice_usage_monthly to service_role;

create or replace function public.consume_voice_credit(
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
  if p_monthly_limit < 1 then return false; end if;
  insert into public.ai_voice_usage_monthly(user_id, month_start, session_count)
  values (p_user_id, p_month_start, 1)
  on conflict (user_id, month_start)
  do update
    set session_count = public.ai_voice_usage_monthly.session_count + 1,
        updated_at = now()
    where public.ai_voice_usage_monthly.session_count < p_monthly_limit
  returning session_count into v_count;
  return v_count is not null;
end;
$$;

revoke all on function public.consume_voice_credit(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_voice_credit(uuid, date, integer) to service_role;
