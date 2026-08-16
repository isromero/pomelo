begin;

select plan(31);

select has_table('public', 'moments', 'Moment storage exists');
select has_table('public', 'contributions', 'Contribution storage exists');
select has_table('public', 'memories', 'Memory storage exists');
select has_column('public', 'prompt_concepts', 'response_type', 'Prompts declare their response shape');
select has_column('public', 'prompt_concepts', 'response_options', 'Choice Prompts store their options');

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
  ('00000000-0000-0000-0000-000000000000', '50000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'moment-one@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '50000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'moment-two@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now());

update public.profiles
set avatar_key = case id
    when '50000000-0000-4000-8000-000000000001' then 'calm'
    else 'affectionate'
  end,
  birth_date = date '1992-11-07',
  locale = case id
    when '50000000-0000-4000-8000-000000000001' then 'es'
    else 'en'
  end;

create temporary table moment_test_results (
  label text primary key,
  payload jsonb not null
);
grant all on table moment_test_results to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
insert into moment_test_results values (
  'pair',
  public.create_pair_with_invitation(date '2021-06-12')
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
insert into moment_test_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from moment_test_results where label = 'pair')
  )
);

select is(
  (select payload ->> 'status' from moment_test_results where label = 'accepted'),
  'active',
  'accepting the Invitation activates the Pair for the Moment slice'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
insert into moment_test_results values ('first', public.get_daily_moment());
insert into moment_test_results values ('first-again', public.get_daily_moment());

select is(
  (select payload ->> 'status' from moment_test_results where label = 'first'),
  'open',
  'the first daily Moment starts open'
);
select is(
  (select payload ->> 'isFree' from moment_test_results where label = 'first'),
  'true',
  'the first Moment is marked free'
);
select is(
  (select payload #>> '{prompt,conceptKey}' from moment_test_results where label = 'first'),
  'small_gesture_smile',
  'the first Moment uses the designed Prompt'
);
select is(
  (select payload #>> '{prompt,responseType}' from moment_test_results where label = 'first'),
  'text',
  'the designed Prompt accepts short text'
);
select is(
  (select payload ->> 'id' from moment_test_results where label = 'first-again'),
  (select payload ->> 'id' from moment_test_results where label = 'first'),
  'a Pair receives one Moment for its local day'
);
select is(
  (select count(*)::integer from public.moments),
  1,
  'the daily uniqueness constraint prevents duplicate Moments'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
insert into moment_test_results values ('partner-first', public.get_daily_moment());
select is(
  (select payload #>> '{prompt,text}' from moment_test_results where label = 'partner-first'),
  'What small thing your partner did made you smile this week?',
  'both members receive the same Prompt concept in their own Locale'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
insert into moment_test_results values (
  'submitted-one',
  public.submit_question_contribution(
    ((select payload ->> 'id' from moment_test_results where label = 'first'))::uuid,
    'El café que dejaste preparado.',
    null
  )
);

select is(
  (select payload ->> 'status' from moment_test_results where label = 'submitted-one'),
  'partially_submitted',
  'one Contribution leaves the Moment partially submitted'
);
select is(
  (select count(*)::integer from public.contributions),
  1,
  'the submitting User has one saved Contribution'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.contributions),
  0,
  'RLS hides the other User Contribution before Reveal'
);
insert into moment_test_results values ('partner-hidden', public.get_daily_moment());
select is(
  (select payload #>> '{partner,submitted}' from moment_test_results where label = 'partner-hidden'),
  'true',
  'the partner can see that a response is ready without seeing its contents'
);
select ok(
  (select payload #> '{partner,contribution}' from moment_test_results where label = 'partner-hidden') = 'null'::jsonb,
  'the partner response remains absent from the pre-Reveal contract'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
insert into moment_test_results values (
  'submitted-two',
  public.submit_question_contribution(
    ((select payload ->> 'id' from moment_test_results where label = 'first'))::uuid,
    'When you made dinner after a long day.',
    null
  )
);
select is(
  (select payload ->> 'status' from moment_test_results where label = 'submitted-two'),
  'ready',
  'the Moment becomes ready only after both Contributions exist'
);
select is(
  (select payload #>> '{ownContribution,responseText}' from moment_test_results where label = 'submitted-two'),
  'When you made dinner after a long day.',
  'the submitting User sees their saved Contribution'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
insert into moment_test_results values (
  'revealed',
  public.reveal_moment(((select payload ->> 'id' from moment_test_results where label = 'first'))::uuid)
);

select is(
  (select payload ->> 'status' from moment_test_results where label = 'revealed'),
  'revealed',
  'either member can trigger Reveal'
);
select is(
  (select count(*)::integer from public.memories),
  1,
  'Reveal creates exactly one Memory'
);
select is(
  (select payload #>> '{partner,contribution,responseText}' from moment_test_results where label = 'revealed'),
  'El café que dejaste preparado.',
  'Reveal returns the other Contribution only after the transition'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
insert into moment_test_results values (
  'revealed-again',
  public.reveal_moment(((select payload ->> 'id' from moment_test_results where label = 'first'))::uuid)
);
select is(
  (select payload ->> 'memoryId' from moment_test_results where label = 'revealed-again'),
  (select payload ->> 'memoryId' from moment_test_results where label = 'revealed'),
  'Reveal is idempotent for a retry from the other client'
);
select is(
  (select count(*)::integer from public.memories),
  1,
  'concurrent-style Reveal retries do not duplicate the Memory'
);
select is(
  (select pom_state from public.memories limit 1),
  'celebrating',
  'the Memory stores the planned Pom state'
);

insert into moment_test_results values ('history-one', public.get_memory_history());
select is(
  jsonb_array_length((select payload from moment_test_results where label = 'history-one')),
  1,
  'History contains the revealed Memory'
);
select is(
  (select payload #>> '{0,prompt,text}' from moment_test_results where label = 'history-one'),
  '¿Qué pequeño gesto de tu pareja te hizo sonreír esta semana?',
  'History preserves the Prompt in the reader Locale'
);
select is(
  (select payload #>> '{0,partner,contribution,responseText}' from moment_test_results where label = 'history-one'),
  'When you made dinner after a long day.',
  'History includes both revealed Contributions'
);

reset role;
insert into public.prompt_concepts (
  concept_key,
  format,
  prompt_es,
  prompt_en,
  response_type,
  response_options,
  active
) values (
  'weekend_choice',
  'question',
  '¿Qué plan elegirías?',
  'Which plan would you choose?',
  'choice',
  '["A", "B", "C"]'::jsonb,
  true
);

insert into public.moments (
  pair_id,
  prompt_concept_key,
  format,
  local_date
) values (
  ((select payload ->> 'id' from moment_test_results where label = 'accepted'))::uuid,
  'weekend_choice',
  'question',
  current_date - 1
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
insert into moment_test_results values (
  'choice-one',
  public.submit_question_contribution(
    (select id from public.moments where prompt_concept_key = 'weekend_choice'),
    null,
    'A'
  )
);

select is(
  (select payload ->> 'status' from moment_test_results where label = 'choice-one'),
  'partially_submitted',
  'a Question Prompt can accept one choice'
);

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
insert into moment_test_results values (
  'choice-invalid',
  public.submit_question_contribution(
    (select id from public.moments where prompt_concept_key = 'weekend_choice'),
    null,
    'D'
  )
);
select is(
  (select payload ->> 'error' from moment_test_results where label = 'choice-invalid'),
  'invalid_response',
  'a Question Prompt rejects choices outside its A/B/C options'
);

select * from finish();
rollback;
