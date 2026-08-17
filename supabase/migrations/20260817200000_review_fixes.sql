drop function public.delete_journal_entry(uuid);

create function public.delete_journal_entry(target_entry_id uuid, expected_version bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_entry public.journal_entries%rowtype;
  deleted_entry_id uuid;
  media_paths jsonb;
begin
  select * into selected_entry from public.journal_entries where id = target_entry_id;
  if selected_entry.id is null then
    return jsonb_build_object('deleted', true, 'paths', '[]'::jsonb);
  end if;
  if current_user_id is null or not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_entry.pair_id and user_id = current_user_id
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if selected_entry.version != expected_version then
    return jsonb_build_object('error', 'conflict', 'current', public.journal_entry_payload(selected_entry));
  end if;

  select coalesce(jsonb_agg(media.storage_path order by media.position, media.id), '[]'::jsonb)
  into media_paths
  from public.journal_entry_media media
  where media.entry_id = selected_entry.id;

  delete from public.journal_entries
  where id = selected_entry.id and version = expected_version
  returning id into deleted_entry_id;

  if deleted_entry_id is null then
    select * into selected_entry from public.journal_entries where id = target_entry_id;
    if selected_entry.id is null then
      return jsonb_build_object('deleted', true, 'paths', media_paths);
    end if;
    return jsonb_build_object('error', 'conflict', 'current', public.journal_entry_payload(selected_entry));
  end if;
  return jsonb_build_object('deleted', true, 'paths', media_paths);
end;
$$;

revoke all on function public.delete_journal_entry(uuid, bigint) from public, anon;
grant execute on function public.delete_journal_entry(uuid, bigint) to authenticated;

create or replace function public.get_journal_calendar(range_start date, range_end date)
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
    select generate_series(
      extract(year from range_start)::integer - 1,
      extract(year from range_end)::integer
    ) as year
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

revoke all on function public.get_journal_calendar(date, date) from public, anon;
grant execute on function public.get_journal_calendar(date, date) to authenticated;

drop policy "Pair members remove Journal media objects" on storage.objects;

create policy "Pair members remove Journal media objects"
  on storage.objects for delete to authenticated using (
    bucket_id = 'journal-media'
    and exists (
      select 1 from public.pair_memberships membership
      where membership.pair_id::text = split_part(name, '/', 1)
        and membership.user_id = (select auth.uid())
    )
  );
