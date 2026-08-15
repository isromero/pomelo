begin;

select plan(29);

select has_table('public', 'pairs', 'Pair storage exists');
select has_table('public', 'pair_memberships', 'Pair membership storage exists');
select has_table('public', 'pair_invitations', 'Invitation storage exists');

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
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'creator@example.test', '', now(), '{}', '{"display_name":"Irene"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'partner@example.test', '', now(), '{}', '{"display_name":"Lucia"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'other@example.test', '', now(), '{}', '{"display_name":"Alex"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'fourth@example.test', '', now(), '{}', '{"display_name":"Sam"}', now(), now());

update public.profiles
set avatar_key = case id
    when '30000000-0000-4000-8000-000000000001' then 'calm'
    when '30000000-0000-4000-8000-000000000002' then 'affectionate'
    else 'surprised'
  end,
  birth_date = date '1992-11-07';

create temporary table pair_test_results (
  label text primary key,
  payload jsonb not null
);
grant all on table pair_test_results to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);

insert into pair_test_results values (
  'created',
  public.create_pair_with_invitation(date '2021-06-12')
);

select is(
  (select payload ->> 'status' from pair_test_results where label = 'created'),
  'waiting',
  'a User creates a waiting Pair'
);
select is(
  (select payload #>> '{invitation,status}' from pair_test_results where label = 'created'),
  'pending',
  'Pair creation returns a pending single-use Invitation'
);
select is(
  (select payload ->> 'anniversary' from pair_test_results where label = 'created'),
  '2021-06-12',
  'the anniversary is stored once on the Pair'
);
select is(
  (select count(*) from public.pair_memberships where ended_at is null),
  1::bigint,
  'the creator has exactly one current membership'
);

set local role anon;
insert into pair_test_results values (
  'preview',
  public.preview_pair_invitation(
    (select payload #>> '{invitation,code}' from pair_test_results where label = 'created')
  )
);

select is(
  (select payload ->> 'status' from pair_test_results where label = 'preview'),
  'valid',
  'a recipient can preview a valid Invitation by code'
);
select is(
  (select payload ->> 'creatorName' from pair_test_results where label = 'preview'),
  'Irene',
  'the preview clearly identifies the Pair creator'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
insert into pair_test_results values (
  'accepted',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from pair_test_results where label = 'created')
  )
);

select is(
  (select payload ->> 'status' from pair_test_results where label = 'accepted'),
  'active',
  'accepting an Invitation activates the Pair'
);
select is(
  jsonb_array_length((select payload -> 'members' from pair_test_results where label = 'accepted')),
  2,
  'the activated Pair exposes exactly two members'
);

reset role;
select is(
  (select count(*) from public.pair_memberships where ended_at is null),
  2::bigint,
  'the database stores exactly two current memberships'
);
select is(
  (select anniversary::text from public.pairs limit 1),
  '2021-06-12',
  'both members share the Pair anniversary'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
insert into pair_test_results values (
  'second-pair',
  public.create_pair_with_invitation(date '2022-03-04')
);
select is(
  (select payload ->> 'error' from pair_test_results where label = 'second-pair'),
  'already_paired',
  'a User cannot create a second current Pair'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
insert into pair_test_results values (
  'reused',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,token}' from pair_test_results where label = 'created')
  )
);
select is(
  (select payload ->> 'error' from pair_test_results where label = 'reused'),
  'invitation_used',
  'an accepted Invitation cannot be reused'
);
select is(
  (select count(*) from public.pair_memberships where user_id = '30000000-0000-4000-8000-000000000003'),
  0::bigint,
  'reusing an Invitation creates no partial membership'
);
select is(
  (select count(*) from public.pairs),
  0::bigint,
  'RLS hides a Pair from an unrelated User'
);

insert into pair_test_results values (
  'other-created',
  public.create_pair_with_invitation(date '2020-01-02')
);
insert into pair_test_results values (
  'cancelled',
  public.cancel_pair_invitation(
    ((select payload #>> '{invitation,id}' from pair_test_results where label = 'other-created'))::uuid
  )
);
select is(
  (select payload #>> '{invitation,status}' from pair_test_results where label = 'cancelled'),
  'cancelled',
  'the creator can cancel a pending Invitation'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
insert into pair_test_results values (
  'cancelled-accept',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,code}' from pair_test_results where label = 'other-created')
  )
);
select is(
  (select payload ->> 'error' from pair_test_results where label = 'cancelled-accept'),
  'invitation_cancelled',
  'a cancelled Invitation fails with a recoverable state'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
insert into pair_test_results values ('renewed', public.create_pair_invitation());
reset role;
update public.pair_invitations
set created_at = now() - interval '8 days',
  expires_at = now() - interval '1 minute'
where id = ((select payload #>> '{invitation,id}' from pair_test_results where label = 'renewed'))::uuid;

set local role anon;
insert into pair_test_results values (
  'expired-preview',
  public.preview_pair_invitation(
    (select payload #>> '{invitation,token}' from pair_test_results where label = 'renewed')
  )
);
select is(
  (select payload ->> 'status' from pair_test_results where label = 'expired-preview'),
  'expired',
  'an expired Invitation previews as expired'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
insert into pair_test_results values (
  'expired-accept',
  public.accept_pair_invitation(
    (select payload #>> '{invitation,token}' from pair_test_results where label = 'renewed')
  )
);
select is(
  (select payload ->> 'error' from pair_test_results where label = 'expired-accept'),
  'invitation_expired',
  'an expired Invitation cannot be accepted'
);
select is(
  (select count(*) from public.pair_memberships where user_id = '30000000-0000-4000-8000-000000000004'),
  0::bigint,
  'an expired Invitation creates no partial membership'
);

reset role;
insert into public.pair_invitations (
  pair_id,
  creator_id,
  token,
  code,
  status,
  expires_at
) values (
  ((select payload ->> 'id' from pair_test_results where label = 'created'))::uuid,
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'F00DFACE',
  'pending',
  now() + interval '1 day'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
insert into pair_test_results values (
  'full-accept',
  public.accept_pair_invitation('F00D-FACE')
);
select is(
  (select payload ->> 'error' from pair_test_results where label = 'full-accept'),
  'pair_full',
  'a third User cannot join a full Pair'
);
select is(
  (select count(*) from public.pair_memberships where user_id = '30000000-0000-4000-8000-000000000004'),
  0::bigint,
  'a full Pair rejection creates no partial membership'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
insert into pair_test_results values ('archived', public.dissolve_pair());
select is(
  (select payload ->> 'status' from pair_test_results where label = 'archived'),
  'archived',
  'unlinking moves the Pair into Archive Mode'
);
select is(
  (select count(*) from public.pair_memberships where pair_id = ((select payload ->> 'id' from pair_test_results where label = 'created'))::uuid and ended_at is null),
  0::bigint,
  'unlinking ends both current memberships'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select is(
  public.get_pair_state() ->> 'status',
  'archived',
  'the former partner retains Archive Mode access'
);

reset role;
select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pairs'
  ),
  'Pair changes are published for realtime updates'
);
select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pair_invitations'
  ),
  'Invitation changes are published for realtime updates'
);

select * from finish();
rollback;
