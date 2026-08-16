begin;

select plan(18);

select has_table('public', 'premium_subscriptions', 'Premium subscription storage exists');
select has_table('public', 'premium_webhook_events', 'RevenueCat webhook storage exists');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'premium-one@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'premium-two@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now());

update public.profiles
set avatar_key = case id
    when '60000000-0000-4000-8000-000000000001' then 'calm'
    else 'affectionate'
  end,
  birth_date = date '1992-11-07';

create temporary table premium_test_results (
  label text primary key,
  payload jsonb not null
);
grant all on table premium_test_results to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values (
  'pair',
  public.create_pair_with_invitation(date '2021-06-12')
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into premium_test_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from premium_test_results where label = 'pair')
  )
);

select is(
  (select payload ->> 'status' from premium_test_results where label = 'accepted'),
  'active',
  'the test Pair is active before Premium'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('first', public.get_daily_moment());
select is(
  (select payload ->> 'isFree' from premium_test_results where label = 'first'),
  'true',
  'the first Moment remains free'
);

reset role;
update public.moments
set local_date = local_date - 1
where id = ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid;
update public.moments
set normal_expires_at = now() + interval '1 day',
    recovery_expires_at = now() + interval '2 days'
where id = ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('incomplete-retry', public.get_daily_moment());
select is(
  (select payload ->> 'isFree' from premium_test_results where label = 'incomplete-retry'),
  'true',
  'the free allowance remains available until the first Reveal'
);

reset role;
update public.moments
set local_date = local_date - 1
where id = ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid;
update public.moments
set normal_expires_at = now() + interval '1 day',
    recovery_expires_at = now() + interval '2 days'
where id = ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid;
update premium_test_results
set payload = (select payload from premium_test_results where label = 'incomplete-retry')
where label = 'first';

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values (
  'submitted-one',
  public.submit_question_contribution(
    ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid,
    'El café que dejaste preparado.',
    null
  )
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into premium_test_results values (
  'submitted-two',
  public.submit_question_contribution(
    ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid,
    'When you made dinner after a long day.',
    null
  )
);
insert into premium_test_results values (
  'revealed',
  public.reveal_moment(((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid)
);
select is(
  (select payload ->> 'status' from premium_test_results where label = 'revealed'),
  'revealed',
  'the free Reveal succeeds before any purchase'
);
select is(
  (select count(*)::integer from public.memories),
  1,
  'the first Memory survives the Premium boundary'
);

reset role;
update public.moments
set local_date = local_date - 1
where id = ((select payload ->> 'id' from premium_test_results where label = 'first'))::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('free-access', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_test_results where label = 'free-access'),
  'archive',
  'a Pair without Premium enters Archive Mode after its first Memory'
);
insert into premium_test_results values ('blocked', public.get_daily_moment());
select is(
  (select payload ->> 'error' from premium_test_results where label = 'blocked'),
  'premium_required',
  'the next Moment is blocked without Premium'
);

reset role;
set local role service_role;
insert into premium_test_results values (
  'purchase',
  public.process_revenuecat_webhook(
    jsonb_build_object(
      'event', jsonb_build_object(
        'id', 'premium-event-1',
        'type', 'INITIAL_PURCHASE',
        'app_user_id', '60000000-0000-4000-8000-000000000001',
        'product_id', 'pomelo_annual',
        'store', 'APP_STORE',
        'event_timestamp_ms', (extract(epoch from clock_timestamp()) * 1000)::bigint,
        'expiration_at_ms', (extract(epoch from clock_timestamp() + interval '30 days') * 1000)::bigint
      )
    )
  )
);
select is(
  (select payload ->> 'status' from premium_test_results where label = 'purchase'),
  'processed',
  'the first RevenueCat event projects a Subscriber'
);

insert into premium_test_results values (
  'duplicate',
  public.process_revenuecat_webhook(
    jsonb_build_object(
      'event', jsonb_build_object(
        'id', 'premium-event-1',
        'type', 'INITIAL_PURCHASE',
        'app_user_id', '60000000-0000-4000-8000-000000000001',
        'event_timestamp_ms', (extract(epoch from clock_timestamp()) * 1000)::bigint
      )
    )
  )
);
select is(
  (select payload ->> 'status' from premium_test_results where label = 'duplicate'),
  'duplicate',
  'a duplicate RevenueCat event is idempotent'
);

insert into premium_test_results values (
  'old-cancellation',
  public.process_revenuecat_webhook(
    jsonb_build_object(
      'event', jsonb_build_object(
        'id', 'premium-event-old',
        'type', 'CANCELLATION',
        'app_user_id', '60000000-0000-4000-8000-000000000001',
        'event_timestamp_ms', (extract(epoch from clock_timestamp() - interval '1 day') * 1000)::bigint
      )
    )
  )
);
select is(
  (select payload ->> 'reason' from premium_test_results where label = 'old-cancellation'),
  'out_of_order',
  'an older event cannot revoke a newer entitlement'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('subscriber-access', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_test_results where label = 'subscriber-access'),
  'premium',
  'the Subscriber receives Premium on the active Pair'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into premium_test_results values ('partner-access', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_test_results where label = 'partner-access'),
  'premium',
  'the partner receives projected Premium without buying'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('next-moment', public.get_daily_moment());
select is(
  (select payload ->> 'status' from premium_test_results where label = 'next-moment'),
  'open',
  'Premium allows the next Moment to be generated'
);

reset role;
set local role service_role;
insert into premium_test_results values (
  'cancellation',
  public.process_revenuecat_webhook(
    jsonb_build_object(
      'event', jsonb_build_object(
        'id', 'premium-event-2',
        'type', 'CANCELLATION',
        'app_user_id', '60000000-0000-4000-8000-000000000001',
        'event_timestamp_ms', (extract(epoch from clock_timestamp() + interval '1 minute') * 1000)::bigint,
        'expiration_at_ms', (extract(epoch from clock_timestamp() + interval '30 days') * 1000)::bigint
      )
    )
  )
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('cancelled-access', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_test_results where label = 'cancelled-access'),
  'premium',
  'cancellation preserves access until the paid period ends'
);
select is(
  (select payload #>> '{entitlement,status}' from premium_test_results where label = 'cancelled-access'),
  'cancelled',
  'cancellation remains visible in the entitlement state'
);

reset role;
set local role service_role;
select public.process_revenuecat_webhook(
  jsonb_build_object(
    'event', jsonb_build_object(
      'id', 'premium-event-3',
      'type', 'EXPIRATION',
      'app_user_id', '60000000-0000-4000-8000-000000000001',
      'event_timestamp_ms', (extract(epoch from clock_timestamp() + interval '2 minutes') * 1000)::bigint
    )
  )
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into premium_test_results values ('expired-access', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_test_results where label = 'expired-access'),
  'archive',
  'expiry returns the Pair to Archive Mode without deleting Memories'
);

select * from finish();
rollback;
