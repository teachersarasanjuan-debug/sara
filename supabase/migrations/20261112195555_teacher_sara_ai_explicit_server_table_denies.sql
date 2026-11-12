-- These tables are only read/written by trusted Edge Functions with service_role.
-- Explicit deny policies document that anon/authenticated clients have no access.
drop policy if exists "deny_client_access_billing_customers" on public.billing_customers;
create policy "deny_client_access_billing_customers" on public.billing_customers
  for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny_client_access_ai_usage_monthly" on public.ai_usage_monthly;
create policy "deny_client_access_ai_usage_monthly" on public.ai_usage_monthly
  for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny_client_access_ai_voice_usage_monthly" on public.ai_voice_usage_monthly;
create policy "deny_client_access_ai_voice_usage_monthly" on public.ai_voice_usage_monthly
  for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny_client_access_stripe_webhook_events" on public.stripe_webhook_events;
create policy "deny_client_access_stripe_webhook_events" on public.stripe_webhook_events
  for all to anon, authenticated using (false) with check (false);
