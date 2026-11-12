-- Atomic monthly usage quotas and server-only billing customer linkage.
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, month_start)
);
create table if not exists public.ai_voice_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  session_count integer not null default 0 check (session_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, month_start)
);
alter table public.billing_customers enable row level security;
alter table public.ai_usage_monthly enable row level security;
alter table public.ai_voice_usage_monthly enable row level security;
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.ai_usage_monthly from anon, authenticated;
revoke all on public.ai_voice_usage_monthly from anon, authenticated;
grant all on public.billing_customers to service_role;
grant all on public.ai_usage_monthly to service_role;
grant all on public.ai_voice_usage_monthly to service_role;
create or replace function public.consume_ai_credit(p_user_id uuid,p_month_start date,p_monthly_limit integer)
returns boolean language plpgsql set search_path = public as $$
declare v_count integer;
begin
 if p_monthly_limit < 1 then return false; end if;
 insert into public.ai_usage_monthly(user_id,month_start,request_count) values(p_user_id,p_month_start,1)
 on conflict(user_id,month_start) do update
 set request_count=public.ai_usage_monthly.request_count+1,updated_at=now()
 where public.ai_usage_monthly.request_count < p_monthly_limit
 returning request_count into v_count;
 return v_count is not null;
end; $$;
create or replace function public.refund_ai_credit(p_user_id uuid,p_month_start date)
returns void language sql set search_path = public as $$
 update public.ai_usage_monthly set request_count=greatest(request_count-1,0),updated_at=now()
 where user_id=p_user_id and month_start=p_month_start;
$$;
create or replace function public.consume_voice_credit(p_user_id uuid,p_month_start date,p_monthly_limit integer)
returns boolean language plpgsql set search_path = public as $$
declare v_count integer;
begin
 if p_monthly_limit < 1 then return false; end if;
 insert into public.ai_voice_usage_monthly(user_id,month_start,session_count) values(p_user_id,p_month_start,1)
 on conflict(user_id,month_start) do update
 set session_count=public.ai_voice_usage_monthly.session_count+1,updated_at=now()
 where public.ai_voice_usage_monthly.session_count < p_monthly_limit
 returning session_count into v_count;
 return v_count is not null;
end; $$;
create or replace function public.refund_voice_credit(p_user_id uuid,p_month_start date)
returns void language sql set search_path = public as $$
 update public.ai_voice_usage_monthly set session_count=greatest(session_count-1,0),updated_at=now()
 where user_id=p_user_id and month_start=p_month_start;
$$;
revoke all on function public.consume_ai_credit(uuid,date,integer) from public,anon,authenticated;
revoke all on function public.refund_ai_credit(uuid,date) from public,anon,authenticated;
revoke all on function public.consume_voice_credit(uuid,date,integer) from public,anon,authenticated;
revoke all on function public.refund_voice_credit(uuid,date) from public,anon,authenticated;
grant execute on function public.consume_ai_credit(uuid,date,integer) to service_role;
grant execute on function public.refund_ai_credit(uuid,date) to service_role;
grant execute on function public.consume_voice_credit(uuid,date,integer) to service_role;
grant execute on function public.refund_voice_credit(uuid,date) to service_role;
