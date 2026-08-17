begin;

select plan(51);

select has_table('public', 'doodle_documents', 'Doodle documents exist');
select has_table('public', 'doodle_completions', 'Doodle completions exist');
select has_table('public', 'thread_messages', 'Thread messages exist');
select has_table('public', 'thread_message_events', 'Thread event log exists');
select has_table('public', 'memory_widget_preferences', 'Widget preferences exist');
select has_column('public', 'contributions', 'photo_rear_path', 'Photo Contributions store private paths');
select has_column('public', 'memories', 'format', 'Memories store their format');

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
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'photo-one@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'photo-two@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'photo-outsider@example.test', '', now(), '{}', '{"display_name":"Alex"}', now(), now());

update public.profiles
set avatar_key = case id
    when '60000000-0000-4000-8000-000000000001' then 'calm'
    when '60000000-0000-4000-8000-000000000002' then 'affectionate'
    else 'surprised'
  end,
  birth_date = date '1992-11-07';

create temporary table feature_test_results (
  label text primary key,
  payload jsonb not null
);
grant all on table feature_test_results to authenticated, anon;

create temporary table feature_ids (
  pair_id uuid not null,
  photo_moment_id uuid not null,
  doodle_moment_id uuid not null
);
grant all on table feature_ids to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'pair',
  public.create_pair_with_invitation(date '2021-06-12')
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into feature_test_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from feature_test_results where label = 'pair')
  )
);

reset role;
insert into public.moments (
  pair_id,
  prompt_concept_key,
  format,
  local_date
) values
  (
    (select payload ->> 'id' from feature_test_results where label = 'accepted')::uuid,
    'photo_today_together',
    'photo',
    current_date - 1
  ),
  (
    (select payload ->> 'id' from feature_test_results where label = 'accepted')::uuid,
    'doodle_today_together',
    'doodle',
    current_date
  );

update public.moments
set normal_expires_at = now() + interval '1 day',
    recovery_expires_at = now() + interval '2 days'
where pair_id = (select payload ->> 'id' from feature_test_results where label = 'accepted')::uuid;

insert into feature_ids
select
  pair_id,
  (select id from public.moments where pair_id = moments.pair_id and format = 'photo' limit 1),
  (select id from public.moments where pair_id = moments.pair_id and format = 'doodle' limit 1)
from public.moments
where pair_id = (select payload ->> 'id' from feature_test_results where label = 'accepted')::uuid
group by pair_id;

insert into storage.objects (bucket_id, name, owner, metadata)
select
  'pomelo-moment-media',
  user_id::text || '/' || photo_moment_id::text || '/' || side || '.jpg',
  user_id,
  '{}'::jsonb
from feature_ids
cross join (values
  ('60000000-0000-4000-8000-000000000001'::uuid),
  ('60000000-0000-4000-8000-000000000002'::uuid)
) as users(user_id)
cross join (values ('rear'), ('front')) as sides(side);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'photo-one',
  public.submit_photo_contribution(
    (select photo_moment_id from feature_ids),
    '60000000-0000-4000-8000-000000000001/' || (select photo_moment_id from feature_ids)::text || '/rear.jpg',
    '60000000-0000-4000-8000-000000000001/' || (select photo_moment_id from feature_ids)::text || '/front.jpg',
    1200,
    1600,
    900,
    1200,
    'photo-client-one'
  )
);

select is(
  (select payload ->> 'status' from feature_test_results where label = 'photo-one'),
  'partially_submitted',
  'one Photo Contribution leaves the Moment partially submitted'
);
select is(
  (select payload #>> '{ownContribution,photo,rear,path}' from feature_test_results where label = 'photo-one'),
  '60000000-0000-4000-8000-000000000001/' || (select photo_moment_id from feature_ids)::text || '/rear.jpg',
  'the submitting User receives private Photo metadata'
);

update storage.objects
set metadata = '{"tampered":true}'::jsonb
where bucket_id = 'pomelo-moment-media'
  and name = '60000000-0000-4000-8000-000000000001/'
    || (select photo_moment_id from feature_ids)::text
    || '/rear.jpg';
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where bucket_id = 'pomelo-moment-media'
  and name = '60000000-0000-4000-8000-000000000001/'
    || (select photo_moment_id from feature_ids)::text
    || '/front.jpg';
reset role;
select is(
  (
    select metadata ->> 'tampered'
    from storage.objects
    where bucket_id = 'pomelo-moment-media'
      and name = '60000000-0000-4000-8000-000000000001/'
        || (select photo_moment_id from feature_ids)::text
        || '/rear.jpg'
  ),
  null,
  'submitted Photo media cannot be overwritten'
);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'pomelo-moment-media'
      and name like '60000000-0000-4000-8000-000000000001/%'
  ),
  2,
  'submitted Photo media cannot be deleted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'pomelo-moment-media'
      and name like '60000000-0000-4000-8000-000000000001/%'
  ),
  0,
  'the partner cannot read source photos before Reveal'
);
insert into feature_test_results values ('photo-partner-before', public.get_daily_moment());
select is(
  (select payload #>> '{partner,submitted}' from feature_test_results where label = 'photo-partner-before'),
  'true',
  'the partner sees Photo readiness without private image content'
);
select ok(
  (select payload #> '{partner,contribution}' from feature_test_results where label = 'photo-partner-before') = 'null'::jsonb,
  'the partner Photo Contribution stays hidden before Reveal'
);

insert into feature_test_results values (
  'photo-two',
  public.submit_photo_contribution(
    (select photo_moment_id from feature_ids),
    '60000000-0000-4000-8000-000000000002/' || (select photo_moment_id from feature_ids)::text || '/rear.jpg',
    '60000000-0000-4000-8000-000000000002/' || (select photo_moment_id from feature_ids)::text || '/front.jpg',
    1200,
    1600,
    900,
    1200,
    'photo-client-two'
  )
);
select is(
  (select payload ->> 'status' from feature_test_results where label = 'photo-two'),
  'ready',
  'Photo becomes ready only after both members send both images'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'photo-retry',
  public.submit_photo_contribution(
    (select photo_moment_id from feature_ids),
    '60000000-0000-4000-8000-000000000001/' || (select photo_moment_id from feature_ids)::text || '/rear.jpg',
    '60000000-0000-4000-8000-000000000001/' || (select photo_moment_id from feature_ids)::text || '/front.jpg',
    1200,
    1600,
    900,
    1200,
    'photo-client-one'
  )
);
reset role;
select is(
  (select count(*)::integer from public.contributions where moment_id = (select photo_moment_id from feature_ids)),
  2,
  'retrying the same Photo Contribution does not create a duplicate'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'photo-revealed',
  public.reveal_moment((select photo_moment_id from feature_ids))
);
select is(
  (select payload ->> 'status' from feature_test_results where label = 'photo-revealed'),
  'revealed',
  'Photo Reveal is available once both Contributions are ready'
);
reset role;
select is(
  (select payload ->> 'format' from feature_test_results where label = 'photo-revealed'),
  'photo',
  'Reveal creates a Photo Memory payload'
);
select is(
  (select payload #>> '{memoryId}' from feature_test_results where label = 'photo-revealed'),
  (select id::text from public.memories where moment_id = (select photo_moment_id from feature_ids)),
  'Photo Reveal creates exactly one Memory'
);
select is(
  public.memory_payload_for_user(
    (select id from public.memories where moment_id = (select photo_moment_id from feature_ids)),
    '60000000-0000-4000-8000-000000000001'
  ) #>> '{photoComposition,layout}',
  'partner_rear_primary_own_rear_thumbnail',
  'the Photo Memory stores the stable partner-primary composition'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'pomelo-moment-media'
      and name like '60000000-0000-4000-8000-000000000001/%'
  ),
  2,
  'the partner can read the other source photos only after Reveal'
);

reset role;
select is(
  (select public from storage.buckets where id = 'pomelo-moment-media'),
  false,
  'Photo Storage remains private rather than using public URLs'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'photo-history-default',
  public.get_memory_history()
);
select is(
  (select payload #>> '{0,widgetVisualEnabled}' from feature_test_results where label = 'photo-history-default'),
  'false',
  'visual Photo widget display is opt-in by default'
);
select is(
  public.set_memory_widget_visibility(
    (select id from public.memories where moment_id = (select photo_moment_id from feature_ids)),
    true
  ),
  true,
  'a Pair member can opt a Photo Memory into visual widgets'
);
insert into feature_test_results values ('photo-history-enabled', public.get_memory_history());
select is(
  (select payload #>> '{0,widgetVisualEnabled}' from feature_test_results where label = 'photo-history-enabled'),
  'true',
  'widget preference is returned to the same User'
);
select is(
  public.set_memory_widget_visibility(
    (select id from public.memories where moment_id = (select photo_moment_id from feature_ids)),
    false
  ),
  false,
  'a User can immediately opt the Photo Memory back out'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'doodle-session',
  public.get_doodle_session((select doodle_moment_id from feature_ids))
);
select is(
  (select payload #>> '{document,version}' from feature_test_results where label = 'doodle-session'),
  '0',
  'a Doodle session starts with an empty versioned document'
);

insert into feature_test_results values (
  'doodle-one',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":1,"strokes":[{"id":"stroke-one","userId":"60000000-0000-4000-8000-000000000001","color":"#F4714B","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:00.000Z","points":[{"x":1,"y":1}]}]}'::jsonb,
    'doodle-operation-one'
  )
);
select is(
  (select jsonb_array_length(payload -> 'document' -> 'strokes') from feature_test_results where label = 'doodle-one'),
  1,
  'a Doodle gesture persists as one grouped snapshot'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into feature_test_results values (
  'doodle-spoof',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":2,"strokes":[{"id":"stroke-one","userId":"60000000-0000-4000-8000-000000000001","color":"#F4714B","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:00.000Z","points":[{"x":1,"y":1}]},{"id":"spoofed-stroke","userId":"60000000-0000-4000-8000-000000000001","color":"#85CADF","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:01.000Z","points":[{"x":2,"y":2}]}]}'::jsonb,
    'doodle-operation-spoof'
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'doodle-spoof'),
  'invalid_doodle',
  'a Doodle member cannot forge strokes for the partner'
);
insert into feature_test_results values (
  'doodle-missing-owner',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":2,"strokes":[{"id":"ownerless-stroke","color":"#85CADF","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:01.000Z","points":[{"x":2,"y":2}]}]}'::jsonb,
    'doodle-operation-missing-owner'
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'doodle-missing-owner'),
  'invalid_doodle',
  'a Doodle stroke must declare its owner'
);
insert into feature_test_results values (
  'doodle-invalid-points',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":2,"strokes":[{"id":"bad-points","userId":"60000000-0000-4000-8000-000000000002","color":"#85CADF","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:01.000Z","points":null}]}'::jsonb,
    'doodle-operation-invalid-points'
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'doodle-invalid-points'),
  'invalid_doodle',
  'malformed Doodle points return a validation error'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'doodle-retry',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":1,"strokes":[]}'::jsonb,
    'doodle-operation-one'
  )
);
select is(
  (select jsonb_array_length(payload -> 'document' -> 'strokes') from feature_test_results where label = 'doodle-retry'),
  1,
  'retrying a Doodle operation does not duplicate or erase the saved stroke'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into feature_test_results values (
  'doodle-two',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":1,"strokes":[{"id":"stroke-two","userId":"60000000-0000-4000-8000-000000000002","color":"#85CADF","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:01.000Z","points":[{"x":4,"y":4}]}]}'::jsonb,
    'doodle-operation-two'
  )
);
select is(
  (select jsonb_array_length(payload -> 'document' -> 'strokes') from feature_test_results where label = 'doodle-two'),
  2,
  'concurrent Doodle snapshots merge both Users without losing order'
);
insert into feature_test_results values (
  'doodle-partner-erase',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":3,"removedStrokeIds":["stroke-one"],"strokes":[{"id":"stroke-two","userId":"60000000-0000-4000-8000-000000000002","color":"#85CADF","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:01.000Z","points":[{"x":4,"y":4}]}]}'::jsonb,
    'doodle-operation-partner-erase'
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'doodle-partner-erase'),
  'invalid_doodle',
  'a Doodle member cannot erase the partner strokes'
);
reset role;
select is(
  (select jsonb_array_length(document -> 'strokes') from public.doodle_documents where moment_id = (select doodle_moment_id from feature_ids)),
  2,
  'the persisted Doodle document contains both Users strokes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'doodle-complete-one',
  public.complete_doodle((select doodle_moment_id from feature_ids), 'doodle-complete-one')
);
select is(
  (select payload ->> 'status' from feature_test_results where label = 'doodle-complete-one'),
  'partially_submitted',
  'one Doodle completion leaves the Moment waiting for the partner'
);
insert into feature_test_results values (
  'doodle-edit-after-complete',
  public.save_doodle_snapshot(
    (select doodle_moment_id from feature_ids),
    '{"version":3,"strokes":[{"id":"stroke-one","userId":"60000000-0000-4000-8000-000000000001","color":"#F4714B","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:00.000Z","points":[{"x":1,"y":1}]},{"id":"stroke-two","userId":"60000000-0000-4000-8000-000000000002","color":"#85CADF","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:01.000Z","points":[{"x":4,"y":4}]},{"id":"late-stroke","userId":"60000000-0000-4000-8000-000000000001","color":"#F4714B","width":5,"mode":"brush","createdAt":"2026-08-16T10:00:02.000Z","points":[{"x":3,"y":3}]}]}'::jsonb,
    'doodle-operation-after-complete'
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'doodle-edit-after-complete'),
  'invalid_doodle',
  'a completed Doodle member cannot change the final document'
);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into feature_test_results values (
  'doodle-complete-two',
  public.complete_doodle((select doodle_moment_id from feature_ids), 'doodle-complete-two')
);
select is(
  (select payload ->> 'status' from feature_test_results where label = 'doodle-complete-two'),
  'ready',
  'Doodle becomes ready only after both Users finish'
);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'doodle-revealed',
  public.reveal_moment((select doodle_moment_id from feature_ids))
);
select is(
  (select payload ->> 'format' from feature_test_results where label = 'doodle-revealed'),
  'doodle',
  'Doodle Reveal creates a Doodle Memory payload'
);
select is(
  (select jsonb_array_length(payload -> 'doodle' -> 'document' -> 'strokes') from feature_test_results where label = 'doodle-revealed'),
  2,
  'Doodle Reveal persists a reproducible final document'
);

reset role;
select is(
  (select count(*)::integer from information_schema.columns where table_schema = 'public' and table_name = 'thread_message_events' and column_name = 'body'),
  0,
  'Thread event records do not store private message bodies'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into feature_test_results values (
  'thread-empty',
  public.get_memory_thread((select id from public.memories where format = 'photo'))
);
select is(
  jsonb_array_length((select payload -> 'messages' from feature_test_results where label = 'thread-empty')),
  0,
  'a revealed Memory starts with an empty Thread'
);
select is(
  (select payload ->> 'canWrite' from feature_test_results where label = 'thread-empty'),
  'true',
  'active Pair members can write a Memory Thread'
);
insert into feature_test_results values (
  'thread-message',
  public.send_thread_message(
    (select id from public.memories where format = 'photo'),
    '  A note for later.  ',
    'thread-client-one'
  )
);
select is(
  (select payload ->> 'body' from feature_test_results where label = 'thread-message'),
  'A note for later.',
  'Thread messages are normalized at the write boundary'
);
insert into feature_test_results values (
  'thread-retry',
  public.send_thread_message(
    (select id from public.memories where format = 'photo'),
    'A different body must not duplicate the first event.',
    'thread-client-one'
  )
);
select is(
  (select payload ->> 'id' from feature_test_results where label = 'thread-retry'),
  (select payload ->> 'id' from feature_test_results where label = 'thread-message'),
  'retrying a Thread message returns the original idempotent message'
);
reset role;
select is(
  (select count(*)::integer from public.thread_messages),
  1,
  'idempotent Thread retries create one stored message'
);
select is(
  (select count(*)::integer from public.thread_message_events),
  1,
  'each Thread message emits one safe event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into feature_test_results values (
  'thread-partner',
  public.get_memory_thread((select id from public.memories where format = 'photo'))
);
select is(
  (select payload #>> '{messages,0,body}' from feature_test_results where label = 'thread-partner'),
  'A note for later.',
  'both Pair members can read the revealed Thread'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
insert into feature_test_results values (
  'thread-outsider',
  public.get_memory_thread(
    (select (payload ->> 'memoryId')::uuid from feature_test_results where label = 'photo-revealed')
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'thread-outsider'),
  'not_allowed',
  'an outsider cannot read a Pair Thread'
);

reset role;
update public.pairs
set status = 'archived', dissolved_at = now()
where id = (select pair_id from feature_ids);
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
insert into feature_test_results values (
  'thread-archive',
  public.get_memory_thread((select id from public.memories where format = 'photo'))
);
select is(
  (select payload ->> 'canWrite' from feature_test_results where label = 'thread-archive'),
  'false',
  'Archive Mode keeps the revealed Thread readable but not writable'
);
insert into feature_test_results values (
  'thread-archive-write',
  public.send_thread_message(
    (select id from public.memories where format = 'photo'),
    'This must not be written in Archive Mode.',
    'thread-client-archive'
  )
);
select is(
  (select payload ->> 'error' from feature_test_results where label = 'thread-archive-write'),
  'archive_read_only',
  'Archive Mode rejects new Thread messages'
);

select * from finish();
rollback;
