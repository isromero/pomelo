alter table public.moments
  drop constraint if exists moments_format_check;

alter table public.moments
  add constraint moments_format_check check (format in ('question', 'photo', 'doodle'));

alter table public.contributions
  add column photo_rear_path text,
  add column photo_rear_width integer,
  add column photo_rear_height integer,
  add column photo_front_path text,
  add column photo_front_width integer,
  add column photo_front_height integer,
  add column photo_submission_id text;

alter table public.contributions
  drop constraint if exists contributions_check;

alter table public.contributions
  add constraint contributions_payload_check check (
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
  );

alter table public.contributions
  add constraint contributions_photo_dimensions_check check (
    (photo_rear_width is null or photo_rear_width between 1 and 10000)
    and (photo_rear_height is null or photo_rear_height between 1 and 10000)
    and (photo_front_width is null or photo_front_width between 1 and 10000)
    and (photo_front_height is null or photo_front_height between 1 and 10000)
  );

create unique index contributions_photo_submission_id_idx
  on public.contributions (moment_id, user_id, photo_submission_id)
  where photo_submission_id is not null;

alter table public.memories
  add column format text not null default 'question' check (format in ('question', 'photo', 'doodle')),
  add column photo_composition jsonb not null default '{}'::jsonb,
  add column doodle_document jsonb;

create table public.doodle_documents (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  moment_id uuid not null unique references public.moments (id) on delete cascade,
  document jsonb not null default '{"version": 0, "strokes": []}'::jsonb check (
    jsonb_typeof(document) = 'object'
    and jsonb_typeof(document -> 'version') = 'number'
    and jsonb_typeof(document -> 'strokes') = 'array'
  ),
  version bigint not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doodle_completions (
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_completion_id text not null,
  completed_at timestamptz not null default now(),
  primary key (moment_id, user_id),
  unique (moment_id, user_id, client_completion_id)
);

create table public.doodle_snapshot_operations (
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_operation_id text not null,
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id, client_operation_id)
);

create table public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_message_id text not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (memory_id, user_id, client_message_id)
);

create index thread_messages_memory_created_idx
  on public.thread_messages (memory_id, created_at, id);

create table public.thread_message_events (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  message_id uuid not null unique references public.thread_messages (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null default 'message_created' check (event_type = 'message_created'),
  created_at timestamptz not null default now()
);

create table public.memory_widget_preferences (
  memory_id uuid not null references public.memories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  visual_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (memory_id, user_id)
);

create index doodle_completions_moment_idx
  on public.doodle_completions (moment_id, completed_at);

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
      'responseText', target_contribution.response_text,
      'responseChoice', target_contribution.response_choice,
      'submittedAt', target_contribution.submitted_at,
      'photo', case
        when target_contribution.photo_rear_path is null then null
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

insert into public.prompt_concepts (
  concept_key,
  format,
  prompt_es,
  prompt_en,
  response_type,
  response_options,
  active
) values
  (
    'photo_today_together',
    'photo',
    'Capturad un momento cotidiano que os gustaría guardar.',
    'Capture an ordinary moment you would like to keep.',
    'text',
    '[]'::jsonb,
    true
  ),
  (
    'doodle_today_together',
    'doodle',
    'Dibujad algo que solo tenga sentido para vosotros.',
    'Draw something that only makes sense to the two of you.',
    'text',
    '[]'::jsonb,
    true
  )
on conflict (concept_key) do nothing;

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
  selected_doodle public.doodle_documents%rowtype;
  own_contribution public.contributions%rowtype;
  partner_contribution public.contributions%rowtype;
  partner_profile public.profiles%rowtype;
  target_locale text;
  partner_submitted boolean := false;
  own_doodle_completed boolean := false;
  partner_doodle_completed boolean := false;
begin
  select * into selected_moment from public.moments where id = target_moment_id;

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

  select pr.* into partner_profile
  from public.pair_memberships pm
  join public.profiles pr on pr.id = pm.user_id
  where pm.pair_id = selected_moment.pair_id
    and pm.user_id != target_user_id
    and pm.ended_at is null
  order by pm.joined_at
  limit 1;

  if selected_moment.format = 'doodle' then
    select * into selected_doodle
    from public.doodle_documents
    where moment_id = selected_moment.id;
    select exists (
      select 1 from public.doodle_completions
      where moment_id = selected_moment.id and user_id = target_user_id
    ) into own_doodle_completed;
    select exists (
      select 1 from public.doodle_completions
      where moment_id = selected_moment.id and user_id != target_user_id
    ) into partner_doodle_completed;
  else
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
    'ownContribution', case
      when selected_moment.format = 'doodle' then null
      else public.contribution_payload(own_contribution)
    end,
    'partner', case
      when partner_profile.id is null then null
      else jsonb_build_object(
        'userId', partner_profile.id,
        'displayName', partner_profile.display_name,
        'avatarKey', coalesce(partner_profile.avatar_key, 'calm'),
        'submitted', case when selected_moment.format = 'doodle' then partner_doodle_completed else partner_submitted end,
        'contribution', case
          when selected_moment.format = 'doodle' then null
          when selected_moment.status = 'revealed' then public.contribution_payload(partner_contribution)
          else null
        end
      )
    end,
    'memoryId', selected_memory.id,
    'pomState', selected_memory.pom_state,
    'streak', public.pair_streak_payload(selected_moment.pair_id),
    'doodle', case
      when selected_moment.format = 'doodle' then jsonb_build_object(
        'document', coalesce(selected_doodle.document, '{"version": 0, "strokes": []}'::jsonb),
        'ownCompleted', own_doodle_completed,
        'partnerCompleted', partner_doodle_completed
      )
      else null
    end
  );
end;
$$;

revoke all on function public.moment_payload_for_user(uuid, uuid)
  from public, anon, authenticated;

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
  selected_moment public.moments%rowtype;
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

  select * into selected_moment from public.moments where id = selected_memory.moment_id;
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
    'photoComposition', nullif(selected_memory.photo_composition, '{}'::jsonb),
    'doodleDocument', selected_memory.doodle_document,
    'widgetVisualEnabled', visual_enabled
  );
end;
$$;

revoke all on function public.memory_payload_for_user(uuid, uuid)
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
    select count(*) from public.pair_memberships
    where pair_id = selected_pair_id and ended_at is null
  ) != 2 then
    return jsonb_build_object('error', 'pair_not_ready');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = selected_pair_time_zone
  ) then
    selected_pair_time_zone := 'UTC';
  end if;
  selected_local_date := (now() at time zone selected_pair_time_zone)::date;

  update public.moments
  set status = 'expired_incomplete'
  where pair_id = selected_pair_id
    and status in ('open', 'partially_submitted')
    and recovery_expires_at <= now();

  select id into selected_moment_id
  from public.moments
  where pair_id = selected_pair_id
    and (
      status = 'ready'
      or (status in ('open', 'partially_submitted') and recovery_expires_at > now())
    )
  order by local_date asc
  limit 1;

  if selected_moment_id is null then
    select id into selected_moment_id
    from public.moments
    where pair_id = selected_pair_id and local_date = selected_local_date;
  end if;

  if selected_moment_id is null
    and exists (select 1 from public.memories where pair_id = selected_pair_id)
    and not public.pair_has_premium(selected_pair_id) then
    return jsonb_build_object('error', 'premium_required');
  end if;

  if selected_moment_id is null then
    select not exists (
      select 1 from public.memories where pair_id = selected_pair_id
    ) into free_moment;

    select pc.* into selected_prompt
    from public.prompt_concepts pc
    where pc.active
      and (
        free_moment
        or not exists (
          select 1 from public.moments old_moment
          where old_moment.pair_id = selected_pair_id
            and old_moment.prompt_concept_key = pc.concept_key
        )
      )
    order by
      case when free_moment and pc.concept_key = 'small_gesture_smile' then 0 else 1 end,
      md5(pc.concept_key || selected_pair_id::text || selected_local_date::text)
    limit 1;

    if selected_prompt.concept_key is null then
      select * into selected_prompt
      from public.prompt_concepts
      where active
      order by md5(concept_key || selected_pair_id::text || selected_local_date::text)
      limit 1;
    end if;

    if selected_prompt.concept_key is null then
      return jsonb_build_object('error', 'prompt_unavailable');
    end if;

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

create function public.submit_photo_contribution(
  target_moment_id uuid,
  rear_path text,
  front_path text,
  rear_width integer,
  rear_height integer,
  front_width integer,
  front_height integer,
  client_submission_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  existing_contribution public.contributions%rowtype;
  contribution_count bigint;
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

  if selected_moment.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if selected_moment.format != 'photo' then
    return jsonb_build_object('error', 'invalid_format');
  end if;
  if selected_moment.status in ('revealed', 'expired_incomplete')
    or selected_moment.recovery_expires_at <= now() then
    update public.moments
    set status = 'expired_incomplete'
    where id = selected_moment.id
      and status in ('open', 'partially_submitted');
    return jsonb_build_object('error', 'moment_closed');
  end if;

  select * into existing_contribution
  from public.contributions
  where moment_id = selected_moment.id and user_id = current_user_id;
  if existing_contribution.id is not null then
    return public.moment_payload_for_user(selected_moment.id, current_user_id);
  end if;

  if client_submission_id is null or char_length(btrim(client_submission_id)) = 0
    or rear_width not between 1 and 10000
    or rear_height not between 1 and 10000
    or front_width not between 1 and 10000
    or front_height not between 1 and 10000
    or rear_path != current_user_id::text || '/' || selected_moment.id::text || '/rear.jpg'
    or front_path != current_user_id::text || '/' || selected_moment.id::text || '/front.jpg'
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'pomelo-moment-media' and name = rear_path
    )
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'pomelo-moment-media' and name = front_path
    ) then
    return jsonb_build_object('error', 'photo_incomplete');
  end if;

  insert into public.contributions (
    moment_id,
    user_id,
    photo_rear_path,
    photo_rear_width,
    photo_rear_height,
    photo_front_path,
    photo_front_width,
    photo_front_height,
    photo_submission_id
  ) values (
    selected_moment.id,
    current_user_id,
    rear_path,
    rear_width,
    rear_height,
    front_path,
    front_width,
    front_height,
    client_submission_id
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

revoke all on function public.submit_photo_contribution(uuid, text, text, integer, integer, integer, integer, text)
  from public, anon;
grant execute on function public.submit_photo_contribution(uuid, text, text, integer, integer, integer, integer, text)
  to authenticated;

create function public.get_doodle_session(target_moment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  selected_document public.doodle_documents%rowtype;
  own_completed boolean;
  partner_completed boolean;
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

  insert into public.doodle_documents (pair_id, moment_id)
  values (selected_moment.pair_id, selected_moment.id)
  on conflict (moment_id) do nothing;

  select * into selected_document
  from public.doodle_documents
  where moment_id = selected_moment.id;

  select exists (
    select 1 from public.doodle_completions
    where moment_id = selected_moment.id and user_id = current_user_id
  ) into own_completed;
  select exists (
    select 1 from public.doodle_completions
    where moment_id = selected_moment.id and user_id != current_user_id
  ) into partner_completed;

  return jsonb_build_object(
    'userId', current_user_id,
    'document', selected_document.document,
    'ownCompleted', own_completed,
    'partnerCompleted', partner_completed
  );
end;
$$;

revoke all on function public.get_doodle_session(uuid) from public, anon;
grant execute on function public.get_doodle_session(uuid) to authenticated;

create function public.merge_doodle_documents(
  current_document jsonb,
  incoming_document jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  merged_removed_ids jsonb;
  merged_strokes jsonb;
  merged_document jsonb;
  merged_cleared_at text;
begin
  select max(value)
  into merged_cleared_at
  from (
    values
      (current_document ->> 'clearedAt'),
      (incoming_document ->> 'clearedAt')
  ) as clear_dates(value)
  where value is not null;

  select coalesce(jsonb_agg(distinct value order by value), '[]'::jsonb)
  into merged_removed_ids
  from jsonb_array_elements_text(
    coalesce(current_document -> 'removedStrokeIds', '[]'::jsonb)
      || coalesce(incoming_document -> 'removedStrokeIds', '[]'::jsonb)
  ) as removed(value);

  select coalesce(jsonb_agg(stroke order by stroke ->> 'createdAt', stroke ->> 'id'), '[]'::jsonb)
  into merged_strokes
  from (
    select distinct on (stroke ->> 'id') stroke
    from jsonb_array_elements(
      coalesce(current_document -> 'strokes', '[]'::jsonb)
        || coalesce(incoming_document -> 'strokes', '[]'::jsonb)
    ) as items(stroke)
    order by stroke ->> 'id', stroke ->> 'createdAt' desc
  ) as unique_strokes
  where not exists (
      select 1
      from jsonb_array_elements_text(merged_removed_ids) as removed(value)
      where removed.value = unique_strokes.stroke ->> 'id'
    )
    and (
      merged_cleared_at is null
      or unique_strokes.stroke ->> 'createdAt' > merged_cleared_at
    );

  merged_document := jsonb_build_object(
    'strokes', merged_strokes,
    'version', greatest(
      coalesce((current_document ->> 'version')::bigint, 0),
      coalesce((incoming_document ->> 'version')::bigint, 0)
    )
  );
  if merged_cleared_at is not null then
    merged_document := jsonb_set(
      merged_document,
      '{clearedAt}',
      to_jsonb(merged_cleared_at),
      true
    );
  end if;
  if jsonb_array_length(merged_removed_ids) > 0 then
    merged_document := jsonb_set(
      merged_document,
      '{removedStrokeIds}',
      merged_removed_ids,
      true
    );
  end if;
  return merged_document;
end;
$$;

revoke all on function public.merge_doodle_documents(jsonb, jsonb)
  from public, anon, authenticated;

create function public.save_doodle_snapshot(
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
    or client_operation_id is null
    or char_length(btrim(client_operation_id)) = 0
    or jsonb_typeof(target_document) != 'object'
    or jsonb_typeof(target_document -> 'strokes') != 'array'
    or (
      target_document ? 'clearedAt'
      and jsonb_typeof(target_document -> 'clearedAt') != 'string'
    )
    or (
      target_document ? 'removedStrokeIds'
      and jsonb_typeof(target_document -> 'removedStrokeIds') != 'array'
    ) then
    return jsonb_build_object('error', 'invalid_doodle');
  end if;

  insert into public.doodle_documents (pair_id, moment_id)
  values (selected_moment.pair_id, selected_moment.id)
  on conflict (moment_id) do nothing;

  insert into public.doodle_snapshot_operations (
    moment_id, user_id, client_operation_id
  ) values (
    selected_moment.id, current_user_id, client_operation_id
  ) on conflict do nothing;

  if not found then
    select document into saved_document
    from public.doodle_documents
    where moment_id = selected_moment.id;
    return jsonb_build_object('document', saved_document);
  end if;

  select * into selected_document
  from public.doodle_documents
  where moment_id = selected_moment.id
  for update;

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

create function public.complete_doodle(
  target_moment_id uuid,
  client_completion_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  completion_count bigint;
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
    or selected_moment.recovery_expires_at <= now() then
    return jsonb_build_object('error', 'moment_closed');
  end if;
  if client_completion_id is null or char_length(btrim(client_completion_id)) = 0 then
    return jsonb_build_object('error', 'invalid_doodle');
  end if;

  insert into public.doodle_documents (pair_id, moment_id)
  values (selected_moment.pair_id, selected_moment.id)
  on conflict (moment_id) do nothing;

  insert into public.doodle_completions (
    moment_id, user_id, client_completion_id
  ) values (
    selected_moment.id, current_user_id, client_completion_id
  ) on conflict (moment_id, user_id) do nothing;

  select count(*) into completion_count
  from public.doodle_completions
  where moment_id = selected_moment.id;

  if completion_count = 2 then
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

revoke all on function public.complete_doodle(uuid, text) from public, anon;
grant execute on function public.complete_doodle(uuid, text) to authenticated;

create or replace function public.reveal_moment(target_moment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  selected_prompt public.prompt_concepts%rowtype;
  selected_doodle public.doodle_documents%rowtype;
  contribution_count bigint;
  completion_count bigint;
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

  if selected_moment.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  if selected_moment.status = 'revealed' then
    return public.moment_payload_for_user(selected_moment.id, current_user_id);
  end if;
  if selected_moment.status != 'ready' then
    return jsonb_build_object('error', 'moment_not_ready');
  end if;

  select * into selected_prompt
  from public.prompt_concepts
  where concept_key = selected_moment.prompt_concept_key;

  if selected_moment.format = 'doodle' then
    select count(*) into completion_count
    from public.doodle_completions
    where moment_id = selected_moment.id;
    if completion_count != 2 then
      return jsonb_build_object('error', 'moment_not_ready');
    end if;
    select * into selected_doodle
    from public.doodle_documents
    where moment_id = selected_moment.id;
    if selected_doodle.id is null then
      return jsonb_build_object('error', 'moment_not_ready');
    end if;
  else
    select count(*) into contribution_count
    from public.contributions
    where moment_id = selected_moment.id;
    if contribution_count != 2 then
      return jsonb_build_object('error', 'moment_not_ready');
    end if;
  end if;

  insert into public.memories (
    pair_id,
    moment_id,
    prompt_concept_key,
    prompt_es,
    prompt_en,
    response_type,
    response_options,
    local_date,
    pom_state,
    format,
    photo_composition,
    doodle_document
  ) values (
    selected_moment.pair_id,
    selected_moment.id,
    selected_prompt.concept_key,
    selected_prompt.prompt_es,
    selected_prompt.prompt_en,
    selected_prompt.response_type,
    selected_prompt.response_options,
    selected_moment.local_date,
    'celebrating',
    selected_moment.format,
    case
      when selected_moment.format = 'photo' then '{"version": 1, "layout": "partner_rear_primary_own_rear_thumbnail"}'::jsonb
      else '{}'::jsonb
    end,
    case when selected_moment.format = 'doodle' then selected_doodle.document else null end
  ) on conflict (moment_id) do nothing;

  update public.moments
  set status = 'revealed', revealed_at = coalesce(revealed_at, now())
  where id = selected_moment.id;

  return public.moment_payload_for_user(selected_moment.id, current_user_id);
end;
$$;

revoke all on function public.reveal_moment(uuid) from public, anon;
grant execute on function public.reveal_moment(uuid) to authenticated;

create function public.thread_message_payload(target_message public.thread_messages)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target_message.id,
    'authorId', target_message.user_id,
    'body', target_message.body,
    'clientMessageId', target_message.client_message_id,
    'createdAt', target_message.created_at
  );
$$;

revoke all on function public.thread_message_payload(public.thread_messages)
  from public, anon, authenticated;

create function public.emit_thread_message_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.thread_message_events (
    memory_id, pair_id, message_id, actor_id
  ) values (
    new.memory_id, new.pair_id, new.id, new.user_id
  ) on conflict (message_id) do nothing;
  return new;
end;
$$;

revoke all on function public.emit_thread_message_event() from public, anon, authenticated;

create trigger thread_messages_emit_event
after insert on public.thread_messages
for each row execute function public.emit_thread_message_event();

create function public.get_memory_thread(target_memory_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_memory public.memories%rowtype;
  selected_pair public.pairs%rowtype;
  can_write boolean := false;
  messages jsonb;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  select * into selected_memory from public.memories where id = target_memory_id;
  if selected_memory.id is null then
    return jsonb_build_object('error', 'memory_not_found');
  end if;
  select * into selected_pair from public.pairs where id = selected_memory.pair_id;
  if not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_memory.pair_id and user_id = current_user_id
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  can_write := exists (
    select 1
    from public.pair_memberships pm
    where pm.pair_id = selected_memory.pair_id
      and pm.user_id = current_user_id
      and pm.ended_at is null
      and selected_pair.status = 'active'
  );
  select coalesce(
    jsonb_agg(public.thread_message_payload(tm) order by tm.created_at, tm.id),
    '[]'::jsonb
  ) into messages
  from public.thread_messages tm
  where tm.memory_id = selected_memory.id;
  return jsonb_build_object(
    'memoryId', selected_memory.id,
    'canWrite', can_write,
    'messages', messages
  );
end;
$$;

revoke all on function public.get_memory_thread(uuid) from public, anon;
grant execute on function public.get_memory_thread(uuid) to authenticated;

create function public.send_thread_message(
  target_memory_id uuid,
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
  selected_memory public.memories%rowtype;
  selected_pair public.pairs%rowtype;
  existing_message public.thread_messages%rowtype;
  inserted_message public.thread_messages%rowtype;
  normalized_body text := nullif(btrim(message_body), '');
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;
  select * into selected_memory from public.memories where id = target_memory_id;
  if selected_memory.id is null then
    return jsonb_build_object('error', 'memory_not_found');
  end if;
  select * into selected_pair from public.pairs where id = selected_memory.pair_id;
  if not exists (
    select 1 from public.pair_memberships
    where pair_id = selected_memory.pair_id and user_id = current_user_id
      and ended_at is null
  ) or selected_pair.status != 'active' then
    return jsonb_build_object('error', 'archive_read_only');
  end if;
  if normalized_body is null or char_length(normalized_body) > 2000
    or target_client_message_id is null or char_length(btrim(target_client_message_id)) = 0 then
    return jsonb_build_object('error', 'invalid_message');
  end if;

  select * into existing_message
  from public.thread_messages
  where memory_id = selected_memory.id
    and user_id = current_user_id
    and thread_messages.client_message_id = target_client_message_id;
  if existing_message.id is not null then
    return public.thread_message_payload(existing_message);
  end if;

  insert into public.thread_messages (
    memory_id, pair_id, user_id, client_message_id, body
  ) values (
    selected_memory.id, selected_memory.pair_id, current_user_id, target_client_message_id, normalized_body
  ) on conflict (memory_id, user_id, client_message_id) do nothing
  returning * into inserted_message;

  if inserted_message.id is null then
    select * into inserted_message
    from public.thread_messages
    where memory_id = selected_memory.id
      and user_id = current_user_id
      and thread_messages.client_message_id = target_client_message_id;
  end if;
  return public.thread_message_payload(inserted_message);
end;
$$;

revoke all on function public.send_thread_message(uuid, text, text) from public, anon;
grant execute on function public.send_thread_message(uuid, text, text) to authenticated;

create function public.set_memory_widget_visibility(
  target_memory_id uuid,
  enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not exists (
    select 1 from public.memories m
    join public.pair_memberships pm on pm.pair_id = m.pair_id
    where m.id = target_memory_id and pm.user_id = current_user_id
  ) then
    raise exception using message = 'not_allowed';
  end if;
  insert into public.memory_widget_preferences (memory_id, user_id, visual_enabled)
  values (target_memory_id, current_user_id, enabled)
  on conflict (memory_id, user_id) do update
  set visual_enabled = excluded.visual_enabled,
      updated_at = now();
  return enabled;
end;
$$;

revoke all on function public.set_memory_widget_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_memory_widget_visibility(uuid, boolean) to authenticated;

alter table public.doodle_documents enable row level security;
alter table public.doodle_completions enable row level security;
alter table public.doodle_snapshot_operations enable row level security;
alter table public.thread_messages enable row level security;
alter table public.thread_message_events enable row level security;
alter table public.memory_widget_preferences enable row level security;

revoke all on table public.doodle_documents from anon, authenticated;
revoke all on table public.doodle_completions from anon, authenticated;
revoke all on table public.doodle_snapshot_operations from anon, authenticated;
revoke all on table public.thread_messages from anon, authenticated;
revoke all on table public.thread_message_events from anon, authenticated;
revoke all on table public.memory_widget_preferences from anon, authenticated;

grant select on table public.doodle_documents to authenticated;
grant select on table public.doodle_completions to authenticated;
grant select on table public.thread_messages to authenticated;
grant select on table public.thread_message_events to authenticated;
grant select on table public.memory_widget_preferences to authenticated;
grant all on table public.doodle_documents to service_role;
grant all on table public.doodle_completions to service_role;
grant all on table public.doodle_snapshot_operations to service_role;
grant all on table public.thread_messages to service_role;
grant all on table public.thread_message_events to service_role;
grant all on table public.memory_widget_preferences to service_role;

create policy "Active Pair members read Doodle documents"
  on public.doodle_documents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = doodle_documents.pair_id
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

create policy "Active Pair members read Doodle completions"
  on public.doodle_completions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.moments m
      join public.pair_memberships pm on pm.pair_id = m.pair_id
      join public.pairs p on p.id = m.pair_id
      where m.id = doodle_completions.moment_id
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

create policy "Pair members read Thread messages"
  on public.thread_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = thread_messages.pair_id
        and pm.user_id = (select auth.uid())
        and p.status in ('active', 'archived')
    )
  );

create policy "Pair members read Thread events"
  on public.thread_message_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = thread_message_events.pair_id
        and pm.user_id = (select auth.uid())
        and p.status in ('active', 'archived')
    )
  );

create policy "Pair members read widget preferences"
  on public.memory_widget_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('pomelo-moment-media', 'pomelo-moment-media', false)
on conflict (id) do update set public = false;

create policy "Pair members upload private Moment media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
    and split_part(name, '/', 3) in ('rear.jpg', 'front.jpg')
    and exists (
      select 1
      from public.moments m
      join public.pair_memberships pm on pm.pair_id = m.pair_id
      join public.pairs p on p.id = m.pair_id
      where m.id::text = split_part(name, '/', 2)
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
  )
  with check (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
  );

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
          split_part(name, '/', 1) = (select auth.uid()::text)
          or (m.status = 'revealed' and p.status in ('active', 'archived'))
        )
    )
  );

create policy "Users delete their staged Moment media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pomelo-moment-media'
    and split_part(name, '/', 1) = (select auth.uid()::text)
  );

alter publication supabase_realtime
  add table public.doodle_documents, public.doodle_completions, public.thread_message_events;
