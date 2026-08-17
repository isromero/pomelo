alter table public.contributions
  add column removed_at timestamptz;

alter table public.contributions
  drop constraint if exists contributions_payload_check;

alter table public.contributions
  add constraint contributions_payload_check check (
    removed_at is not null
    or (
      (
        photo_rear_path is null
        and photo_front_path is null
        and num_nonnulls(response_text, response_choice) = 1
      )
      or (
        photo_rear_path is not null
        and photo_front_path is not null
        and photo_rear_width is not null
        and photo_rear_height is not null
        and photo_front_width is not null
        and photo_front_height is not null
        and num_nonnulls(response_text, response_choice) = 0
      )
    )
  );

create table public.pair_progress (
  pair_id uuid primary key references public.pairs (id) on delete cascade,
  memory_count integer not null default 0 check (memory_count >= 0),
  equipped_accessory text check (
    equipped_accessory is null
    or equipped_accessory in ('ribbon', 'sunhat', 'scarf', 'crown')
  ),
  updated_at timestamptz not null default now()
);

create table public.memory_locations (
  memory_id uuid primary key references public.memories (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  city text not null check (char_length(btrim(city)) between 1 and 120),
  country_code text check (
    country_code is null
    or country_code ~ '^[A-Z]{2,3}$'
  ),
  added_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memory_locations_pair_idx
  on public.memory_locations (pair_id, updated_at desc);

create or replace function public.set_pom_progress_updated_at()
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

revoke all on function public.set_pom_progress_updated_at() from public, anon, authenticated;

create trigger pair_progress_set_updated_at
before update on public.pair_progress
for each row execute function public.set_pom_progress_updated_at();

create trigger memory_locations_set_updated_at
before update on public.memory_locations
for each row execute function public.set_pom_progress_updated_at();

insert into public.pair_progress (pair_id, memory_count)
select pair_id, count(*)::integer
from public.memories
group by pair_id
on conflict (pair_id) do update
set memory_count = greatest(public.pair_progress.memory_count, excluded.memory_count);

create or replace function public.contribution_payload(target_contribution public.contributions)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when target_contribution.id is null then null
    else jsonb_build_object(
      'id', target_contribution.id,
      'userId', target_contribution.user_id,
      'available', target_contribution.removed_at is null,
      'responseText', case
        when target_contribution.removed_at is null then target_contribution.response_text
        else null
      end,
      'responseChoice', case
        when target_contribution.removed_at is null then target_contribution.response_choice
        else null
      end,
      'submittedAt', target_contribution.submitted_at,
      'photo', case
        when target_contribution.removed_at is not null
          or target_contribution.photo_rear_path is null then null
        else jsonb_build_object(
          'rear', jsonb_build_object(
            'path', target_contribution.photo_rear_path,
            'width', target_contribution.photo_rear_width,
            'height', target_contribution.photo_rear_height,
            'mimeType', 'image/jpeg'
          ),
          'front', jsonb_build_object(
            'path', target_contribution.photo_front_path,
            'width', target_contribution.photo_front_width,
            'height', target_contribution.photo_front_height,
            'mimeType', 'image/jpeg'
          )
        )
      end
    )
  end;
$$;

revoke all on function public.contribution_payload(public.contributions)
  from public, anon, authenticated;

create or replace function public.pom_progress_payload(target_pair_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  selected_progress public.pair_progress%rowtype;
  selected_count integer;
  selected_accessory text;
  unlocked jsonb;
begin
  select * into selected_progress
  from public.pair_progress
  where pair_id = target_pair_id;

  if selected_progress.pair_id is null then
    select count(*)::integer into selected_count
    from public.memories
    where pair_id = target_pair_id;
    selected_accessory := null;
  else
    selected_count := selected_progress.memory_count;
    selected_accessory := selected_progress.equipped_accessory;
  end if;

  select coalesce(jsonb_agg(accessory order by milestone), '[]'::jsonb)
  into unlocked
  from (
    values
      ('ribbon'::text, 2),
      ('sunhat'::text, 7),
      ('scarf'::text, 14),
      ('crown'::text, 30)
  ) as accessories(accessory, milestone)
  where milestone <= selected_count;

  if selected_accessory is not null and not (unlocked ? selected_accessory) then
    selected_accessory := null;
  end if;

  return jsonb_build_object(
    'pairId', target_pair_id,
    'memoryCount', selected_count,
    'introduced', selected_count >= 1,
    'equippedAccessory', selected_accessory,
    'unlockedAccessories', unlocked
  );
end;
$$;

revoke all on function public.pom_progress_payload(uuid)
  from public, anon, authenticated;

create function public.record_pom_memory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pair_progress (pair_id, memory_count)
  values (new.pair_id, 1)
  on conflict (pair_id) do update
  set memory_count = public.pair_progress.memory_count + 1;
  return new;
end;
$$;

revoke all on function public.record_pom_memory() from public, anon, authenticated;

create trigger memories_record_pom_progress
after insert on public.memories
for each row execute function public.record_pom_memory();

create function public.get_pom_progress()
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
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.id into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  order by (p.status = 'active') desc, pm.joined_at desc
  limit 1;

  if selected_pair_id is null then
    return jsonb_build_object('error', 'pair_not_active');
  end if;

  return public.pom_progress_payload(selected_pair_id);
end;
$$;

revoke all on function public.get_pom_progress() from public, anon;
grant execute on function public.get_pom_progress() to authenticated;

create function public.set_pom_accessory(target_accessory text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
  selected_count integer;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.id into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  order by (p.status = 'active') desc, pm.joined_at desc
  limit 1;

  if selected_pair_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  if target_accessory is not null
    and target_accessory not in ('ribbon', 'sunhat', 'scarf', 'crown') then
    return jsonb_build_object('error', 'accessory_locked');
  end if;

  select coalesce((select memory_count from public.pair_progress where pair_id = selected_pair_id), 0)
  into selected_count;

  if target_accessory = 'ribbon' and selected_count < 2
    or target_accessory = 'sunhat' and selected_count < 7
    or target_accessory = 'scarf' and selected_count < 14
    or target_accessory = 'crown' and selected_count < 30 then
    return jsonb_build_object('error', 'accessory_locked');
  end if;

  insert into public.pair_progress (pair_id, memory_count, equipped_accessory)
  values (selected_pair_id, selected_count, target_accessory)
  on conflict (pair_id) do update
  set equipped_accessory = excluded.equipped_accessory;

  return public.pom_progress_payload(selected_pair_id);
end;
$$;

revoke all on function public.set_pom_accessory(text) from public, anon;
grant execute on function public.set_pom_accessory(text) to authenticated;

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
  selected_location public.memory_locations%rowtype;
  own_contribution public.contributions%rowtype;
  partner_contribution public.contributions%rowtype;
  partner_profile public.profiles%rowtype;
  target_locale text;
  visual_enabled boolean := false;
begin
  select * into selected_memory from public.memories where id = target_memory_id;

  if selected_memory.id is null then
    return jsonb_build_object('error', 'memory_not_found');
  end if;

  if not exists (
    select 1
    from public.pair_memberships
    where pair_id = selected_memory.pair_id and user_id = target_user_id
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select * into selected_location from public.memory_locations where memory_id = selected_memory.id;
  select locale into target_locale from public.profiles where id = target_user_id;

  if selected_memory.format != 'doodle' then
    select * into own_contribution
    from public.contributions
    where moment_id = selected_memory.moment_id and user_id = target_user_id;
    select * into partner_contribution
    from public.contributions
    where moment_id = selected_memory.moment_id and user_id != target_user_id
    order by submitted_at
    limit 1;
  end if;

  select pr.* into partner_profile
  from public.pair_memberships pm
  join public.profiles pr on pr.id = pm.user_id
  where pm.pair_id = selected_memory.pair_id
    and pm.user_id != target_user_id
  order by pm.joined_at
  limit 1;

  select coalesce(
    (
      select mwp.visual_enabled
      from public.memory_widget_preferences mwp
      where mwp.memory_id = selected_memory.id and mwp.user_id = target_user_id
    ),
    false
  ) into visual_enabled;

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
    'ownContribution', case
      when selected_memory.format = 'doodle' then null
      else public.contribution_payload(own_contribution)
    end,
    'partner', case
      when partner_profile.id is null then null
      else jsonb_build_object(
        'userId', partner_profile.id,
        'displayName', partner_profile.display_name,
        'avatarKey', coalesce(partner_profile.avatar_key, 'calm'),
        'submitted', true,
        'contribution', case
          when selected_memory.format = 'doodle' then null
          else public.contribution_payload(partner_contribution)
        end
      )
    end,
    'location', case
      when selected_location.memory_id is null then null
      else jsonb_build_object(
        'city', selected_location.city,
        'countryCode', selected_location.country_code,
        'addedBy', selected_location.added_by,
        'updatedAt', selected_location.updated_at
      )
    end,
    'photoComposition', nullif(selected_memory.photo_composition, '{}'::jsonb),
    'doodleDocument', selected_memory.doodle_document,
    'widgetVisualEnabled', visual_enabled
  );
end;
$$;

revoke all on function public.memory_payload_for_user(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.get_memory_history()
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
  if current_user_id is null then
    return '[]'::jsonb;
  end if;

  select pm.pair_id into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  order by (pm.ended_at is null) desc, pm.joined_at desc
  limit 1;

  if selected_pair_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      public.memory_payload_for_user(m.id, current_user_id)
      order by m.local_date desc, m.revealed_at desc, m.id desc
    ),
    '[]'::jsonb
  ) into result
  from public.memories m
  where m.pair_id = selected_pair_id;

  return result;
end;
$$;

revoke all on function public.get_memory_history() from public, anon;
grant execute on function public.get_memory_history() to authenticated;

create function public.get_memory_map()
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
  if current_user_id is null then
    return '[]'::jsonb;
  end if;

  select pm.pair_id into selected_pair_id
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  order by (pm.ended_at is null) desc, pm.joined_at desc
  limit 1;

  if selected_pair_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'memoryId', m.id,
        'localDate', m.local_date,
        'revealedAt', m.revealed_at,
        'city', ml.city,
        'countryCode', ml.country_code
      )
      order by m.local_date desc, m.revealed_at desc, m.id desc
    ),
    '[]'::jsonb
  ) into result
  from public.memory_locations ml
  join public.memories m on m.id = ml.memory_id
  where ml.pair_id = selected_pair_id;

  return result;
end;
$$;

revoke all on function public.get_memory_map() from public, anon;
grant execute on function public.get_memory_map() to authenticated;

create function public.set_memory_location(
  target_memory_id uuid,
  target_city text,
  target_country_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_memory public.memories%rowtype;
  selected_pair public.pairs%rowtype;
  normalized_city text := nullif(btrim(target_city), '');
  normalized_country_code text := nullif(upper(btrim(target_country_code)), '');
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if normalized_city is null or char_length(normalized_city) > 120
    or (
      normalized_country_code is not null
      and normalized_country_code !~ '^[A-Z]{2,3}$'
    ) then
    return jsonb_build_object('error', 'invalid_location');
  end if;

  select m.* into selected_memory
  from public.memories m
  join public.pair_memberships pm on pm.pair_id = m.pair_id
  join public.pairs p on p.id = m.pair_id
  where m.id = target_memory_id
    and pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  limit 1;

  if selected_memory.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select * into selected_pair from public.pairs where id = selected_memory.pair_id;
  if selected_pair.status != 'active' then
    return jsonb_build_object('error', 'archive_read_only');
  end if;

  insert into public.memory_locations (
    memory_id, pair_id, city, country_code, added_by
  ) values (
    selected_memory.id,
    selected_memory.pair_id,
    normalized_city,
    normalized_country_code,
    current_user_id
  ) on conflict (memory_id) do update
  set city = excluded.city,
      country_code = excluded.country_code,
      added_by = excluded.added_by,
      updated_at = now();

  return public.memory_payload_for_user(selected_memory.id, current_user_id);
end;
$$;

revoke all on function public.set_memory_location(uuid, text, text) from public, anon;
grant execute on function public.set_memory_location(uuid, text, text) to authenticated;

create function public.remove_memory_location(target_memory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_memory public.memories%rowtype;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select m.* into selected_memory
  from public.memories m
  join public.pair_memberships pm on pm.pair_id = m.pair_id
  join public.pairs p on p.id = m.pair_id
  where m.id = target_memory_id
    and pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  limit 1;

  if selected_memory.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  delete from public.memory_locations where memory_id = selected_memory.id;
  return public.memory_payload_for_user(selected_memory.id, current_user_id);
end;
$$;

revoke all on function public.remove_memory_location(uuid) from public, anon;
grant execute on function public.remove_memory_location(uuid) to authenticated;

create function public.remove_own_contribution(target_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_contribution public.contributions%rowtype;
  selected_memory public.memories%rowtype;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select c.* into selected_contribution
  from public.contributions c
  join public.moments mo on mo.id = c.moment_id
  join public.pair_memberships pm on pm.pair_id = mo.pair_id
  join public.pairs p on p.id = mo.pair_id
  where c.id = target_contribution_id
    and c.user_id = current_user_id
    and pm.user_id = current_user_id
    and p.status in ('active', 'archived')
  limit 1;

  if selected_contribution.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select * into selected_memory
  from public.memories
  where moment_id = selected_contribution.moment_id;

  if selected_memory.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  update public.contributions
  set removed_at = coalesce(removed_at, now()),
      response_text = null,
      response_choice = null,
      photo_rear_path = null,
      photo_rear_width = null,
      photo_rear_height = null,
      photo_front_path = null,
      photo_front_width = null,
      photo_front_height = null
  where id = selected_contribution.id;

  return public.memory_payload_for_user(selected_memory.id, current_user_id);
end;
$$;

revoke all on function public.remove_own_contribution(uuid) from public, anon;
grant execute on function public.remove_own_contribution(uuid) to authenticated;

alter table public.pair_progress enable row level security;
alter table public.memory_locations enable row level security;

revoke all on table public.pair_progress from anon, authenticated;
revoke all on table public.memory_locations from anon, authenticated;

grant select on table public.pair_progress to authenticated;
grant select on table public.memory_locations to authenticated;
grant all on table public.pair_progress to service_role;
grant all on table public.memory_locations to service_role;

create policy "Pair members read Pom Progress"
  on public.pair_progress
  for select
  to authenticated
  using (
    exists (
      select 1 from public.pair_memberships pm
      where pm.pair_id = pair_progress.pair_id
        and pm.user_id = (select auth.uid())
    )
  );

create policy "Pair members read Memory locations"
  on public.memory_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = memory_locations.pair_id
        and pm.user_id = (select auth.uid())
        and p.status in ('active', 'archived')
    )
  );

drop policy if exists "Pair members read permitted Moment media" on storage.objects;

create policy "Pair members read permitted Moment media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'pomelo-moment-media'
    and exists (
      select 1
      from public.moments m
      join public.pair_memberships pm on pm.pair_id = m.pair_id
      join public.pairs p on p.id = m.pair_id
      where m.id::text = split_part(name, '/', 2)
        and pm.user_id = (select auth.uid())
        and (
          (
            m.status in ('open', 'partially_submitted')
            and p.status = 'active'
            and split_part(name, '/', 1) = (select auth.uid()::text)
          )
          or (
            m.status = 'revealed'
            and p.status in ('active', 'archived')
            and exists (
              select 1
              from public.contributions c
              where c.moment_id = m.id
                and c.removed_at is null
                and name in (c.photo_rear_path, c.photo_front_path)
            )
          )
        )
    )
  );

alter publication supabase_realtime
  add table public.pair_progress, public.memory_locations;
