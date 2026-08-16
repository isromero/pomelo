alter table public.profiles
  add column time_zone text not null default 'UTC';

alter table public.pairs
  add column time_zone text not null default 'UTC';

grant update (time_zone) on public.profiles to authenticated;

create or replace function public.create_pair_with_invitation(pair_anniversary date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_pair_id uuid;
  creator_time_zone text;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  if pair_anniversary is null
    or pair_anniversary < date '1900-01-01'
    or pair_anniversary > current_date then
    return jsonb_build_object('error', 'invalid_anniversary');
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id and avatar_key is not null and birth_date is not null
  ) then
    return jsonb_build_object('error', 'profile_incomplete');
  end if;

  select coalesce(time_zone, 'UTC')
  into creator_time_zone
  from public.profiles
  where id = current_user_id;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = creator_time_zone
  ) then
    creator_time_zone := 'UTC';
  end if;

  if exists (
    select 1
    from public.pair_memberships
    where user_id = current_user_id and ended_at is null
  ) then
    return jsonb_build_object('error', 'already_paired');
  end if;

  insert into public.pairs (anniversary, created_by, time_zone)
  values (pair_anniversary, current_user_id, creator_time_zone)
  returning id into created_pair_id;

  begin
    insert into public.pair_memberships (pair_id, user_id, role)
    values (created_pair_id, current_user_id, 'creator');
  exception when unique_violation then
    delete from public.pairs where id = created_pair_id;
    return jsonb_build_object('error', 'already_paired');
  end;

  perform public.create_pair_invitation_record(created_pair_id, current_user_id);
  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.create_pair_with_invitation(date) from public, anon;
grant execute on function public.create_pair_with_invitation(date) to authenticated;

create or replace function public.get_daily_moment()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
  selected_pair_time_zone text;
  selected_local_date date;
  selected_moment_id uuid;
  selected_prompt public.prompt_concepts%rowtype;
  first_moment boolean;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.id, coalesce(p.time_zone, 'UTC')
  into selected_pair_id, selected_pair_time_zone
  from public.pairs p
  join public.pair_memberships pm on pm.pair_id = p.id
  where pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status = 'active'
  for update of p;

  if selected_pair_id is null then
    return jsonb_build_object('error', 'pair_not_active');
  end if;

  if (
    select count(*)
    from public.pair_memberships
    where pair_id = selected_pair_id and ended_at is null
  ) != 2 then
    return jsonb_build_object('error', 'pair_not_ready');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = selected_pair_time_zone
  ) then
    selected_pair_time_zone := 'UTC';
  end if;
  selected_local_date := (now() at time zone selected_pair_time_zone)::date;

  select id
  into selected_moment_id
  from public.moments
  where pair_id = selected_pair_id and local_date = selected_local_date;

  if selected_moment_id is null then
    select *
    into selected_prompt
    from public.prompt_concepts
    where concept_key = 'small_gesture_smile' and active;

    if selected_prompt.concept_key is null then
      return jsonb_build_object('error', 'prompt_unavailable');
    end if;

    select not exists (
      select 1 from public.moments where pair_id = selected_pair_id
    )
    into first_moment;

    insert into public.moments (
      pair_id,
      prompt_concept_key,
      format,
      local_date,
      is_free
    ) values (
      selected_pair_id,
      selected_prompt.concept_key,
      selected_prompt.format,
      selected_local_date,
      first_moment
    )
    on conflict (pair_id, local_date) do nothing
    returning id into selected_moment_id;

    if selected_moment_id is null then
      select id
      into selected_moment_id
      from public.moments
      where pair_id = selected_pair_id and local_date = selected_local_date;
    end if;
  end if;

  return public.moment_payload_for_user(selected_moment_id, current_user_id);
end;
$$;

revoke all on function public.get_daily_moment() from public, anon;
grant execute on function public.get_daily_moment() to authenticated;
