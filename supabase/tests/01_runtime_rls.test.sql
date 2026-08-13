begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_table('public', 'profiles', 'Profile storage exists');
select has_table('public', 'prompt_concepts', 'Prompt catalog exists');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'alex@example.test', 'password', now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Alex"}', now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sam@example.test', 'password', now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Sam"}', now(), now()
  );

set local role anon;
select results_eq(
  'select count(*)::bigint from public.profiles',
  array[0::bigint],
  'Anonymous clients cannot read Profiles'
);
select results_eq(
  'select count(*)::bigint from public.prompt_concepts',
  array[0::bigint],
  'Anonymous clients cannot read Prompt concepts'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select results_eq(
  'select count(*)::bigint from public.profiles',
  array[1::bigint],
  'A User reads exactly their own Profile'
);
select results_eq(
  $$select count(*)::bigint from public.profiles where id = '00000000-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'A User cannot read another Profile'
);
select is_empty(
  $$update public.profiles set display_name = 'Leaked' where id = '00000000-0000-4000-8000-000000000002' returning id$$,
  'A User cannot update another Profile'
);
select results_eq(
  $$update public.profiles set display_name = 'Alex Updated' where id = '00000000-0000-4000-8000-000000000001' returning display_name$$,
  array['Alex Updated'::text],
  'A User can update their own Profile'
);
select results_eq(
  'select count(*)::bigint from public.prompt_concepts where active',
  array[1::bigint],
  'Authenticated Users can read active Prompt concepts'
);

select * from finish();
rollback;
