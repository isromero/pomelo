begin;

select plan(13);

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
  ('00000000-0000-0000-0000-000000000000', '70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'unlink-one@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'unlink-two@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now());

update public.profiles
set avatar_key = case id
    when '70000000-0000-4000-8000-000000000001' then 'calm'
    else 'affectionate'
  end,
  birth_date = date '1992-11-07';

create temporary table premium_unlink_results (
  label text primary key,
  payload jsonb not null
);
grant all on table premium_unlink_results to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values (
  'pair',
  public.create_pair_with_invitation(date '2021-06-12')
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
insert into premium_unlink_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from premium_unlink_results where label = 'pair')
  )
);
select is(
  (select payload ->> 'status' from premium_unlink_results where label = 'accepted'),
  'active',
  'the Pair is active before the unlink scenario'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values ('moment', public.get_daily_moment());
insert into premium_unlink_results values (
  'own-contribution',
  public.submit_question_contribution(
    ((select payload ->> 'id' from premium_unlink_results where label = 'moment'))::uuid,
    'El cafe que dejaste preparado.',
    null
  )
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
insert into premium_unlink_results values (
  'partner-contribution',
  public.submit_question_contribution(
    ((select payload ->> 'id' from premium_unlink_results where label = 'moment'))::uuid,
    'When you made dinner after a long day.',
    null
  )
);
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values (
  'revealed',
  public.reveal_moment(((select payload ->> 'id' from premium_unlink_results where label = 'moment'))::uuid)
);

reset role;
set local role service_role;
insert into premium_unlink_results values (
  'purchase',
  public.process_revenuecat_webhook(
    jsonb_build_object(
      'event', jsonb_build_object(
        'id', 'premium-unlink-event-1',
        'type', 'INITIAL_PURCHASE',
        'app_user_id', '70000000-0000-4000-8000-000000000001',
        'product_id', 'pomelo_annual',
        'store', 'APP_STORE',
        'event_timestamp_ms', (extract(epoch from clock_timestamp()) * 1000)::bigint,
        'expiration_at_ms', (extract(epoch from clock_timestamp() + interval '30 days') * 1000)::bigint
      )
    )
  )
);
select is(
  (select payload ->> 'status' from premium_unlink_results where label = 'purchase'),
  'processed',
  'the Subscriber receives an active entitlement'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values ('before-unlink', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_unlink_results where label = 'before-unlink'),
  'premium',
  'the Subscriber has Premium before unlinking'
);

insert into premium_unlink_results values ('unlinked', public.dissolve_pair());
select is(
  (select payload ->> 'status' from premium_unlink_results where label = 'unlinked'),
  'archived',
  'unlinking archives the former Pair'
);

reset role;
select is(
  (
    select status
    from public.pairs
    where id = ((select payload ->> 'id' from premium_unlink_results where label = 'pair'))::uuid
  ),
  'archived',
  'the former Pair remains archived'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values ('subscriber-unlinked', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_unlink_results where label = 'subscriber-unlinked'),
  'archive',
  'the archived Pair is no longer Premium for the Subscriber'
);
select is(
  (select payload #>> '{entitlement,status}' from premium_unlink_results where label = 'subscriber-unlinked'),
  'active',
  'the entitlement remains owned by the Subscriber after unlinking'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
insert into premium_unlink_results values ('partner-unlinked', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_unlink_results where label = 'partner-unlinked'),
  'archive',
  'the former partner keeps the archived history without Premium'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values (
  'replacement',
  public.create_pair_with_invitation(date '2022-03-04')
);
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
insert into premium_unlink_results values (
  'replacement-accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from premium_unlink_results where label = 'replacement')
  )
);
select is(
  (select payload ->> 'status' from premium_unlink_results where label = 'replacement-accepted'),
  'active',
  'the Subscriber can form a new active Pair'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
insert into premium_unlink_results values ('replacement-subscriber', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_unlink_results where label = 'replacement-subscriber'),
  'premium',
  'Premium follows the Subscriber onto the replacement Pair'
);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
insert into premium_unlink_results values ('replacement-partner', public.get_premium_state());
select is(
  (select payload ->> 'access' from premium_unlink_results where label = 'replacement-partner'),
  'premium',
  'the replacement partner receives projected Premium'
);

select * from finish();
rollback;
