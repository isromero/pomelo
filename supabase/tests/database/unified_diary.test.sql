begin;

select plan(35);

select has_table('public', 'journal_entries', 'Journal Entries exist');
select has_table('public', 'pair_journal_state', 'Pair journal allowance state exists');
select has_table('public', 'journal_entry_media', 'Journal Entry media exists');
select has_column('public', 'thread_messages', 'journal_entry_id', 'Threads can target Journal Entries');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'diary-one@example.test', '', now(), '{}', '{"display_name":"Ines"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'diary-two@example.test', '', now(), '{}', '{"display_name":"Noa"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'diary-outsider@example.test', '', now(), '{}', '{"display_name":"Alex"}', now(), now());

update public.profiles
set avatar_key = 'calm', birth_date = date '1994-08-25';

create temporary table diary_results (
  label text primary key,
  payload jsonb not null
);
grant all on table diary_results to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
insert into diary_results values ('pair', public.create_pair_with_invitation(date '2021-06-12'));
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
insert into diary_results values (
  'accepted',
  public.accept_pair_invitation((select payload #>> '{invitation,code}' from diary_results where label = 'pair'))
);
select is((select payload ->> 'status' from diary_results where label = 'accepted'), 'active', 'the Pair is active');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
insert into diary_results values (
  'created',
  public.create_journal_entry(
    'Viaje a Lisboa',
    'Nuestro primer viaje juntos.',
    date '2026-08-10',
    null,
    null,
    'Europe/Madrid',
    'once',
    false,
    '{"label":"Lisboa, Portugal","city":"Lisboa","countryCode":"PT","latitude":38.7223,"longitude":-9.1393}'::jsonb,
    'request-1'
  )
);
select is((select payload ->> 'title' from diary_results where label = 'created'), 'Viaje a Lisboa', 'the first manual entry is free');
select is((select payload #>> '{location,city}' from diary_results where label = 'created'), 'Lisboa', 'the confirmed place is returned');
select is((select payload #>> '{location,latitude}' from diary_results where label = 'created'), '38.7223', 'the exact confirmed latitude is Pair data');

insert into diary_results values (
  'created-retry',
  public.create_journal_entry(
    'Ignored retry title', '', date '2026-08-11', null, null, 'Europe/Madrid',
    'once', false, null, 'request-1'
  )
);
select is(
  (select payload ->> 'id' from diary_results where label = 'created-retry'),
  (select payload ->> 'id' from diary_results where label = 'created'),
  'the client request id makes creation idempotent'
);

insert into diary_results values (
  'second-blocked',
  public.create_journal_entry(
    'Second entry', '', date '2026-09-10', null, null, 'Europe/Madrid',
    'once', false, null, 'request-2'
  )
);
select is((select payload ->> 'error' from diary_results where label = 'second-blocked'), 'premium_required', 'the second entry requires Premium');

insert into diary_results values ('owner-list', public.get_journal_entries());
select is(jsonb_array_length((select payload -> 'entries' from diary_results where label = 'owner-list')), 1, 'the owner lists the first entry');
select is((select payload ->> 'freeEntryConsumed' from diary_results where label = 'owner-list'), 'true', 'the lifetime allowance is consumed');
select is((select payload ->> 'canCreate' from diary_results where label = 'owner-list'), 'false', 'the free Pair cannot create another entry');
insert into diary_results values ('page', public.get_journal_page(20, null, null, null));
select is((select payload #>> '{items,0,kind}' from diary_results where label = 'page'), 'manualEntry', 'stable Journal pagination discriminates the manual source');
insert into diary_results values ('calendar', public.get_journal_calendar(date '2026-08-01', date '2026-08-31'));
select is((select payload #>> '{0,id}' from diary_results where label = 'calendar'), (select payload ->> 'id' from diary_results where label = 'created'), 'the authoritative calendar query includes the entry occurrence');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
insert into diary_results values ('partner-list', public.get_journal_entries());
select is(jsonb_array_length((select payload -> 'entries' from diary_results where label = 'partner-list')), 1, 'the partner reads the shared entry');
insert into diary_results values (
  'partner-update',
  public.update_journal_entry(
    ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
    1,
    'Lisboa juntos',
    'Editado por los dos.',
    date '2026-08-10', null, null, 'Europe/Madrid', 'once', false,
    '{"label":"Pin junto al río","latitude":38.7223,"longitude":-9.1393}'::jsonb
  )
);
select is((select payload ->> 'version' from diary_results where label = 'partner-update'), '2', 'either member can edit with the expected version');
select is((select payload #>> '{location,city}' from diary_results where label = 'partner-update'), null, 'a confirmed pin does not require reverse-geocoded city metadata');
insert into diary_results values (
  'partner-update-retry',
  public.update_journal_entry(
    ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
    1, 'Lisboa juntos', 'Editado por los dos.', date '2026-08-10', null, null,
    'Europe/Madrid', 'once', false,
    '{"label":"Pin junto al río","latitude":38.7223,"longitude":-9.1393}'::jsonb
  )
);
select is((select payload ->> 'version' from diary_results where label = 'partner-update-retry'), '2', 'retrying the same edit is idempotent');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
insert into diary_results values (
  'stale-update',
  public.update_journal_entry(
    ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
    1,
    'Stale title', '', date '2026-08-10', null, null, 'Europe/Madrid',
    'once', false, null
  )
);
select is((select payload ->> 'error' from diary_results where label = 'stale-update'), 'conflict', 'stale writes do not overwrite a partner edit');

insert into diary_results values ('map', public.get_journal_map());
select is(jsonb_array_length((select payload from diary_results where label = 'map')), 1, 'Map contains the located Journal Entry');
select is((select payload #>> '{0,id}' from diary_results where label = 'map'), (select payload ->> 'id' from diary_results where label = 'created'), 'Map points to the Journal Entry');

insert into diary_results values (
  'thread-message',
  public.send_journal_thread_message(
    ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
    'Qué ganas de volver.',
    'message-1'
  )
);
select is((select payload ->> 'body' from diary_results where label = 'thread-message'), 'Qué ganas de volver.', 'a Journal Entry accepts a Thread message');
insert into diary_results values (
  'thread',
  public.get_journal_thread(((select payload ->> 'id' from diary_results where label = 'created'))::uuid)
);
select is(jsonb_array_length((select payload -> 'messages' from diary_results where label = 'thread')), 1, 'the Journal Thread is readable');

do $$
begin
  for position in 0..9 loop
    perform public.add_journal_entry_media(
      ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
      'media-' || position,
      (select payload ->> 'pairId' from diary_results where label = 'created') || '/'
        || (select payload ->> 'id' from diary_results where label = 'created') || '/90000000-0000-4000-8000-000000000001/media-'
        || position || '.jpg',
      position, 100, 100
    );
  end loop;
end;
$$;
insert into diary_results values (
  'media-overflow',
  public.add_journal_entry_media(
    ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
    'media-10', 'overflow.jpg', 9, 100, 100
  )
);
select is((select payload ->> 'error' from diary_results where label = 'media-overflow'), 'invalid_media', 'an entry cannot exceed ten photos');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
insert into diary_results values ('outsider-list', public.get_journal_entries());
select is((select payload ->> 'error' from diary_results where label = 'outsider-list'), 'not_allowed', 'an outsider cannot list the Pair Diary');
insert into diary_results values (
  'outsider-thread',
  public.get_journal_thread(((select payload ->> 'id' from diary_results where label = 'created'))::uuid)
);
select is((select payload ->> 'error' from diary_results where label = 'outsider-thread'), 'not_allowed', 'an outsider cannot read the Journal Thread');
select is((select count(*)::integer from public.journal_entries), 0, 'RLS hides exact Journal coordinates from an outsider');

reset role;
select is((select count(*)::integer from public.memories), 0, 'Journal Entries do not create Memories');
select is((select coalesce(sum(memory_count), 0)::integer from public.pair_progress), 0, 'Journal Entries do not advance Pom Progress');
update public.pairs
set status = 'archived', dissolved_at = now()
where id = ((select payload ->> 'pairId' from diary_results where label = 'created'))::uuid;
update public.pair_memberships
set ended_at = now()
where pair_id = ((select payload ->> 'pairId' from diary_results where label = 'created'))::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
insert into diary_results values ('archived-list', public.get_journal_entries());
select is((select payload ->> 'readOnly' from diary_results where label = 'archived-list'), 'true', 'an archived Pair keeps its Diary readable');
insert into diary_results values (
  'archived-update',
  public.update_journal_entry(
    ((select payload ->> 'id' from diary_results where label = 'created'))::uuid,
    2, 'No debe cambiar', '', date '2026-08-10', null, null, 'Europe/Madrid',
    'once', false, null
  )
);
select is((select payload ->> 'error' from diary_results where label = 'archived-update'), 'not_allowed', 'an archived Pair rejects content edits');
insert into diary_results values (
  'deleted',
  public.delete_journal_entry(((select payload ->> 'id' from diary_results where label = 'created'))::uuid)
);
select is((select payload ->> 'deleted' from diary_results where label = 'deleted'), 'true', 'either member can delete the shared entry');
insert into diary_results values ('after-delete', public.get_journal_entries());
select is(jsonb_array_length((select payload -> 'entries' from diary_results where label = 'after-delete')), 0, 'the deleted entry disappears from Diary');
select is((select payload ->> 'canCreate' from diary_results where label = 'after-delete'), 'false', 'deletion does not restore the free allowance');

select * from finish();
rollback;
