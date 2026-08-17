begin;

select plan(22);

select has_table('public', 'pair_streaks', 'Pair Streak storage exists');
select has_table('public', 'streak_completions', 'Streak completion idempotency storage exists');
select has_column('public', 'moments', 'normal_expires_at', 'Moments store the normal deadline');
select has_column('public', 'moments', 'recovery_expires_at', 'Moments store the recovery deadline');

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
  ('00000000-0000-0000-0000-000000000000', '80000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'lifecycle-one@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '80000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'lifecycle-two@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '80000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'lifecycle-third@example.test', '', now(), '{}', '{"display_name":"Alex"}', now(), now());

update public.profiles
set avatar_key = case
    when id = '80000000-0000-4000-8000-000000000001' then 'calm'
    else 'affectionate'
  end,
  birth_date = case
    when id = '80000000-0000-4000-8000-000000000001' then date '1900-11-07'
    else date '1900-12-04'
  end;

create temporary table lifecycle_test_results (
  label text primary key,
  payload jsonb not null
);
grant all on table lifecycle_test_results to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into lifecycle_test_results values (
  'pair',
  public.create_pair_with_invitation(date '2021-06-12')
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into lifecycle_test_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from lifecycle_test_results where label = 'pair')
  )
);

select is(
  (select payload ->> 'status' from lifecycle_test_results where label = 'accepted'),
  'active',
  'the test Pair is active'
);
select is(
  (select payload #>> '{members,0,birthDate}' from lifecycle_test_results where label = 'accepted'),
  '1900-11-07',
  'Pair state includes the member birth date'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into lifecycle_test_results values ('first', public.get_daily_moment());
select ok(
  (select payload ->> 'normalExpiresAt' from lifecycle_test_results where label = 'first') is not null,
  'a Moment returns its normal deadline'
);
select ok(
  (select (payload ->> 'recoveryExpiresAt')::timestamptz > (payload ->> 'normalExpiresAt')::timestamptz
   from lifecycle_test_results where label = 'first'),
  'the recovery deadline follows the normal deadline'
);

reset role;
update public.pairs
set time_zone = 'America/Los_Angeles'
where id = ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid;
select ok(
  (select normal_expires_at = timestamptz '2026-08-17 07:00:00+00'
   from public.moment_deadlines_for_pair(
     ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid,
     date '2026-08-16'
   )),
  'deadline calculations follow the Pair timezone'
);

reset role;
update public.moments
set normal_expires_at = now() + interval '1 hour',
    recovery_expires_at = now() + interval '2 hours'
where id = ((select payload ->> 'id' from lifecycle_test_results where label = 'first'))::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into lifecycle_test_results values (
  'one-sided',
  public.submit_question_contribution(
    ((select payload ->> 'id' from lifecycle_test_results where label = 'first'))::uuid,
    'A response saved once.',
    null
  )
);
select is(
  (select payload ->> 'status' from lifecycle_test_results where label = 'one-sided'),
  'partially_submitted',
  'one Contribution does not complete the Moment'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into lifecycle_test_results values (
  'ready',
  public.submit_question_contribution(
    ((select payload ->> 'id' from lifecycle_test_results where label = 'first'))::uuid,
    'The second response.',
    null
  )
);
select is(
  (select payload ->> 'status' from lifecycle_test_results where label = 'ready'),
  'ready',
  'both Contributions complete the Moment'
);
select is(
  (select current_count from public.pair_streaks limit 1),
  1,
  'the Pair Streak advances once when both members complete'
);
reset role;
select is(
  (select count(*)::integer from public.streak_completions),
  1,
  'the completion event is idempotent storage'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into lifecycle_test_results values (
  'retry',
  public.submit_question_contribution(
    ((select payload ->> 'id' from lifecycle_test_results where label = 'first'))::uuid,
    'A changed response must not replace the first one.',
    null
  )
);
select is(
  (select payload #>> '{ownContribution,responseText}' from lifecycle_test_results where label = 'retry'),
  'A response saved once.',
  'a repeated Contribution request keeps the original response'
);
reset role;
select is(
  (select count(*)::integer from public.contributions),
  2,
  'a repeated Contribution request does not duplicate a row'
);

update public.moments
set normal_expires_at = now() - interval '2 days',
    recovery_expires_at = now() - interval '1 day'
where id = ((select payload ->> 'id' from lifecycle_test_results where label = 'first'))::uuid;

reset role;
create temporary table lifecycle_ready_moment (id uuid);
insert into public.moments (
  pair_id,
  prompt_concept_key,
  format,
  local_date,
  status
) values (
  ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid,
  'small_gesture_smile',
  'question',
  current_date - 2,
  'partially_submitted'
);
update public.moments
set normal_expires_at = now() - interval '2 days',
    recovery_expires_at = now() - interval '1 day'
where pair_id = ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid
  and local_date = current_date - 2;
insert into public.contributions (moment_id, user_id, response_text)
select id, '80000000-0000-4000-8000-000000000001', 'Expired private response.'
from public.moments
where pair_id = ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid
  and local_date = current_date - 2;
select is(
  (select status from public.moments where local_date = current_date - 2 limit 1),
  'partially_submitted',
  'an incomplete Moment starts as partially submitted before expiry is evaluated'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into lifecycle_test_results values ('after-expiry', public.get_daily_moment());
select is(
  (select payload ->> 'id' from lifecycle_test_results where label = 'after-expiry'),
  (select payload ->> 'id' from lifecycle_test_results where label = 'first'),
  'a completed Moment remains available for Reveal after its recovery deadline'
);
select is(
  (select status from public.moments where local_date = current_date - 2 limit 1),
  'expired_incomplete',
  'an incomplete Moment becomes stably expired'
);
select is(
  (select count(*)::integer from public.memories),
  0,
  'an expired one-sided Moment never creates a Memory'
);

reset role;
insert into public.moments (
  pair_id,
  prompt_concept_key,
  format,
  local_date,
  status
) values (
  ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid,
  'small_gesture_smile',
  'question',
  current_date + 2,
  'ready'
);
insert into lifecycle_ready_moment
select id
from public.moments
where pair_id = ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid
  and local_date = current_date + 2;

select public.record_pair_streak_completion(
  ((select payload ->> 'id' from lifecycle_test_results where label = 'pair'))::uuid,
  (select id from lifecycle_ready_moment),
  (select (payload ->> 'localDate')::date + 2 from lifecycle_test_results where label = 'first')
);
select is(
  (select current_count from public.pair_streaks limit 1),
  2,
  'the single free Streak recovery protects one missed local day'
);
select is(
  (select recovery_uses from public.pair_streaks limit 1),
  1,
  'Streak recovery is consumed once and cannot duplicate'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into lifecycle_test_results values ('unlinked', public.dissolve_pair());
select is(
  (select payload ->> 'status' from lifecycle_test_results where label = 'unlinked'),
  'archived',
  'unlinking archives the Pair'
);
select * from finish();
rollback;
