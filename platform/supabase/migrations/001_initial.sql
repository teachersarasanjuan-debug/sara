-- Teacher Sara AI: adult-beta profiles, quotas and RLS.
-- Run in the Supabase SQL editor. Do not run against an existing production database without review.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free','pro')),
  subscription_status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  monthly_used integer not null default 0 check (monthly_used >= 0),
  monthly_limit integer not null default 10 check (monthly_limit >= 0),
  usage_month date not null default date_trunc('month', now())::date,
  voice_sessions_used integer not null default 0 check (voice_sessions_used >= 0),
  voice_usage_month date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id,email)
  values(new.id,new.email)
  on conflict(id) do update set email=excluded.email, updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;\ngrant all on public.profiles to service_role;

drop policy if exists "Read own profile only" on public.profiles;
create policy "Read own profile only" on public.profiles
for select to authenticated using (auth.uid()=id);

-- No direct client writes are allowed to billing, plan, role or quota fields.
revoke insert,update,delete on public.profiles from anon,authenticated;

create or replace function public.consume_ai_credit()
returns table(allowed boolean,remaining integer,reason text,plan text)
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); p public.profiles%rowtype; lim integer;
begin
 if uid is null then return query select false,0,'not_authenticated'::text,'free'::text; return; end if;
 select * into p from public.profiles where id=uid for update;
 if not found then return query select false,0,'profile_missing'::text,'free'::text; return; end if;
 if p.usage_month < date_trunc('month',now())::date then p.monthly_used:=0; end if;
 lim:=case when p.plan='pro' and p.subscription_status in ('active','trialing') then 300 else 10 end;
 if p.monthly_used>=lim then return query select false,0,'monthly_limit_reached'::text,p.plan; return; end if;
 update public.profiles set monthly_used=p.monthly_used+1,monthly_limit=lim,usage_month=date_trunc('month',now())::date,updated_at=now() where id=uid;
 return query select true,lim-(p.monthly_used+1),'ok'::text,p.plan;
end;
$$;

create or replace function public.refund_ai_credit()
returns void language plpgsql security definer set search_path = ''
as $$
begin
 update public.profiles set monthly_used=greatest(monthly_used-1,0),updated_at=now()
 where id=auth.uid() and usage_month=date_trunc('month',now())::date;
end;
$$;

create or replace function public.consume_voice_credit()
returns table(allowed boolean,remaining integer,reason text)
language plpgsql security definer set search_path = ''
as $$
declare uid uuid:=auth.uid(); p public.profiles%rowtype; lim integer:=40;
begin
 if uid is null then return query select false,0,'not_authenticated'::text; return; end if;
 select * into p from public.profiles where id=uid for update;
 if not found or p.plan<>'pro' or p.subscription_status not in ('active','trialing') then
  return query select false,0,'paid_membership_required'::text; return;
 end if;
 if p.voice_usage_month<date_trunc('month',now())::date then p.voice_sessions_used:=0; end if;
 if p.voice_sessions_used>=lim then return query select false,0,'monthly_voice_limit_reached'::text; return; end if;
 update public.profiles set voice_sessions_used=p.voice_sessions_used+1,voice_usage_month=date_trunc('month',now())::date,updated_at=now() where id=uid;
 return query select true,lim-(p.voice_sessions_used+1),'ok'::text;
end;
$$;

create or replace function public.refund_voice_credit()
returns void language plpgsql security definer set search_path = ''
as $$
begin
 update public.profiles set voice_sessions_used=greatest(voice_sessions_used-1,0),updated_at=now()
 where id=auth.uid() and voice_usage_month=date_trunc('month',now())::date;
end;
$$;

revoke all on function public.consume_ai_credit() from public,anon;
revoke all on function public.refund_ai_credit() from public,anon;
revoke all on function public.consume_voice_credit() from public,anon;
revoke all on function public.refund_voice_credit() from public,anon;
grant execute on function public.consume_ai_credit() to authenticated;
grant execute on function public.refund_ai_credit() to authenticated;
grant execute on function public.consume_voice_credit() to authenticated;
grant execute on function public.refund_voice_credit() to authenticated;

-- Teacher overview uses the service role only after email allowlisting in the server.
-- Never expose SUPABASE_SERVICE_ROLE_KEY to a browser or commit it to Git.
