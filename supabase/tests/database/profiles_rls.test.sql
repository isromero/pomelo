begin;

select plan(6);

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
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'one@example.com', '', now(), '{}', '{"display_name":"One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'two@example.com', '', now(), '{}', '{"display_name":"Two"}', now(), now());

update public.profiles
set avatar_key = case id
    when '11111111-1111-1111-1111-111111111111' then 'calm'
    else 'surprised'
  end,
  birth_date = case id
    when '11111111-1111-1111-1111-111111111111' then date '1990-01-01'
    else date '1991-02-02'
  end;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select results_eq(
  $$ select display_name from public.profiles order by display_name $$,
  array['One'::text],
  'a User reads only their own Profile'
);

select is(
  (select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'cross-User Profile reads are denied'
);

select results_eq(
  $$ update public.profiles set display_name = 'Changed' where id = '22222222-2222-2222-2222-222222222222' returning id $$,
  array[]::uuid[],
  'cross-User Profile updates are denied'
);

select lives_ok(
  $$ update public.profiles set display_name = 'Own changed' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a User updates their own Profile'
);

select throws_ok(
  $$ update public.profiles set avatar_key = 'invalid' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'invalid avatars are rejected'
);

select throws_ok(
  $$ update public.profiles set birth_date = current_date + 1 where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'future birth dates are rejected'
);

select * from finish();
rollback;
