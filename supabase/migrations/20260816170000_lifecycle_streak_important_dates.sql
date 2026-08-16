alter table public.moments
  add column normal_expires_at timestamptz,
  add column recovery_expires_at timestamptz;

create function public.moment_deadlines_for_pair(
  target_pair_id uuid,
  target_local_date date
)
returns table(normal_expires_at timestamptz, recovery_expires_at timestamptz)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  pair_time_zone text;
begin
  select case
    when exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = coalesce(p.time_zone, 'UTC')
    ) then coalesce(p.time_zone, 'UTC')
    else 'UTC'
  end
  into pair_time_zone
  from public.pairs p
  where p.id = target_pair_id;

  pair_time_zone := coalesce(pair_time_zone, 'UTC');
  normal_expires_at := (target_local_date + 1)::timestamp without time zone
    at time zone pair_time_zone;
  recovery_expires_at := (target_local_date + 2)::timestamp without time zone
    at time zone pair_time_zone;
  return next;
end;
$$;

revoke all on function public.moment_deadlines_for_pair(uuid, date)
  from public, anon, authenticated;

update public.moments m
set normal_expires_at = (
      select deadlines.normal_expires_at
      from public.moment_deadlines_for_pair(m.pair_id, m.local_date) deadlines
    ),
    recovery_expires_at = (
      select deadlines.recovery_expires_at
      from public.moment_deadlines_for_pair(m.pair_id, m.local_date) deadlines
    );

alter table public.moments
  alter column normal_expires_at set not null,
  alter column recovery_expires_at set not null,
  add constraint moments_deadlines_ordered_check
    check (recovery_expires_at > normal_expires_at);

create function public.assign_moment_deadlines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  deadlines record;
begin
  select *
  into deadlines
  from public.moment_deadlines_for_pair(new.pair_id, new.local_date);
  new.normal_expires_at := deadlines.normal_expires_at;
  new.recovery_expires_at := deadlines.recovery_expires_at;
  return new;
end;
$$;

revoke all on function public.assign_moment_deadlines() from public, anon, authenticated;

create trigger moments_assign_deadlines
before insert or update of pair_id, local_date on public.moments
for each row execute function public.assign_moment_deadlines();

create table public.pair_streaks (
  pair_id uuid primary key references public.pairs (id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  best_count integer not null default 0 check (best_count >= current_count),
  last_completed_local_date date,
  recovery_uses integer not null default 0 check (recovery_uses between 0 and 1),
  updated_at timestamptz not null default now()
);

create table public.streak_completions (
  moment_id uuid primary key references public.moments (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  local_date date not null,
  completed_at timestamptz not null default now(),
  unique (pair_id, local_date)
);

create index streak_completions_pair_date_idx
  on public.streak_completions (pair_id, local_date desc);

create function public.set_pair_streak_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_pair_streak_updated_at() from public, anon, authenticated;

create trigger pair_streaks_set_updated_at
before update on public.pair_streaks
for each row execute function public.set_pair_streak_updated_at();

create function public.pair_streak_payload(target_pair_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'current', coalesce(ps.current_count, 0),
    'best', coalesce(ps.best_count, 0),
    'lastCompletedLocalDate', ps.last_completed_local_date,
    'recoveryAvailable', coalesce(ps.recovery_uses, 0) < 1,
    'recoveryLimit', 1,
    'recoveryUsed', coalesce(ps.recovery_uses, 0)
  )
  from (select 1) seed
  left join public.pair_streaks ps on ps.pair_id = target_pair_id;
$$;

revoke all on function public.pair_streak_payload(uuid) from public, anon, authenticated;

create function public.record_pair_streak_completion(
  target_pair_id uuid,
  target_moment_id uuid,
  target_local_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_streak public.pair_streaks%rowtype;
  previous_local_date date;
  gap integer;
  next_current integer;
  next_recovery_uses integer;
begin
  perform 1
  from public.pairs
  where id = target_pair_id
  for update;

  insert into public.streak_completions (moment_id, pair_id, local_date)
  values (target_moment_id, target_pair_id, target_local_date)
  on conflict do nothing;

  if not found then
    return;
  end if;

  insert into public.pair_streaks (pair_id)
  values (target_pair_id)
  on conflict (pair_id) do nothing;

  select *
  into selected_streak
  from public.pair_streaks
  where pair_id = target_pair_id
  for update;

  previous_local_date := selected_streak.last_completed_local_date;
  next_recovery_uses := selected_streak.recovery_uses;

  if previous_local_date is null then
    next_current := 1;
  else
    gap := target_local_date - previous_local_date;
    if gap <= 0 then
      return;
    elsif gap = 1 then
      next_current := selected_streak.current_count + 1;
    elsif gap = 2 and selected_streak.recovery_uses < 1 then
      next_current := selected_streak.current_count + 1;
      next_recovery_uses := selected_streak.recovery_uses + 1;
    else
      next_current := 1;
    end if;
  end if;

  update public.pair_streaks
  set current_count = next_current,
      best_count = greatest(selected_streak.best_count, next_current),
      last_completed_local_date = target_local_date,
      recovery_uses = next_recovery_uses
  where pair_id = target_pair_id;
end;
$$;

revoke all on function public.record_pair_streak_completion(uuid, uuid, date)
  from public, anon, authenticated;

create table public.important_dates (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  kind text not null check (kind in ('trip', 'custom')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  date date not null,
  recurrence text not null default 'once' check (recurrence in ('once', 'yearly')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index important_dates_pair_date_idx
  on public.important_dates (pair_id, date asc);

create function public.set_important_date_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_important_date_updated_at() from public, anon, authenticated;

create trigger important_dates_set_updated_at
before update on public.important_dates
for each row execute function public.set_important_date_updated_at();

create function public.important_date_for_year(target_date date, target_year integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  target_day integer := extract(day from target_date)::integer;
  target_month integer := extract(month from target_date)::integer;
begin
  if target_month = 2
    and target_day = 29
    and not (
      mod(target_year, 400) = 0
      or (mod(target_year, 4) = 0 and mod(target_year, 100) <> 0)
    ) then
    target_day := 28;
  end if;
  return make_date(target_year, target_month, target_day);
end;
$$;

revoke all on function public.important_date_for_year(date, integer)
  from public, anon, authenticated;

create function public.next_yearly_important_date(target_date date, today date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when public.important_date_for_year(target_date, extract(year from today)::integer) < today
      then public.important_date_for_year(target_date, extract(year from today)::integer + 1)
    else public.important_date_for_year(target_date, extract(year from today)::integer)
  end;
$$;

revoke all on function public.next_yearly_important_date(date, date)
  from public, anon, authenticated;

create function public.important_date_payload(target_date public.important_dates)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target_date.id,
    'pairId', target_date.pair_id,
    'kind', target_date.kind,
    'name', target_date.name,
    'date', target_date.date,
    'recurrence', target_date.recurrence
  );
$$;

revoke all on function public.important_date_payload(public.important_dates)
  from public, anon, authenticated;

create function public.important_dates_for_pair(target_pair_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(public.important_date_payload(d) order by d.date, d.created_at, d.id),
    '[]'::jsonb
  )
  from public.important_dates d
  where d.pair_id = target_pair_id;
$$;

revoke all on function public.important_dates_for_pair(uuid)
  from public, anon, authenticated;

create function public.next_important_date_for_pair(target_pair_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  selected_pair public.pairs%rowtype;
  pair_time_zone text;
  pair_local_date date;
  selected_candidate record;
begin
  select p.*
  into selected_pair
  from public.pairs p
  where p.id = target_pair_id
    and p.status = 'active'
    and exists (
      select 1
      from public.pair_memberships pm
      where pm.pair_id = p.id and pm.ended_at is null
    );

  if selected_pair.id is null then
    return null;
  end if;

  pair_time_zone := case
    when exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = coalesce(selected_pair.time_zone, 'UTC')
    ) then coalesce(selected_pair.time_zone, 'UTC')
    else 'UTC'
  end;
  pair_local_date := (now() at time zone pair_time_zone)::date;

  select *
  into selected_candidate
  from (
    select
      'anniversary'::text as kind,
      ('anniversary:' || selected_pair.id::text) as id,
      ''::text as name,
      public.next_yearly_important_date(selected_pair.anniversary, pair_local_date) as occurrence,
      'yearly'::text as recurrence,
      null::uuid as owner_user_id
    union all
    select
      'birthday'::text,
      ('birthday:' || pm.user_id::text),
      pr.display_name,
      public.next_yearly_important_date(pr.birth_date, pair_local_date),
      'yearly'::text,
      pm.user_id
    from public.pair_memberships pm
    join public.profiles pr on pr.id = pm.user_id
    where pm.pair_id = selected_pair.id
      and pm.ended_at is null
      and pr.birth_date is not null
    union all
    select
      d.kind,
      d.id::text,
      d.name,
      case
        when d.recurrence = 'yearly'
          then public.next_yearly_important_date(d.date, pair_local_date)
        else d.date
      end,
      d.recurrence,
      null::uuid
    from public.important_dates d
    where d.pair_id = selected_pair.id
      and (d.recurrence = 'yearly' or d.date >= pair_local_date)
  ) candidates
  where candidates.occurrence is not null
    and candidates.occurrence >= pair_local_date
  order by candidates.occurrence, candidates.id
  limit 1;

  if selected_candidate.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', selected_candidate.id,
    'kind', selected_candidate.kind,
    'name', selected_candidate.name,
    'date', selected_candidate.occurrence,
    'daysRemaining', selected_candidate.occurrence - pair_local_date,
    'recurrence', selected_candidate.recurrence,
    'ownerUserId', selected_candidate.owner_user_id
  );
end;
$$;

revoke all on function public.next_important_date_for_pair(uuid)
  from public, anon, authenticated;

create or replace function public.pair_state_for_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  selected_pair public.pairs%rowtype;
  selected_invitation public.pair_invitations%rowtype;
  members jsonb;
  invitation jsonb;
  important_dates jsonb;
  next_important_date jsonb;
begin
  select p.*
  into selected_pair
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = target_user_id
  order by
    (pm.ended_at is null) desc,
    coalesce(pm.ended_at, pm.joined_at) desc
  limit 1;

  if selected_pair.id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', pm.user_id,
        'displayName', pr.display_name,
        'avatarKey', coalesce(pr.avatar_key, 'calm'),
        'birthDate', pr.birth_date,
        'role', pm.role
      ) order by pm.joined_at
    ),
    '[]'::jsonb
  )
  into members
  from public.pair_memberships pm
  join public.profiles pr on pr.id = pm.user_id
  where pm.pair_id = selected_pair.id;

  select i.*
  into selected_invitation
  from public.pair_invitations i
  where i.pair_id = selected_pair.id
  order by
    i.created_at desc,
    case i.status
      when 'pending' then 3
      when 'accepted' then 2
      when 'expired' then 1
      else 0
    end desc,
    i.id desc
  limit 1;

  if selected_invitation.id is null then
    invitation := null;
  else
    invitation := jsonb_build_object(
      'id', selected_invitation.id,
      'token', selected_invitation.token,
      'code', substr(selected_invitation.code, 1, 4) || '-' || substr(selected_invitation.code, 5, 4),
      'status', case
        when selected_invitation.status = 'pending'
          and selected_invitation.expires_at <= now() then 'expired'
        else selected_invitation.status
      end,
      'expiresAt', selected_invitation.expires_at
    );
  end if;

  if selected_pair.status = 'active' then
    important_dates := public.important_dates_for_pair(selected_pair.id);
    next_important_date := public.next_important_date_for_pair(selected_pair.id);
  else
    important_dates := '[]'::jsonb;
    next_important_date := null;
  end if;

  return jsonb_build_object(
    'id', selected_pair.id,
    'anniversary', selected_pair.anniversary,
    'status', selected_pair.status,
    'timeZone', coalesce(selected_pair.time_zone, 'UTC'),
    'members', members,
    'invitation', invitation,
    'importantDates', important_dates,
    'nextImportantDate', next_important_date
  );
end;
$$;

revoke all on function public.pair_state_for_user(uuid) from public, anon, authenticated;

create or replace function public.dissolve_pair()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
begin
  select p.id
  into selected_pair_id
  from public.pairs p
  join public.pair_memberships pm on pm.pair_id = p.id
  where pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status in ('waiting', 'active')
  for update of p;

  if selected_pair_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  update public.pairs
  set status = 'archived', dissolved_at = now()
  where id = selected_pair_id;

  update public.pair_memberships
  set ended_at = now()
  where pair_id = selected_pair_id and ended_at is null;

  update public.pair_invitations
  set status = 'cancelled', cancelled_at = now()
  where pair_id = selected_pair_id and status = 'pending';

  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.dissolve_pair() from public, anon;
grant execute on function public.dissolve_pair() to authenticated;

create function public.create_important_date(
  date_kind text,
  date_name text,
  date_value date,
  date_recurrence text default 'once'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
  pair_time_zone text;
  pair_local_date date;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.id, case
    when exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = coalesce(p.time_zone, 'UTC')
    ) then coalesce(p.time_zone, 'UTC')
    else 'UTC'
  end
  into selected_pair_id, pair_time_zone
  from public.pairs p
  join public.pair_memberships pm on pm.pair_id = p.id
  where pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status = 'active';

  if selected_pair_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  pair_local_date := (now() at time zone coalesce(pair_time_zone, 'UTC'))::date;
  if date_kind not in ('trip', 'custom')
    or date_recurrence not in ('once', 'yearly')
    or date_name is null
    or char_length(btrim(date_name)) not between 1 and 80
    or date_value is null
    or date_value <= pair_local_date then
    return jsonb_build_object('error', 'invalid_important_date');
  end if;

  insert into public.important_dates (pair_id, kind, name, date, recurrence, created_by)
  values (
    selected_pair_id,
    date_kind,
    btrim(date_name),
    date_value,
    date_recurrence,
    current_user_id
  );

  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.create_important_date(text, text, date, text)
  from public, anon;
grant execute on function public.create_important_date(text, text, date, text)
  to authenticated;

create function public.update_important_date(
  target_date_id uuid,
  date_kind text,
  date_name text,
  date_value date,
  date_recurrence text default 'once'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_date public.important_dates%rowtype;
  pair_time_zone text;
  pair_local_date date;
begin
  select d.*
  into selected_date
  from public.important_dates d
  join public.pair_memberships pm on pm.pair_id = d.pair_id
  join public.pairs p on p.id = d.pair_id
  where d.id = target_date_id
    and pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status = 'active'
  for update of d;

  if selected_date.id is null then
    return jsonb_build_object('error', 'important_date_not_found');
  end if;

  select case
    when exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = coalesce(p.time_zone, 'UTC')
    ) then coalesce(p.time_zone, 'UTC')
    else 'UTC'
  end
  into pair_time_zone
  from public.pairs p
  where p.id = selected_date.pair_id;
  pair_local_date := (now() at time zone coalesce(pair_time_zone, 'UTC'))::date;

  if date_kind not in ('trip', 'custom')
    or date_recurrence not in ('once', 'yearly')
    or date_name is null
    or char_length(btrim(date_name)) not between 1 and 80
    or date_value is null
    or date_value <= pair_local_date then
    return jsonb_build_object('error', 'invalid_important_date');
  end if;

  update public.important_dates
  set kind = date_kind,
      name = btrim(date_name),
      date = date_value,
      recurrence = date_recurrence
  where id = selected_date.id;

  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.update_important_date(uuid, text, text, date, text)
  from public, anon;
grant execute on function public.update_important_date(uuid, text, text, date, text)
  to authenticated;

create function public.delete_important_date(target_date_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if not exists (
    select 1
    from public.important_dates d
    join public.pair_memberships pm on pm.pair_id = d.pair_id
    join public.pairs p on p.id = d.pair_id
    where d.id = target_date_id
      and pm.user_id = current_user_id
      and pm.ended_at is null
      and p.status = 'active'
  ) then
    return jsonb_build_object('error', 'important_date_not_found');
  end if;

  delete from public.important_dates where id = target_date_id;
  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.delete_important_date(uuid) from public, anon;
grant execute on function public.delete_important_date(uuid) to authenticated;

create function public.get_important_date_widget()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
begin
  select pm.pair_id
  into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status = 'active'
  limit 1;

  if selected_pair_id is null then
    return null;
  end if;
  return public.next_important_date_for_pair(selected_pair_id);
end;
$$;

revoke all on function public.get_important_date_widget() from public, anon;
grant execute on function public.get_important_date_widget() to authenticated;

create or replace function public.moment_payload_for_user(
  target_moment_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  selected_moment public.moments%rowtype;
  selected_prompt public.prompt_concepts%rowtype;
  selected_memory public.memories%rowtype;
  own_contribution public.contributions%rowtype;
  partner_contribution public.contributions%rowtype;
  partner_profile public.profiles%rowtype;
  target_locale text;
  partner_submitted boolean := false;
begin
  select *
  into selected_moment
  from public.moments
  where id = target_moment_id;

  if selected_moment.id is null then
    return jsonb_build_object('error', 'moment_not_found');
  end if;

  if not exists (
    select 1
    from public.pair_memberships pm
    join public.pairs p on p.id = pm.pair_id
    where pm.pair_id = selected_moment.pair_id
      and pm.user_id = target_user_id
      and pm.ended_at is null
      and p.status = 'active'
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select * into selected_prompt
  from public.prompt_concepts
  where concept_key = selected_moment.prompt_concept_key;

  select locale into target_locale
  from public.profiles
  where id = target_user_id;

  select pr.*
  into partner_profile
  from public.pair_memberships pm
  join public.profiles pr on pr.id = pm.user_id
  where pm.pair_id = selected_moment.pair_id
    and pm.user_id != target_user_id
    and pm.ended_at is null
  order by pm.joined_at
  limit 1;

  select * into own_contribution
  from public.contributions
  where moment_id = selected_moment.id and user_id = target_user_id;

  select exists (
    select 1 from public.contributions
    where moment_id = selected_moment.id and user_id != target_user_id
  ) into partner_submitted;

  if selected_moment.status = 'revealed' then
    select * into partner_contribution
    from public.contributions
    where moment_id = selected_moment.id and user_id != target_user_id
    order by submitted_at
    limit 1;
  end if;

  select * into selected_memory
  from public.memories
  where moment_id = selected_moment.id;

  return jsonb_build_object(
    'id', selected_moment.id,
    'pairId', selected_moment.pair_id,
    'localDate', selected_moment.local_date,
    'format', selected_moment.format,
    'status', selected_moment.status,
    'isFree', selected_moment.is_free,
    'normalExpiresAt', selected_moment.normal_expires_at,
    'recoveryExpiresAt', selected_moment.recovery_expires_at,
    'window', case
      when selected_moment.status in ('ready', 'revealed') then 'complete'
      when selected_moment.status = 'expired_incomplete' then 'expired'
      when now() < selected_moment.normal_expires_at then 'normal'
      when now() < selected_moment.recovery_expires_at then 'recovery'
      else 'expired'
    end,
    'prompt', jsonb_build_object(
      'conceptKey', selected_prompt.concept_key,
      'text', case when target_locale = 'en' then selected_prompt.prompt_en else selected_prompt.prompt_es end,
      'responseType', selected_prompt.response_type,
      'options', selected_prompt.response_options
    ),
    'ownContribution', public.contribution_payload(own_contribution),
    'partner', case
      when partner_profile.id is null then null
      else jsonb_build_object(
        'userId', partner_profile.id,
        'displayName', partner_profile.display_name,
        'avatarKey', coalesce(partner_profile.avatar_key, 'calm'),
        'submitted', partner_submitted,
        'contribution', case
          when selected_moment.status = 'revealed'
            then public.contribution_payload(partner_contribution)
          else null
        end
      )
    end,
    'memoryId', selected_memory.id,
    'pomState', selected_memory.pom_state,
    'streak', public.pair_streak_payload(selected_moment.pair_id)
  );
end;
$$;

revoke all on function public.moment_payload_for_user(uuid, uuid)
  from public, anon, authenticated;

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
  free_moment boolean;
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

  update public.moments
  set status = 'expired_incomplete'
  where pair_id = selected_pair_id
    and status in ('open', 'partially_submitted')
    and recovery_expires_at <= now();

  select id
  into selected_moment_id
  from public.moments
  where pair_id = selected_pair_id
    and (
      status = 'ready'
      or (
        status in ('open', 'partially_submitted')
        and recovery_expires_at > now()
      )
    )
  order by local_date asc
  limit 1;

  if selected_moment_id is null then
    select id
    into selected_moment_id
    from public.moments
    where pair_id = selected_pair_id and local_date = selected_local_date;
  end if;

  if selected_moment_id is null
    and exists (
      select 1
      from public.memories
      where pair_id = selected_pair_id
    )
    and not public.pair_has_premium(selected_pair_id) then
    return jsonb_build_object('error', 'premium_required');
  end if;

  if selected_moment_id is null then
    select * into selected_prompt
    from public.prompt_concepts
    where concept_key = 'small_gesture_smile' and active;

    if selected_prompt.concept_key is null then
      return jsonb_build_object('error', 'prompt_unavailable');
    end if;

    select not exists (
      select 1 from public.memories where pair_id = selected_pair_id
    ) into free_moment;

    insert into public.moments (
      pair_id, prompt_concept_key, format, local_date, is_free
    ) values (
      selected_pair_id, selected_prompt.concept_key, selected_prompt.format,
      selected_local_date, free_moment
    )
    on conflict (pair_id, local_date) do nothing
    returning id into selected_moment_id;

    if selected_moment_id is null then
      select id into selected_moment_id
      from public.moments
      where pair_id = selected_pair_id and local_date = selected_local_date;
    end if;
  end if;

  return public.moment_payload_for_user(selected_moment_id, current_user_id);
end;
$$;

revoke all on function public.get_daily_moment() from public, anon;
grant execute on function public.get_daily_moment() to authenticated;

create or replace function public.submit_question_contribution(
  target_moment_id uuid,
  response_text text default null,
  response_choice text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  selected_prompt public.prompt_concepts%rowtype;
  existing_contribution public.contributions%rowtype;
  contribution_count bigint;
  normalized_text text := nullif(btrim(response_text), '');
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select m.*
  into selected_moment
  from public.moments m
  join public.pair_memberships pm on pm.pair_id = m.pair_id
  join public.pairs p on p.id = m.pair_id
  where m.id = target_moment_id
    and pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status = 'active'
  for update of m;

  if selected_moment.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if selected_moment.format != 'question' then
    return jsonb_build_object('error', 'invalid_format');
  end if;
  if selected_moment.status in ('revealed', 'expired_incomplete') then
    return jsonb_build_object('error', 'moment_closed');
  end if;
  if selected_moment.recovery_expires_at <= now() then
    update public.moments
    set status = 'expired_incomplete'
    where id = selected_moment.id;
    return jsonb_build_object('error', 'moment_closed');
  end if;

  select * into existing_contribution
  from public.contributions
  where moment_id = selected_moment.id and user_id = current_user_id;

  if existing_contribution.id is not null then
    return public.moment_payload_for_user(selected_moment.id, current_user_id);
  end if;

  select * into selected_prompt
  from public.prompt_concepts
  where concept_key = selected_moment.prompt_concept_key;

  if selected_prompt.response_type = 'text' then
    if normalized_text is null
      or char_length(normalized_text) > 1000
      or response_choice is not null then
      return jsonb_build_object('error', 'invalid_response');
    end if;
    response_text := normalized_text;
  else
    if response_text is not null
      or response_choice is null
      or not exists (
        select 1
        from jsonb_array_elements_text(selected_prompt.response_options) option_value
        where option_value = response_choice
      ) then
      return jsonb_build_object('error', 'invalid_response');
    end if;
  end if;

  insert into public.contributions (
    moment_id, user_id, response_text, response_choice
  ) values (
    selected_moment.id, current_user_id, response_text, response_choice
  );

  select count(*) into contribution_count
  from public.contributions
  where moment_id = selected_moment.id;

  if contribution_count = 2 then
    update public.moments
    set status = 'ready', ready_at = coalesce(ready_at, now())
    where id = selected_moment.id;
    perform public.record_pair_streak_completion(
      selected_moment.pair_id,
      selected_moment.id,
      selected_moment.local_date
    );
  else
    update public.moments
    set status = 'partially_submitted'
    where id = selected_moment.id;
  end if;

  return public.moment_payload_for_user(selected_moment.id, current_user_id);
end;
$$;

revoke all on function public.submit_question_contribution(uuid, text, text)
  from public, anon;
grant execute on function public.submit_question_contribution(uuid, text, text)
  to authenticated;

alter table public.pair_streaks enable row level security;
alter table public.streak_completions enable row level security;
alter table public.important_dates enable row level security;

revoke all on table public.pair_streaks from anon, authenticated;
revoke all on table public.streak_completions from anon, authenticated;
revoke all on table public.important_dates from anon, authenticated;

grant select on table public.pair_streaks to authenticated;
grant select on table public.important_dates to authenticated;
grant all on table public.pair_streaks to service_role;
grant all on table public.streak_completions to service_role;
grant all on table public.important_dates to service_role;

create policy "Active Pair members read Streak"
  on public.pair_streaks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = pair_streaks.pair_id
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

create policy "Active Pair members read Important Dates"
  on public.important_dates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = important_dates.pair_id
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

alter publication supabase_realtime add table public.pair_streaks, public.important_dates;
