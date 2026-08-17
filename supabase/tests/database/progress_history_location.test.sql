begin;

select plan(31);

select has_table('public', 'pair_progress', 'Pair-scoped Pom Progress exists');
select has_table('public', 'memory_locations', 'Memory locations exist');
select has_column('public', 'contributions', 'removed_at', 'Contributions record privacy removal');

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
  ('00000000-0000-0000-0000-000000000000', '80000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'progress-one@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '80000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'progress-two@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '80000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'progress-outsider@example.test', '', now(), '{}', '{"display_name":"Alex"}', now(), now());

update public.profiles
set avatar_key = case id
    when '80000000-0000-4000-8000-000000000001' then 'calm'
    when '80000000-0000-4000-8000-000000000002' then 'affectionate'
    else 'surprised'
  end,
  birth_date = date '1992-11-07';

create temporary table progress_history_results (
  label text primary key,
  payload jsonb not null
);
grant all on table progress_history_results to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values (
  'pair',
  public.create_pair_with_invitation(date '2021-06-12')
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into progress_history_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from progress_history_results where label = 'pair')
  )
);
select is(
  (select payload ->> 'status' from progress_history_results where label = 'accepted'),
  'active',
  'the test Pair activates with two members'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values ('first', public.get_daily_moment());
insert into progress_history_results values (
  'first-own',
  public.submit_question_contribution(
    ((select payload ->> 'id' from progress_history_results where label = 'first'))::uuid,
    'El cafe que dejaste preparado.',
    null
  )
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into progress_history_results values (
  'first-partner',
  public.submit_question_contribution(
    ((select payload ->> 'id' from progress_history_results where label = 'first'))::uuid,
    'When you made dinner after a long day.',
    null
  )
);
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values (
  'first-reveal',
  public.reveal_moment(((select payload ->> 'id' from progress_history_results where label = 'first'))::uuid)
);
select is(
  (select payload ->> 'status' from progress_history_results where label = 'first-reveal'),
  'revealed',
  'the first completed Moment creates a revealed Memory'
);
reset role;
select is(
  (select memory_count from public.pair_progress where pair_id = (select payload ->> 'id' from progress_history_results where label = 'accepted')::uuid),
  1,
  'the first revealed Memory increments Pair Progress once'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values ('progress-one', public.get_pom_progress());
select is(
  (select payload ->> 'memoryCount' from progress_history_results where label = 'progress-one'),
  '1',
  'Pom Progress reports one revealed Memory'
);
insert into progress_history_results values (
  'first-retry',
  public.reveal_moment(((select payload ->> 'id' from progress_history_results where label = 'first'))::uuid)
);
reset role;
select is(
  (select memory_count from public.pair_progress where pair_id = (select payload ->> 'id' from progress_history_results where label = 'accepted')::uuid),
  1,
  'repeating Reveal does not increment Progress again'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values ('ribbon-locked', public.set_pom_accessory('ribbon'));
select is(
  (select payload ->> 'error' from progress_history_results where label = 'ribbon-locked'),
  'accessory_locked',
  'the first Memory does not unlock the second-Memory accessory early'
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
  'progress_second_memory',
  'question',
  '¿Qué plan os apetece?',
  'What plan sounds good?',
  'text',
  '[]'::jsonb,
  true
);
insert into public.moments (
  pair_id,
  prompt_concept_key,
  format,
  local_date,
  normal_expires_at,
  recovery_expires_at
) values (
  (select payload ->> 'id' from progress_history_results where label = 'accepted')::uuid,
  'progress_second_memory',
  'question',
  current_date - 1,
  now() + interval '1 day',
  now() + interval '2 days'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values (
  'second-own',
  public.submit_question_contribution(
    (select id from public.moments where prompt_concept_key = 'progress_second_memory'),
    'Un paseo.',
    null
  )
);
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into progress_history_results values (
  'second-partner',
  public.submit_question_contribution(
    (select id from public.moments where prompt_concept_key = 'progress_second_memory'),
    'A quiet meal.',
    null
  )
);
insert into progress_history_results values (
  'second-reveal',
  public.reveal_moment((select id from public.moments where prompt_concept_key = 'progress_second_memory'))
);
select is(
  (select payload ->> 'status' from progress_history_results where label = 'second-reveal'),
  'revealed',
  'a second Question Memory also completes the same Progress path'
);
insert into progress_history_results values ('progress-two', public.get_pom_progress());
select is(
  (select payload ->> 'memoryCount' from progress_history_results where label = 'progress-two'),
  '2',
  'Pom Progress counts each revealed format once'
);
insert into progress_history_results values ('ribbon-equipped', public.set_pom_accessory('ribbon'));
select is(
  (select payload ->> 'equippedAccessory' from progress_history_results where label = 'ribbon-equipped'),
  'ribbon',
  'the unlocked accessory can be equipped'
);
insert into progress_history_results values ('crown-locked', public.set_pom_accessory('crown'));
select is(
  (select payload ->> 'error' from progress_history_results where label = 'crown-locked'),
  'accessory_locked',
  'a later accessory remains locked until its milestone'
);

insert into progress_history_results values (
  'located',
  public.set_memory_location(
    (select id from public.memories where moment_id = (select payload ->> 'id' from progress_history_results where label = 'first')::uuid),
    'Barcelona',
    'ES'
  )
);
select is(
  (select payload #>> '{location,city}' from progress_history_results where label = 'located'),
  'Barcelona',
  'a Memory stores an optional approximate city'
);
insert into progress_history_results values ('map-one', public.get_memory_map());
select is(
  jsonb_array_length((select payload from progress_history_results where label = 'map-one')),
  1,
  'Map contains only Memories with a current location'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into progress_history_results values (
  'location-removed',
  public.remove_memory_location(
    (select id from public.memories where moment_id = (select payload ->> 'id' from progress_history_results where label = 'first')::uuid)
  )
);
select is(
  (select payload -> 'location' from progress_history_results where label = 'location-removed'),
  'null'::jsonb,
  'a Pair member can remove the approximate city'
);
insert into progress_history_results values ('map-empty', public.get_memory_map());
select is(
  jsonb_array_length((select payload from progress_history_results where label = 'map-empty')),
  0,
  'removing a city removes the Memory from Map'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values (
  'contribution-removed',
  public.remove_own_contribution(
    (select id from public.contributions where moment_id = (select payload ->> 'id' from progress_history_results where label = 'first')::uuid and user_id = '80000000-0000-4000-8000-000000000001')
  )
);
select is(
  (select payload #>> '{ownContribution,available}' from progress_history_results where label = 'contribution-removed'),
  'false',
  'a User can remove only their own Contribution'
);
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into progress_history_results values ('partner-history', public.get_memory_history());
select is(
  (
    select item #>> '{ownContribution,available}'
    from jsonb_array_elements((select payload from progress_history_results where label = 'partner-history')) as item
    where item ->> 'momentId' = (select payload ->> 'id' from progress_history_results where label = 'first')
  ),
  'true',
  'the partner still sees their own available Contribution'
);
select is(
  (
    select item #>> '{partner,contribution,available}'
    from jsonb_array_elements((select payload from progress_history_results where label = 'partner-history')) as item
    where item ->> 'momentId' = (select payload ->> 'id' from progress_history_results where label = 'first')
  ),
  'false',
  'the partner sees a stable deleted Contribution placeholder for the removed response'
);
select is(
  (
    select item #> '{partner,contribution,responseText}'
    from jsonb_array_elements((select payload from progress_history_results where label = 'partner-history')) as item
    where item ->> 'momentId' = (select payload ->> 'id' from progress_history_results where label = 'first')
  ),
  'null'::jsonb,
  'removed response text is scrubbed from the partner payload'
);
select is(
  jsonb_array_length((select payload from progress_history_results where label = 'partner-history')),
  2,
  'removing a Contribution keeps the complete History readable'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000003', true);
insert into progress_history_results values ('outsider-history', public.get_memory_history());
select is(
  jsonb_array_length((select payload from progress_history_results where label = 'outsider-history')),
  0,
  'a third User cannot read the Pair History'
);
insert into progress_history_results values ('outsider-map', public.get_memory_map());
select is(
  jsonb_array_length((select payload from progress_history_results where label = 'outsider-map')),
  0,
  'a third User cannot read the Pair Map'
);
insert into progress_history_results values (
  'outsider-remove',
  public.remove_own_contribution(
    (select id from public.contributions where moment_id = (select payload ->> 'id' from progress_history_results where label = 'first')::uuid and user_id = '80000000-0000-4000-8000-000000000001')
  )
);
select is(
  (select payload ->> 'error' from progress_history_results where label = 'outsider-remove'),
  'not_allowed',
  'a third User cannot remove another User Contribution'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
insert into progress_history_results values ('archive', public.dissolve_pair());
select is(
  (select payload ->> 'status' from progress_history_results where label = 'archive'),
  'archived',
  'Archive Mode preserves the former Pair'
);
insert into progress_history_results values ('archive-history', public.get_memory_history());
select is(
  jsonb_array_length((select payload from progress_history_results where label = 'archive-history')),
  2,
  'Archive Mode preserves allowed History reading'
);
insert into progress_history_results values ('archive-progress', public.get_pom_progress());
select is(
  (select payload ->> 'memoryCount' from progress_history_results where label = 'archive-progress'),
  '2',
  'Archive Mode preserves Pom Progress'
);
insert into progress_history_results values (
  'archive-location',
  public.set_memory_location(
    (select id from public.memories where moment_id = (select payload ->> 'id' from progress_history_results where label = 'first')::uuid),
    'Madrid',
    'ES'
  )
);
select is(
  (select payload ->> 'error' from progress_history_results where label = 'archive-location'),
  'archive_read_only',
  'Archive Mode blocks adding new location data'
);
insert into progress_history_results values ('archive-ribbon', public.set_pom_accessory('ribbon'));
select is(
  (select payload ->> 'equippedAccessory' from progress_history_results where label = 'archive-ribbon'),
  'ribbon',
  'Archive Mode can still select an already unlocked accessory'
);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
insert into progress_history_results values ('partner-progress', public.get_pom_progress());
select is(
  (select payload ->> 'equippedAccessory' from progress_history_results where label = 'partner-progress'),
  'ribbon',
  'the shared wardrobe selection is visible to the other member'
);

select * from finish();
rollback;
