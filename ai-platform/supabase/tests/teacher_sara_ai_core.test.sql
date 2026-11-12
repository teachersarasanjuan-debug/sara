begin;
select plan(7);

select has_table('public','learning_sessions','learning_sessions table exists');
select is(
  (select relrowsecurity from pg_class where oid='public.learning_sessions'::regclass),
  true,
  'learning_sessions has row level security enabled'
);
select is(
  (select relrowsecurity from pg_class where oid='public.subscriptions'::regclass),
  true,
  'subscriptions has row level security enabled'
);
select ok(
  has_table_privilege('authenticated','public.learning_sessions','SELECT'),
  'authenticated users can read the table subject to ownership RLS'
);
select ok(
  not has_table_privilege('authenticated','public.subscriptions','UPDATE'),
  'authenticated users cannot update subscription records'
);
select ok(
  not has_table_privilege('anon','public.learning_sessions','SELECT'),
  'anonymous users cannot read learning sessions'
);
select ok(
  not has_function_privilege('anon','public.consume_ai_quota(date,integer)','EXECUTE'),
  'anonymous users cannot consume authenticated usage quota'
);

select * from finish();
rollback;
