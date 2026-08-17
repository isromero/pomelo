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
    select count(*) from public.pair_memberships
    where pair_id = selected_pair_id and ended_at is null
  ) != 2 then
    return jsonb_build_object('error', 'pair_not_ready');
  end if;

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
      or (status in ('open', 'partially_submitted') and recovery_expires_at > now())
    )
  order by local_date asc
  limit 1;

  if selected_moment_id is not null then
    return public.moment_payload_for_user(selected_moment_id, current_user_id);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = selected_pair_time_zone
  ) then
    selected_pair_time_zone := 'UTC';
  end if;
  selected_local_date := (now() at time zone selected_pair_time_zone)::date;

  select id
  into selected_moment_id
  from public.moments
  where pair_id = selected_pair_id
    and status = 'revealed'
    and local_date > selected_local_date
  order by local_date desc
  limit 1;

  if selected_moment_id is not null then
    return public.moment_payload_for_user(selected_moment_id, current_user_id);
  end if;

  return public.get_daily_moment_legacy();
end;
$$;

revoke all on function public.get_daily_moment() from public, anon;
grant execute on function public.get_daily_moment() to authenticated;

create or replace function public.save_doodle_snapshot(
  target_moment_id uuid,
  target_document jsonb,
  client_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  selected_document public.doodle_documents%rowtype;
  saved_document jsonb;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select m.* into selected_moment
  from public.moments m
  join public.pair_memberships pm on pm.pair_id = m.pair_id
  join public.pairs p on p.id = m.pair_id
  where m.id = target_moment_id
    and pm.user_id = current_user_id
    and pm.ended_at is null
    and p.status = 'active'
  for update of m;

  if selected_moment.id is null or selected_moment.format != 'doodle' then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if selected_moment.status in ('revealed', 'expired_incomplete')
    or selected_moment.recovery_expires_at <= now()
    or exists (
      select 1 from public.doodle_completions
      where moment_id = selected_moment.id and user_id = current_user_id
    ) then
    return jsonb_build_object('error', 'invalid_doodle');
  end if;
  if client_operation_id is null
    or char_length(btrim(client_operation_id)) = 0
    or jsonb_typeof(target_document) is distinct from 'object'
    or jsonb_typeof(target_document -> 'version') is distinct from 'number'
    or (target_document ->> 'version') !~ '^[0-9]+$'
    or jsonb_typeof(target_document -> 'strokes') is distinct from 'array'
    or (
      target_document ? 'clearedAt'
      and jsonb_typeof(target_document -> 'clearedAt') is distinct from 'string'
    )
    or (
      target_document ? 'removedStrokeIds'
      and jsonb_typeof(target_document -> 'removedStrokeIds') is distinct from 'array'
    ) then
    return jsonb_build_object('error', 'invalid_doodle');
  end if;
  if exists (
    select 1
    from jsonb_array_elements(target_document -> 'strokes') as incoming(stroke)
    where jsonb_typeof(incoming.stroke) is distinct from 'object'
      or jsonb_typeof(incoming.stroke -> 'id') is distinct from 'string'
      or nullif(btrim(incoming.stroke ->> 'id'), '') is null
      or jsonb_typeof(incoming.stroke -> 'userId') is distinct from 'string'
      or jsonb_typeof(incoming.stroke -> 'color') is distinct from 'string'
      or jsonb_typeof(incoming.stroke -> 'width') is distinct from 'number'
      or jsonb_typeof(incoming.stroke -> 'createdAt') is distinct from 'string'
      or coalesce(incoming.stroke ->> 'mode' not in ('brush', 'eraser'), true)
      or jsonb_typeof(incoming.stroke -> 'points') is distinct from 'array'
      or exists (
        select 1
        from jsonb_array_elements(
          case
            when jsonb_typeof(incoming.stroke -> 'points') = 'array'
              then incoming.stroke -> 'points'
            else '[]'::jsonb
          end
        ) as points(point)
        where jsonb_typeof(points.point) is distinct from 'object'
          or jsonb_typeof(points.point -> 'x') is distinct from 'number'
          or jsonb_typeof(points.point -> 'y') is distinct from 'number'
      )
  ) or exists (
    select 1
    from jsonb_array_elements(coalesce(target_document -> 'removedStrokeIds', '[]'::jsonb))
      as removed(value)
    where jsonb_typeof(removed.value) is distinct from 'string'
  ) then
    return jsonb_build_object('error', 'invalid_doodle');
  end if;

  insert into public.doodle_documents (pair_id, moment_id)
  values (selected_moment.pair_id, selected_moment.id)
  on conflict (moment_id) do nothing;

  select * into selected_document
  from public.doodle_documents
  where moment_id = selected_moment.id
  for update;

  if coalesce(target_document ->> 'clearedAt', '')
      != coalesce(selected_document.document ->> 'clearedAt', '')
    or exists (
      select 1
      from jsonb_array_elements(target_document -> 'strokes') as incoming(stroke)
      left join jsonb_array_elements(selected_document.document -> 'strokes') as existing(stroke)
        on existing.stroke ->> 'id' = incoming.stroke ->> 'id'
      where (
          existing.stroke is null
          and incoming.stroke ->> 'userId' != current_user_id::text
        )
        or (
          existing.stroke is not null
          and existing.stroke != incoming.stroke
        )
    )
    or exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(target_document -> 'removedStrokeIds', '[]'::jsonb)
      ) as removed(stroke_id)
      join jsonb_array_elements(selected_document.document -> 'strokes') as existing(stroke)
        on existing.stroke ->> 'id' = removed.stroke_id
      where existing.stroke ->> 'userId' != current_user_id::text
        and not (
          coalesce(selected_document.document -> 'removedStrokeIds', '[]'::jsonb)
            ? removed.stroke_id
        )
    ) then
    return jsonb_build_object('error', 'invalid_doodle');
  end if;

  insert into public.doodle_snapshot_operations (
    moment_id, user_id, client_operation_id
  ) values (
    selected_moment.id, current_user_id, client_operation_id
  ) on conflict do nothing;

  if not found then
    return jsonb_build_object('document', selected_document.document);
  end if;

  saved_document := public.merge_doodle_documents(
    selected_document.document,
    target_document
  );
  saved_document := jsonb_set(
    saved_document,
    '{version}',
    to_jsonb(selected_document.version + 1),
    true
  );
  update public.doodle_documents
  set document = saved_document,
      version = selected_document.version + 1,
      updated_at = now()
  where moment_id = selected_moment.id;

  return jsonb_build_object('document', saved_document);
end;
$$;

revoke all on function public.save_doodle_snapshot(uuid, jsonb, text) from public, anon;
grant execute on function public.save_doodle_snapshot(uuid, jsonb, text) to authenticated;

drop policy "Pair members upload private Moment media" on storage.objects;
drop policy "Users update their staged Moment media" on storage.objects;
drop policy "Users delete their staged Moment media" on storage.objects;

create policy "Pair members upload private Moment media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
    and split_part(name, '/', 3) in ('rear.jpg', 'front.jpg')
    and not exists (
      select 1
      from public.contributions c
      where c.user_id = (select auth.uid())
        and name in (c.photo_rear_path, c.photo_front_path)
    )
    and exists (
      select 1
      from public.moments m
      join public.pair_memberships pm on pm.pair_id = m.pair_id
      join public.pairs p on p.id = m.pair_id
      where m.id::text = split_part(name, '/', 2)
        and m.format = 'photo'
        and m.status in ('open', 'partially_submitted')
        and m.recovery_expires_at > now()
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

create policy "Users update their staged Moment media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
    and not exists (
      select 1
      from public.contributions c
      where c.user_id = (select auth.uid())
        and name in (c.photo_rear_path, c.photo_front_path)
    )
  )
  with check (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
    and split_part(name, '/', 3) in ('rear.jpg', 'front.jpg')
    and not exists (
      select 1
      from public.contributions c
      where c.user_id = (select auth.uid())
        and name in (c.photo_rear_path, c.photo_front_path)
    )
    and exists (
      select 1
      from public.moments m
      join public.pair_memberships pm on pm.pair_id = m.pair_id
      join public.pairs p on p.id = m.pair_id
      where m.id::text = split_part(name, '/', 2)
        and m.format = 'photo'
        and m.status in ('open', 'partially_submitted')
        and m.recovery_expires_at > now()
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

create policy "Users delete their staged Moment media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
    and not exists (
      select 1
      from public.contributions c
      where c.user_id = (select auth.uid())
        and name in (c.photo_rear_path, c.photo_front_path)
    )
  );
