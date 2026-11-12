-- Restore one monthly practice credit if moderation/provider/network work fails after reservation.
create or replace function public.refund_ai_credit(
  p_user_id uuid,
  p_month_start date
)
returns void
language sql
set search_path = public
as $$
  update public.ai_usage_monthly
  set request_count = greatest(request_count - 1, 0),
      updated_at = now()
  where user_id = p_user_id
    and month_start = p_month_start;
$$;

revoke all on function public.refund_ai_credit(uuid, date) from public, anon, authenticated;
grant execute on function public.refund_ai_credit(uuid, date) to service_role;
