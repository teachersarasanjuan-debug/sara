-- Teacher Sara AI: adult-beta profiles, RLS and server-only usage quotas.
-- Run in the Supabase SQL Editor in a NEW project before deployment.
-- Quota RPC functions accept a user UUID and are executable only by service_role.

create extension if not exists pgcrypto;

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
  share_learning_notes boolean not null default false,
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
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists "Read own profile only" on public.profiles;
create policy "Read own profile only" on public.profiles
for select to authenticated using (auth.uid()=id);

-- Client users cannot directly change subscription, quotas, role or billing fields.
revoke insert,update,delete on public.profiles from anon,authenticated;

create or replace function public.consume_ai_credit(p_user_id uuid)
returns table(allowed boolean,remaining integer,reason text,plan text)
language plpgsql security definer set search_path = ''
as $$
declare p public.profiles%rowtype; lim integer;
begin
 if p_user_id is null then return query select false,0,'missing_user'::text,'free'::text; return; end if;
 select * into p from public.profiles where id=p_user_id for update;
 if not found then return query select false,0,'profile_missing'::text,'free'::text; return; end if;
 if p.usage_month < date_trunc('month',now())::date then p.monthly_used:=0; end if;
 lim:=case when p.plan='pro' and p.subscription_status in ('active','trialing') then 300 else 10 end;
 if p.monthly_used>=lim then return query select false,0,'monthly_limit_reached'::text,p.plan; return; end if;
 update public.profiles set monthly_used=p.monthly_used+1,monthly_limit=lim,usage_month=date_trunc('month',now())::date,updated_at=now() where id=p_user_id;
 return query select true,lim-(p.monthly_used+1),'ok'::text,p.plan;
end;
$$;

create or replace function public.refund_ai_credit(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 update public.profiles set monthly_used=greatest(monthly_used-1,0),updated_at=now()
 where id=p_user_id and usage_month=date_trunc('month',now())::date;
end;
$$;

create or replace function public.consume_voice_credit(p_user_id uuid)
returns table(allowed boolean,remaining integer,reason text)
language plpgsql security definer set search_path = ''
as $$
declare p public.profiles%rowtype; lim integer:=10;
begin
 if p_user_id is null then return query select false,0,'missing_user'::text; return; end if;
 select * into p from public.profiles where id=p_user_id for update;
 if not found or p.plan<>'pro' or p.subscription_status not in ('active','trialing') then
  return query select false,0,'paid_membership_required'::text; return;
 end if;
 if p.voice_usage_month<date_trunc('month',now())::date then p.voice_sessions_used:=0; end if;
 if p.voice_sessions_used>=lim then return query select false,0,'monthly_voice_limit_reached'::text; return; end if;
 update public.profiles set voice_sessions_used=p.voice_sessions_used+1,voice_usage_month=date_trunc('month',now())::date,updated_at=now() where id=p_user_id;
 return query select true,lim-(p.voice_sessions_used+1),'ok'::text;
end;
$$;

create or replace function public.refund_voice_credit(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 update public.profiles set voice_sessions_used=greatest(voice_sessions_used-1,0),updated_at=now()
 where id=p_user_id and voice_usage_month=date_trunc('month',now())::date;
end;
$$;

revoke all on function public.consume_ai_credit(uuid) from public,anon,authenticated;
revoke all on function public.refund_ai_credit(uuid) from public,anon,authenticated;
revoke all on function public.consume_voice_credit(uuid) from public,anon,authenticated;
revoke all on function public.refund_voice_credit(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_credit(uuid) to service_role;
grant execute on function public.refund_ai_credit(uuid) to service_role;
grant execute on function public.consume_voice_credit(uuid) to service_role;
grant execute on function public.refund_voice_credit(uuid) to service_role;

-- Configure the server-only TEACHER_EMAILS environment variable to allow Sara's verified login email to access /teacher.
-- No client-editable teacher-role field is present in this starter schema.


-- Optional teacher-reviewed progress notes: no learner chat transcripts or audio are stored.
create table if not exists public.learning_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track text not null check (track in ('cambridge','business')),
  scenario text not null,
  level text not null check (level in ('A2','B1','B2','C1')),
  note text not null check (char_length(note) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists learning_notes_user_created_idx on public.learning_notes(user_id,created_at desc);

alter table public.learning_notes enable row level security;
revoke all on public.learning_notes from anon;
grant select on public.learning_notes to authenticated;
grant all on public.learning_notes to service_role;
drop policy if exists "Learners can read their own progress notes" on public.learning_notes;
create policy "Learners can read their own progress notes" on public.learning_notes
for select to authenticated using (auth.uid()=user_id);
revoke insert,update,delete on public.learning_notes from anon,authenticated;

create or replace function public.set_learning_notes_consent(p_user_id uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare changed boolean;
begin
 update public.profiles set share_learning_notes=p_enabled,updated_at=now() where id=p_user_id;
 changed:=found;
 if changed and not p_enabled then
  delete from public.learning_notes where user_id=p_user_id;
 end if;
 return changed;
end;
$$;

create or replace function public.save_learning_note(p_user_id uuid,p_track text,p_scenario text,p_level text,p_note text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare opted_in boolean;
begin
 select share_learning_notes into opted_in from public.profiles where id=p_user_id;
 if not coalesce(opted_in,false) then return false; end if;
 if p_track not in ('cambridge','business') or p_level not in ('A2','B1','B2','C1')
    or char_length(coalesce(p_note,'')) not between 1 and 300 then return false; end if;
 insert into public.learning_notes(user_id,track,scenario,level,note)
 values(p_user_id,p_track,p_scenario,p_level,left(trim(p_note),300));
 delete from public.learning_notes
 where user_id=p_user_id and id not in (
   select id from public.learning_notes where user_id=p_user_id order by created_at desc limit 100
 );
 return true;
end;
$$;

revoke all on function public.set_learning_notes_consent(uuid,boolean) from public,anon,authenticated;
revoke all on function public.save_learning_note(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.set_learning_notes_consent(uuid,boolean) to service_role;
grant execute on function public.save_learning_note(uuid,text,text,text,text) to service_role;
