create table public.pair_journal_state (
  pair_id uuid primary key references public.pairs (id) on delete cascade,
  free_entry_consumed boolean not null default false,
  consumed_at timestamptz
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text check (body is null or char_length(body) <= 5000),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  start_time time,
  time_zone text check (time_zone is null or char_length(time_zone) between 1 and 100),
  recurrence text not null default 'once' check (recurrence in ('once', 'yearly')),
  widget_hidden boolean not null default false,
  location_label text,
  location_city text,
  location_country_code text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  client_request_id text not null check (char_length(btrim(client_request_id)) between 1 and 200),
  version bigint not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pair_id, created_by, client_request_id),
  check (
    (location_label is null and latitude is null and longitude is null
      and location_city is null and location_country_code is null)
    or (location_label is not null and latitude is not null and longitude is not null)
  ),
  check (location_label is null or char_length(btrim(location_label)) between 1 and 200),
  check (location_city is null or char_length(btrim(location_city)) between 1 and 120),
  check (location_country_code is null or location_country_code ~ '^[A-Z]{2,3}$')
);

create table public.journal_entry_media (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  client_media_id text not null check (char_length(btrim(client_media_id)) between 1 and 200),
  storage_path text not null unique,
  position integer not null check (position between 0 and 9),
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  mime_type text not null default 'image/jpeg' check (mime_type = 'image/jpeg'),
  created_at timestamptz not null default now(),
  unique (entry_id, created_by, client_media_id),
  unique (entry_id, position)
);

create index journal_entries_pair_history_idx
  on public.journal_entries (pair_id, start_date desc, start_time desc, created_at desc, id desc);

create index journal_entries_pair_map_idx
  on public.journal_entries (pair_id, start_date, id)
  where latitude is not null;

create index journal_entry_media_entry_idx
  on public.journal_entry_media (entry_id, position, id);

alter table public.thread_messages
  add column journal_entry_id uuid references public.journal_entries (id) on delete cascade,
  alter column memory_id drop not null,
  drop constraint if exists thread_messages_memory_id_user_id_client_message_id_key;

alter table public.thread_messages
  add constraint thread_messages_one_target_check check (
    num_nonnulls(memory_id, journal_entry_id) = 1
  );

alter table public.thread_messages
  add constraint thread_messages_memory_client_key
  unique (memory_id, user_id, client_message_id);

create unique index thread_messages_journal_client_idx
  on public.thread_messages (journal_entry_id, user_id, client_message_id)
  where journal_entry_id is not null;

create index thread_messages_journal_created_idx
  on public.thread_messages (journal_entry_id, created_at, id)
  where journal_entry_id is not null;

alter table public.thread_message_events
  add column journal_entry_id uuid references public.journal_entries (id) on delete cascade,
  alter column memory_id drop not null;

alter table public.thread_message_events
  add constraint thread_message_events_one_target_check check (
    num_nonnulls(memory_id, journal_entry_id) = 1
  );

create or replace function public.emit_thread_message_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.thread_message_events (
    memory_id, journal_entry_id, pair_id, message_id, actor_id
  ) values (
    new.memory_id, new.journal_entry_id, new.pair_id, new.id, new.user_id
  ) on conflict (message_id) do nothing;
  return new;
end;
$$;

create function public.journal_entry_payload(target_entry public.journal_entries)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target_entry.id,
    'pairId', target_entry.pair_id,
    'title', target_entry.title,
    'body', target_entry.body,
    'startDate', target_entry.start_date,
    'endDate', target_entry.end_date,
    'startTime', target_entry.start_time,
    'timeZone', target_entry.time_zone,
    'recurrence', target_entry.recurrence,
    'widgetHidden', target_entry.widget_hidden,
    'location', case when target_entry.latitude is null then null else jsonb_build_object(
      'label', target_entry.location_label,
      'city', target_entry.location_city,
      'countryCode', target_entry.location_country_code,
      'latitude', target_entry.latitude,
      'longitude', target_entry.longitude
    ) end,
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', media.id,
        'createdBy', media.created_by,
        'path', media.storage_path,
        'position', media.position,
        'width', media.width,
        'height', media.height,
        'mimeType', media.mime_type
      ) order by media.position, media.id)
      from public.journal_entry_media media
      where media.entry_id = target_entry.id
    ), '[]'::jsonb),
    'createdBy', target_entry.created_by,
    'updatedBy', target_entry.updated_by,
    'version', target_entry.version,
    'createdAt', target_entry.created_at,
    'updatedAt', target_entry.updated_at
  );
$$;

revoke all on function public.journal_entry_payload(public.journal_entries)
  from public, anon, authenticated;

create function public.get_journal_entries()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair public.pairs%rowtype;
  allowance_consumed boolean := false;
  entries jsonb;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.* into selected_pair
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  order by pm.joined_at desc
  limit 1;

  if selected_pair.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select coalesce(free_entry_consumed, false) into allowance_consumed
  from public.pair_journal_state
  where pair_id = selected_pair.id;

  select coalesce(jsonb_agg(public.journal_entry_payload(entry)
    order by entry.start_date desc, entry.start_time desc nulls last, entry.created_at desc, entry.id desc), '[]'::jsonb)
  into entries
  from public.journal_entries entry
  where entry.pair_id = selected_pair.id;

  return jsonb_build_object(
    'entries', entries,
    'freeEntryConsumed', allowance_consumed,
    'canCreate', selected_pair.status = 'active'
      and (not allowance_consumed or public.pair_has_premium(selected_pair.id)),
    'isPremium', public.pair_has_premium(selected_pair.id),
    'readOnly', selected_pair.status != 'active'
  );
end;
$$;

revoke all on function public.get_journal_entries() from public, anon;
grant execute on function public.get_journal_entries() to authenticated;

create function public.get_journal_access()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair public.pairs%rowtype;
  allowance_consumed boolean := false;
begin
  select p.* into selected_pair
  from public.pair_memberships membership
  join public.pairs p on p.id = membership.pair_id
  where membership.user_id = current_user_id and p.status in ('active', 'archived')
  order by (membership.ended_at is null) desc, membership.joined_at desc
  limit 1;
  if selected_pair.id is null then return jsonb_build_object('error', 'not_allowed'); end if;
  select coalesce(free_entry_consumed, false) into allowance_consumed
  from public.pair_journal_state where pair_id = selected_pair.id;
  return jsonb_build_object(
    'freeEntryConsumed', allowance_consumed,
    'canCreate', selected_pair.status = 'active'
      and (not allowance_consumed or public.pair_has_premium(selected_pair.id)),
    'isPremium', public.pair_has_premium(selected_pair.id),
    'readOnly', selected_pair.status != 'active'
  );
end;
$$;

revoke all on function public.get_journal_access() from public, anon;
grant execute on function public.get_journal_access() to authenticated;

create function public.create_journal_entry(
  target_title text,
  target_body text,
  target_start_date date,
  target_end_date date,
  target_start_time time,
  target_time_zone text,
  target_recurrence text,
  target_widget_hidden boolean,
  target_location jsonb,
  target_client_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair public.pairs%rowtype;
  existing_entry public.journal_entries%rowtype;
  inserted_entry public.journal_entries%rowtype;
  allowance public.pair_journal_state%rowtype;
  normalized_title text := nullif(btrim(target_title), '');
  normalized_body text := nullif(btrim(target_body), '');
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.* into selected_pair
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id and pm.ended_at is null and p.status = 'active'
  order by pm.joined_at desc
  limit 1;

  if selected_pair.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select * into existing_entry
  from public.journal_entries
  where pair_id = selected_pair.id
    and created_by = current_user_id
    and client_request_id = target_client_request_id;
  if existing_entry.id is not null then
    return public.journal_entry_payload(existing_entry);
  end if;

  if normalized_title is null or char_length(normalized_title) > 120
    or normalized_body is not null and char_length(normalized_body) > 5000
    or target_start_date is null
    or target_end_date is not null and target_end_date < target_start_date
    or target_recurrence not in ('once', 'yearly')
    or target_client_request_id is null or char_length(btrim(target_client_request_id)) not between 1 and 200
    or target_location is not null and (
      coalesce(target_location ->> 'label', '') = ''
      or target_location ->> 'countryCode' is not null
        and target_location ->> 'countryCode' !~ '^[A-Z]{2,3}$'
      or (target_location ->> 'latitude')::double precision not between -90 and 90
      or (target_location ->> 'longitude')::double precision not between -180 and 180
    ) then
    return jsonb_build_object('error', 'invalid_entry');
  end if;

  insert into public.pair_journal_state (pair_id)
  values (selected_pair.id)
  on conflict (pair_id) do nothing;

  select * into allowance
  from public.pair_journal_state
  where pair_id = selected_pair.id
  for update;

  if allowance.free_entry_consumed and not public.pair_has_premium(selected_pair.id) then
    return jsonb_build_object('error', 'premium_required');
  end if;

  insert into public.journal_entries (
    pair_id, created_by, updated_by, title, body, start_date, end_date, start_time,
    time_zone, recurrence, widget_hidden, location_label, location_city,
    location_country_code, latitude, longitude, client_request_id
  ) values (
    selected_pair.id, current_user_id, current_user_id, normalized_title, normalized_body,
    target_start_date, target_end_date, target_start_time, nullif(btrim(target_time_zone), ''),
    target_recurrence, coalesce(target_widget_hidden, false), target_location ->> 'label',
    target_location ->> 'city', target_location ->> 'countryCode',
    (target_location ->> 'latitude')::double precision,
    (target_location ->> 'longitude')::double precision, target_client_request_id
  )
  on conflict (pair_id, created_by, client_request_id) do nothing
  returning * into inserted_entry;

  if inserted_entry.id is null then
    select * into inserted_entry from public.journal_entries
    where pair_id = selected_pair.id and created_by = current_user_id
      and client_request_id = target_client_request_id;
  else
    update public.pair_journal_state
    set free_entry_consumed = true, consumed_at = coalesce(consumed_at, now())
    where pair_id = selected_pair.id;
  end if;

  return public.journal_entry_payload(inserted_entry);
exception when invalid_text_representation then
  return jsonb_build_object('error', 'invalid_entry');
end;
$$;

revoke all on function public.create_journal_entry(text, text, date, date, time, text, text, boolean, jsonb, text)
  from public, anon;
grant execute on function public.create_journal_entry(text, text, date, date, time, text, text, boolean, jsonb, text)
  to authenticated;

create function public.update_journal_entry(
  target_entry_id uuid,
  expected_version bigint,
  target_title text,
  target_body text,
  target_start_date date,
  target_end_date date,
  target_start_time time,
  target_time_zone text,
  target_recurrence text,
  target_widget_hidden boolean,
  target_location jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_entry public.journal_entries%rowtype;
  selected_pair public.pairs%rowtype;
  updated_entry public.journal_entries%rowtype;
  normalized_title text := nullif(btrim(target_title), '');
  normalized_body text := nullif(btrim(target_body), '');
begin
  select * into selected_entry from public.journal_entries where id = target_entry_id;
  if selected_entry.id is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  select * into selected_pair from public.pairs where id = selected_entry.pair_id;
  if current_user_id is null or selected_pair.status != 'active' or not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_entry.pair_id and user_id = current_user_id and ended_at is null
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if selected_entry.version != expected_version then
    return jsonb_build_object('error', 'conflict', 'current', public.journal_entry_payload(selected_entry));
  end if;
  if normalized_title is null or char_length(normalized_title) > 120
    or normalized_body is not null and char_length(normalized_body) > 5000
    or target_start_date is null
    or target_end_date is not null and target_end_date < target_start_date
    or target_recurrence not in ('once', 'yearly')
    or target_location is not null and (
      coalesce(target_location ->> 'label', '') = ''
      or target_location ->> 'countryCode' is not null
        and target_location ->> 'countryCode' !~ '^[A-Z]{2,3}$'
      or (target_location ->> 'latitude')::double precision not between -90 and 90
      or (target_location ->> 'longitude')::double precision not between -180 and 180
    ) then
    return jsonb_build_object('error', 'invalid_entry');
  end if;

  update public.journal_entries
  set title = normalized_title,
      body = normalized_body,
      start_date = target_start_date,
      end_date = target_end_date,
      start_time = target_start_time,
      time_zone = nullif(btrim(target_time_zone), ''),
      recurrence = target_recurrence,
      widget_hidden = coalesce(target_widget_hidden, false),
      location_label = target_location ->> 'label',
      location_city = target_location ->> 'city',
      location_country_code = target_location ->> 'countryCode',
      latitude = (target_location ->> 'latitude')::double precision,
      longitude = (target_location ->> 'longitude')::double precision,
      version = version + 1,
      updated_by = current_user_id,
      updated_at = now()
  where id = selected_entry.id and version = expected_version
  returning * into updated_entry;

  if updated_entry.id is null then
    select * into selected_entry from public.journal_entries where id = target_entry_id;
    return jsonb_build_object('error', 'conflict', 'current', public.journal_entry_payload(selected_entry));
  end if;
  return public.journal_entry_payload(updated_entry);
exception when invalid_text_representation then
  return jsonb_build_object('error', 'invalid_entry');
end;
$$;

revoke all on function public.update_journal_entry(uuid, bigint, text, text, date, date, time, text, text, boolean, jsonb)
  from public, anon;
grant execute on function public.update_journal_entry(uuid, bigint, text, text, date, date, time, text, text, boolean, jsonb)
  to authenticated;

create function public.delete_journal_entry(target_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_entry public.journal_entries%rowtype;
begin
  select * into selected_entry from public.journal_entries where id = target_entry_id;
  if selected_entry.id is null then
    return jsonb_build_object('deleted', true);
  end if;
  if current_user_id is null or not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_entry.pair_id and user_id = current_user_id
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  delete from public.journal_entries where id = selected_entry.id;
  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function public.delete_journal_entry(uuid) from public, anon;
grant execute on function public.delete_journal_entry(uuid) to authenticated;

create function public.get_journal_map()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
  result jsonb;
begin
  select pm.pair_id into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id and p.status in ('active', 'archived')
  order by pm.joined_at desc limit 1;
  if selected_pair_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  select coalesce(jsonb_agg(public.journal_entry_payload(entry)
    order by entry.start_date, entry.id), '[]'::jsonb) into result
  from public.journal_entries entry
  where entry.pair_id = selected_pair_id and entry.latitude is not null;
  return result;
end;
$$;

revoke all on function public.get_journal_map() from public, anon;
grant execute on function public.get_journal_map() to authenticated;

create function public.get_journal_page(
  page_size integer default 30,
  cursor_date date default null,
  cursor_origin text default null,
  cursor_id uuid default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
  result jsonb;
  normalized_size integer := least(greatest(coalesce(page_size, 30), 1), 100);
begin
  select pm.pair_id into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id and p.status in ('active', 'archived')
  order by (pm.ended_at is null) desc, pm.joined_at desc limit 1;
  if selected_pair_id is null then return jsonb_build_object('error', 'not_allowed'); end if;

  with combined as (
    select entry.start_date as item_date, 'manualEntry'::text as origin, entry.id,
      jsonb_build_object('kind', 'manualEntry', 'item', public.journal_entry_payload(entry)) as payload
    from public.journal_entries entry where entry.pair_id = selected_pair_id
    union all
    select memory.local_date, 'momentMemory'::text, memory.id,
      jsonb_build_object('kind', 'momentMemory', 'item', public.memory_payload_for_user(memory.id, current_user_id))
    from public.memories memory where memory.pair_id = selected_pair_id
  ), page as (
    select * from combined
    where cursor_date is null or item_date < cursor_date
      or (item_date = cursor_date and origin > cursor_origin)
      or (item_date = cursor_date and origin = cursor_origin and id < cursor_id)
    order by item_date desc, origin, id desc
    limit normalized_size
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(payload order by item_date desc, origin, id desc), '[]'::jsonb),
    'nextCursor', case when count(*) = normalized_size then
      (jsonb_agg(jsonb_build_object('date', item_date, 'origin', origin, 'id', id)
        order by item_date desc, origin, id desc) -> (count(*)::integer - 1))
      else null end
  ) into result from page;
  return result;
end;
$$;

revoke all on function public.get_journal_page(integer, date, text, uuid) from public, anon;
grant execute on function public.get_journal_page(integer, date, text, uuid) to authenticated;

create function public.journal_date_in_year(source_date date, target_year integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    target_year,
    extract(month from source_date)::integer,
    least(
      extract(day from source_date)::integer,
      extract(day from (
        make_date(target_year, extract(month from source_date)::integer, 1)
        + interval '1 month - 1 day'
      ))::integer
    )
  );
$$;

create function public.get_journal_calendar(range_start date, range_end date)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair public.pairs%rowtype;
  result jsonb;
begin
  if range_start is null or range_end is null or range_end < range_start
    or range_end - range_start > 1096 then return jsonb_build_object('error', 'invalid_range'); end if;
  select p.* into selected_pair from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id and p.status in ('active', 'archived')
  order by (pm.ended_at is null) desc, pm.joined_at desc limit 1;
  if selected_pair.id is null then return jsonb_build_object('error', 'not_allowed'); end if;

  with years as (
    select generate_series(extract(year from range_start)::integer, extract(year from range_end)::integer) as year
  ), occurrences as (
    select 'manualEntry'::text as kind, entry.id, entry.start_date,
      coalesce(entry.end_date, entry.start_date) as end_date, entry.title as name,
      public.journal_entry_payload(entry) as item
    from public.journal_entries entry
    where entry.pair_id = selected_pair.id and entry.recurrence = 'once'
      and entry.start_date <= range_end and coalesce(entry.end_date, entry.start_date) >= range_start
    union all
    select 'manualEntry', entry.id, public.journal_date_in_year(entry.start_date, years.year),
      public.journal_date_in_year(entry.start_date, years.year) + (coalesce(entry.end_date, entry.start_date) - entry.start_date),
      entry.title, public.journal_entry_payload(entry)
    from public.journal_entries entry cross join years
    where entry.pair_id = selected_pair.id and entry.recurrence = 'yearly'
      and public.journal_date_in_year(entry.start_date, years.year) <= range_end
      and public.journal_date_in_year(entry.start_date, years.year) + (coalesce(entry.end_date, entry.start_date) - entry.start_date) >= range_start
    union all
    select 'momentMemory', memory.id, memory.local_date, memory.local_date,
      case when (select locale from public.profiles where id = current_user_id) = 'en'
        then memory.prompt_en else memory.prompt_es end,
      public.memory_payload_for_user(memory.id, current_user_id)
    from public.memories memory
    where memory.pair_id = selected_pair.id and memory.local_date between range_start and range_end
    union all
    select 'milestone', selected_pair.id, public.journal_date_in_year(selected_pair.anniversary, years.year),
      public.journal_date_in_year(selected_pair.anniversary, years.year), 'anniversary', null
    from years
    where public.journal_date_in_year(selected_pair.anniversary, years.year) between range_start and range_end
    union all
    select 'milestone', profile.id, public.journal_date_in_year(profile.birth_date, years.year),
      public.journal_date_in_year(profile.birth_date, years.year), profile.display_name, null
    from public.pair_memberships membership
    join public.profiles profile on profile.id = membership.user_id
    cross join years
    where membership.pair_id = selected_pair.id and profile.birth_date is not null
      and public.journal_date_in_year(profile.birth_date, years.year) between range_start and range_end
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', kind, 'id', id, 'startDate', start_date, 'endDate', end_date, 'name', name, 'item', item
  ) order by start_date, kind, id), '[]'::jsonb) into result from occurrences;
  return result;
end;
$$;

revoke all on function public.journal_date_in_year(date, integer) from public, anon, authenticated;
revoke all on function public.get_journal_calendar(date, date) from public, anon;
grant execute on function public.get_journal_calendar(date, date) to authenticated;

create function public.get_journal_thread(target_entry_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_entry public.journal_entries%rowtype;
  selected_pair public.pairs%rowtype;
  messages jsonb;
begin
  select * into selected_entry from public.journal_entries where id = target_entry_id;
  if selected_entry.id is null then return jsonb_build_object('error', 'not_found'); end if;
  select * into selected_pair from public.pairs where id = selected_entry.pair_id;
  if current_user_id is null or not exists (
    select 1 from public.pair_memberships where pair_id = selected_entry.pair_id and user_id = current_user_id
  ) then return jsonb_build_object('error', 'not_allowed'); end if;
  select coalesce(jsonb_agg(public.thread_message_payload(message)
    order by message.created_at, message.id), '[]'::jsonb) into messages
  from public.thread_messages message where message.journal_entry_id = selected_entry.id;
  return jsonb_build_object(
    'journalEntryId', selected_entry.id,
    'canWrite', selected_pair.status = 'active' and exists (
      select 1 from public.pair_memberships
      where pair_id = selected_entry.pair_id and user_id = current_user_id and ended_at is null
    ),
    'messages', messages
  );
end;
$$;

revoke all on function public.get_journal_thread(uuid) from public, anon;
grant execute on function public.get_journal_thread(uuid) to authenticated;

create function public.send_journal_thread_message(
  target_entry_id uuid,
  message_body text,
  target_client_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_entry public.journal_entries%rowtype;
  selected_pair public.pairs%rowtype;
  existing_message public.thread_messages%rowtype;
  inserted_message public.thread_messages%rowtype;
  normalized_body text := nullif(btrim(message_body), '');
begin
  select * into selected_entry from public.journal_entries where id = target_entry_id;
  if selected_entry.id is null then return jsonb_build_object('error', 'not_found'); end if;
  select * into selected_pair from public.pairs where id = selected_entry.pair_id;
  if current_user_id is null or selected_pair.status != 'active' or not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_entry.pair_id and user_id = current_user_id and ended_at is null
  ) then return jsonb_build_object('error', 'not_allowed'); end if;
  if normalized_body is null or char_length(normalized_body) > 2000
    or target_client_message_id is null or char_length(btrim(target_client_message_id)) = 0 then
    return jsonb_build_object('error', 'invalid_message');
  end if;
  select * into existing_message from public.thread_messages
  where journal_entry_id = selected_entry.id and user_id = current_user_id
    and client_message_id = target_client_message_id;
  if existing_message.id is not null then return public.thread_message_payload(existing_message); end if;
  insert into public.thread_messages (
    journal_entry_id, pair_id, user_id, client_message_id, body
  ) values (
    selected_entry.id, selected_entry.pair_id, current_user_id, target_client_message_id, normalized_body
  ) on conflict (journal_entry_id, user_id, client_message_id) where journal_entry_id is not null do nothing
  returning * into inserted_message;
  if inserted_message.id is null then
    select * into inserted_message from public.thread_messages
    where journal_entry_id = selected_entry.id and user_id = current_user_id
      and client_message_id = target_client_message_id;
  end if;
  return public.thread_message_payload(inserted_message);
end;
$$;

revoke all on function public.send_journal_thread_message(uuid, text, text) from public, anon;
grant execute on function public.send_journal_thread_message(uuid, text, text) to authenticated;

create function public.add_journal_entry_media(
  target_entry_id uuid,
  target_client_media_id text,
  target_storage_path text,
  target_position integer,
  target_width integer,
  target_height integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_entry public.journal_entries%rowtype;
  existing_media public.journal_entry_media%rowtype;
  inserted_media public.journal_entry_media%rowtype;
begin
  select * into selected_entry from public.journal_entries where id = target_entry_id for update;
  if selected_entry.id is null then return jsonb_build_object('error', 'not_found'); end if;
  if current_user_id is null or not exists (
    select 1 from public.pair_memberships pm join public.pairs p on p.id = pm.pair_id
    where pm.pair_id = selected_entry.pair_id and pm.user_id = current_user_id
      and pm.ended_at is null and p.status = 'active'
  ) then return jsonb_build_object('error', 'not_allowed'); end if;
  select * into existing_media from public.journal_entry_media
  where entry_id = selected_entry.id and created_by = current_user_id
    and client_media_id = target_client_media_id;
  if existing_media.id is not null then
    return jsonb_build_object('id', existing_media.id, 'path', existing_media.storage_path);
  end if;
  if (select count(*) from public.journal_entry_media where entry_id = selected_entry.id) >= 10
    or target_position not between 0 and 9 or target_width not between 1 and 10000
    or target_height not between 1 and 10000 or char_length(btrim(target_storage_path)) = 0 then
    return jsonb_build_object('error', 'invalid_media');
  end if;
  insert into public.journal_entry_media (
    entry_id, pair_id, created_by, client_media_id, storage_path, position, width, height
  ) values (
    selected_entry.id, selected_entry.pair_id, current_user_id, target_client_media_id,
    target_storage_path, target_position, target_width, target_height
  ) returning * into inserted_media;
  return jsonb_build_object('id', inserted_media.id, 'path', inserted_media.storage_path);
end;
$$;

revoke all on function public.add_journal_entry_media(uuid, text, text, integer, integer, integer)
  from public, anon;
grant execute on function public.add_journal_entry_media(uuid, text, text, integer, integer, integer)
  to authenticated;

create function public.remove_journal_entry_media(target_media_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_media public.journal_entry_media%rowtype;
begin
  select * into selected_media from public.journal_entry_media where id = target_media_id;
  if selected_media.id is null then return jsonb_build_object('removed', true); end if;
  if current_user_id is null or not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_media.pair_id and user_id = current_user_id
  ) then return jsonb_build_object('error', 'not_allowed'); end if;
  delete from public.journal_entry_media where id = selected_media.id;
  return jsonb_build_object('removed', true, 'path', selected_media.storage_path);
end;
$$;

revoke all on function public.remove_journal_entry_media(uuid) from public, anon;
grant execute on function public.remove_journal_entry_media(uuid) to authenticated;

alter table public.pair_journal_state enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_media enable row level security;

revoke all on table public.pair_journal_state from anon, authenticated;
revoke all on table public.journal_entries from anon, authenticated;
revoke all on table public.journal_entry_media from anon, authenticated;
grant select on table public.journal_entries, public.journal_entry_media to authenticated;
grant all on table public.pair_journal_state, public.journal_entries, public.journal_entry_media to service_role;

create policy "Pair members read Journal Entries"
  on public.journal_entries for select to authenticated using (
    exists (select 1 from public.pair_memberships pm
      where pm.pair_id = journal_entries.pair_id and pm.user_id = (select auth.uid()))
  );

create policy "Pair members read Journal media"
  on public.journal_entry_media for select to authenticated using (
    exists (select 1 from public.pair_memberships pm
      where pm.pair_id = journal_entry_media.pair_id and pm.user_id = (select auth.uid()))
  );

insert into storage.buckets (id, name, public)
values ('journal-media', 'journal-media', false)
on conflict (id) do update set public = false;

create policy "Active Pair members upload Journal media"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'journal-media'
    and split_part(name, '/', 3) = (select auth.uid()::text)
    and exists (
      select 1 from public.journal_entries entry
      join public.pair_memberships pm on pm.pair_id = entry.pair_id
      join public.pairs pair on pair.id = entry.pair_id
      where entry.pair_id::text = split_part(name, '/', 1)
        and entry.id::text = split_part(name, '/', 2)
        and pm.user_id = (select auth.uid()) and pm.ended_at is null and pair.status = 'active'
    )
  );

create policy "Pair members read Journal media objects"
  on storage.objects for select to authenticated using (
    bucket_id = 'journal-media'
    and exists (
      select 1 from public.journal_entry_media media
      join public.pair_memberships pm on pm.pair_id = media.pair_id
      where media.storage_path = name and pm.user_id = (select auth.uid())
    )
  );

create policy "Pair members remove Journal media objects"
  on storage.objects for delete to authenticated using (
    bucket_id = 'journal-media'
    and exists (
      select 1 from public.journal_entries entry
      join public.pair_memberships pm on pm.pair_id = entry.pair_id
      where entry.id::text = split_part(name, '/', 2) and pm.user_id = (select auth.uid())
    )
  );

alter publication supabase_realtime add table public.journal_entries, public.journal_entry_media;

alter publication supabase_realtime drop table public.memory_locations, public.important_dates;

create or replace function public.memory_payload_for_user(
  target_memory_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  selected_memory public.memories%rowtype;
  own_contribution public.contributions%rowtype;
  partner_contribution public.contributions%rowtype;
  partner_profile public.profiles%rowtype;
  target_locale text;
  visual_enabled boolean := false;
begin
  select * into selected_memory from public.memories where id = target_memory_id;
  if selected_memory.id is null then return jsonb_build_object('error', 'memory_not_found'); end if;
  if not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_memory.pair_id and user_id = target_user_id
  ) then return jsonb_build_object('error', 'not_allowed'); end if;
  select locale into target_locale from public.profiles where id = target_user_id;
  if selected_memory.format != 'doodle' then
    select * into own_contribution from public.contributions
    where moment_id = selected_memory.moment_id and user_id = target_user_id;
    select * into partner_contribution from public.contributions
    where moment_id = selected_memory.moment_id and user_id != target_user_id
    order by submitted_at limit 1;
  end if;
  select profile.* into partner_profile
  from public.pair_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.pair_id = selected_memory.pair_id and membership.user_id != target_user_id
  order by membership.joined_at limit 1;
  select coalesce((
    select preference.visual_enabled from public.memory_widget_preferences preference
    where preference.memory_id = selected_memory.id and preference.user_id = target_user_id
  ), false) into visual_enabled;
  return jsonb_build_object(
    'id', selected_memory.id,
    'momentId', selected_memory.moment_id,
    'pairId', selected_memory.pair_id,
    'localDate', selected_memory.local_date,
    'format', selected_memory.format,
    'revealedAt', selected_memory.revealed_at,
    'pomState', selected_memory.pom_state,
    'prompt', jsonb_build_object(
      'conceptKey', selected_memory.prompt_concept_key,
      'text', case when target_locale = 'en' then selected_memory.prompt_en else selected_memory.prompt_es end,
      'responseType', selected_memory.response_type,
      'options', selected_memory.response_options
    ),
    'ownContribution', case when selected_memory.format = 'doodle' then null
      else public.contribution_payload(own_contribution) end,
    'partner', case when partner_profile.id is null then null else jsonb_build_object(
      'userId', partner_profile.id,
      'displayName', partner_profile.display_name,
      'avatarKey', coalesce(partner_profile.avatar_key, 'calm'),
      'submitted', true,
      'contribution', case when selected_memory.format = 'doodle' then null
        else public.contribution_payload(partner_contribution) end
    ) end,
    'photoComposition', nullif(selected_memory.photo_composition, '{}'::jsonb),
    'doodleDocument', selected_memory.doodle_document,
    'widgetVisualEnabled', visual_enabled
  );
end;
$$;

create or replace function public.important_dates_for_pair(target_pair_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$ select '[]'::jsonb; $$;

create or replace function public.next_important_date_for_pair(target_pair_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$ select null::jsonb; $$;

drop function public.get_memory_map();
drop function public.set_memory_location(uuid, text, text);
drop function public.remove_memory_location(uuid);
drop function public.create_important_date(text, text, date, text);
drop function public.update_important_date(uuid, text, text, date, text);
drop function public.delete_important_date(uuid);
drop function public.get_important_date_widget();
drop table public.memory_locations cascade;
drop table public.important_dates cascade;
