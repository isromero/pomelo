alter table public.prompt_concepts
  add column response_type text not null default 'text' check (response_type in ('text', 'choice')),
  add column response_options jsonb not null default '[]'::jsonb check (
    jsonb_typeof(response_options) = 'array'
    and case
      when response_type = 'text' then jsonb_array_length(response_options) = 0
      else jsonb_array_length(response_options) between 2 and 3
    end
  );

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  prompt_concept_key text not null references public.prompt_concepts (concept_key),
  format text not null check (format = 'question'),
  local_date date not null,
  status text not null default 'open' check (
    status in ('open', 'partially_submitted', 'ready', 'revealed', 'expired_incomplete')
  ),
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  revealed_at timestamptz,
  unique (pair_id, local_date)
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  response_text text check (
    response_text is null or char_length(response_text) between 1 and 1000
  ),
  response_choice text check (
    response_choice is null or char_length(response_choice) between 1 and 80
  ),
  submitted_at timestamptz not null default now(),
  unique (moment_id, user_id),
  check (num_nonnulls(response_text, response_choice) = 1)
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  moment_id uuid not null unique references public.moments (id) on delete cascade,
  prompt_concept_key text not null references public.prompt_concepts (concept_key),
  prompt_es text not null,
  prompt_en text not null,
  response_type text not null check (response_type in ('text', 'choice')),
  response_options jsonb not null default '[]'::jsonb,
  local_date date not null,
  pom_state text not null default 'celebrating' check (
    pom_state in ('celebrating', 'calm')
  ),
  revealed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index moments_pair_local_date_idx
  on public.moments (pair_id, local_date desc);

create index contributions_moment_idx
  on public.contributions (moment_id, submitted_at);

create index memories_pair_revealed_at_idx
  on public.memories (pair_id, revealed_at desc);

create function public.contribution_payload(target_contribution public.contributions)
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
      'submittedAt', target_contribution.submitted_at
    )
  end;
$$;

revoke all on function public.contribution_payload(public.contributions) from public, anon, authenticated;

create function public.moment_payload_for_user(target_moment_id uuid, target_user_id uuid)
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

  select *
  into selected_prompt
  from public.prompt_concepts
  where concept_key = selected_moment.prompt_concept_key;

  select locale
  into target_locale
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

  select *
  into own_contribution
  from public.contributions
  where moment_id = selected_moment.id and user_id = target_user_id;

  select exists (
    select 1
    from public.contributions
    where moment_id = selected_moment.id and user_id != target_user_id
  )
  into partner_submitted;

  if selected_moment.status = 'revealed' then
    select *
    into partner_contribution
    from public.contributions
    where moment_id = selected_moment.id and user_id != target_user_id
    order by submitted_at
    limit 1;
  end if;

  select *
  into selected_memory
  from public.memories
  where moment_id = selected_moment.id;

  return jsonb_build_object(
    'id', selected_moment.id,
    'pairId', selected_moment.pair_id,
    'localDate', selected_moment.local_date,
    'format', selected_moment.format,
    'status', selected_moment.status,
    'isFree', selected_moment.is_free,
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
    'pomState', selected_memory.pom_state
  );
end;
$$;

revoke all on function public.moment_payload_for_user(uuid, uuid) from public, anon, authenticated;

create function public.memory_payload_for_user(target_memory_id uuid, target_user_id uuid)
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
begin
  select *
  into selected_memory
  from public.memories
  where id = target_memory_id;

  if selected_memory.id is null then
    return jsonb_build_object('error', 'memory_not_found');
  end if;

  if not exists (
    select 1
    from public.pair_memberships
    where pair_id = selected_memory.pair_id
      and user_id = target_user_id
  ) then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select locale into target_locale from public.profiles where id = target_user_id;

  select *
  into own_contribution
  from public.contributions
  where moment_id = selected_memory.moment_id and user_id = target_user_id;

  select *
  into partner_contribution
  from public.contributions
  where moment_id = selected_memory.moment_id and user_id != target_user_id
  order by submitted_at
  limit 1;

  select pr.*
  into partner_profile
  from public.pair_memberships pm
  join public.profiles pr on pr.id = pm.user_id
  where pm.pair_id = selected_memory.pair_id
    and pm.user_id != target_user_id
  order by pm.joined_at
  limit 1;

  return jsonb_build_object(
    'id', selected_memory.id,
    'momentId', selected_memory.moment_id,
    'pairId', selected_memory.pair_id,
    'localDate', selected_memory.local_date,
    'revealedAt', selected_memory.revealed_at,
    'pomState', selected_memory.pom_state,
    'prompt', jsonb_build_object(
      'conceptKey', selected_memory.prompt_concept_key,
      'text', case when target_locale = 'en' then selected_memory.prompt_en else selected_memory.prompt_es end,
      'responseType', selected_memory.response_type,
      'options', selected_memory.response_options
    ),
    'ownContribution', public.contribution_payload(own_contribution),
    'partner', case
      when partner_profile.id is null then null
      else jsonb_build_object(
        'userId', partner_profile.id,
        'displayName', partner_profile.display_name,
        'avatarKey', coalesce(partner_profile.avatar_key, 'calm'),
        'submitted', true,
        'contribution', public.contribution_payload(partner_contribution)
      )
    end
  );
end;
$$;

revoke all on function public.memory_payload_for_user(uuid, uuid) from public, anon, authenticated;

create function public.get_daily_moment()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair_id uuid;
  selected_moment_id uuid;
  selected_prompt public.prompt_concepts%rowtype;
  first_moment boolean;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select p.id
  into selected_pair_id
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

  select id
  into selected_moment_id
  from public.moments
  where pair_id = selected_pair_id and local_date = current_date;

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
      current_date,
      first_moment
    )
    on conflict (pair_id, local_date) do nothing
    returning id into selected_moment_id;

    if selected_moment_id is null then
      select id
      into selected_moment_id
      from public.moments
      where pair_id = selected_pair_id and local_date = current_date;
    end if;
  end if;

  return public.moment_payload_for_user(selected_moment_id, current_user_id);
end;
$$;

revoke all on function public.get_daily_moment() from public, anon;
grant execute on function public.get_daily_moment() to authenticated;

create function public.submit_question_contribution(
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

  select *
  into existing_contribution
  from public.contributions
  where moment_id = selected_moment.id and user_id = current_user_id;

  if existing_contribution.id is not null then
    return public.moment_payload_for_user(selected_moment.id, current_user_id);
  end if;

  select *
  into selected_prompt
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
    moment_id,
    user_id,
    response_text,
    response_choice
  ) values (
    selected_moment.id,
    current_user_id,
    response_text,
    response_choice
  );

  select count(*)
  into contribution_count
  from public.contributions
  where moment_id = selected_moment.id;

  if contribution_count = 2 then
    update public.moments
    set status = 'ready', ready_at = coalesce(ready_at, now())
    where id = selected_moment.id;
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

create function public.reveal_moment(target_moment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_moment public.moments%rowtype;
  selected_prompt public.prompt_concepts%rowtype;
  contribution_count bigint;
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
  if selected_moment.status = 'revealed' then
    return public.moment_payload_for_user(selected_moment.id, current_user_id);
  end if;
  if selected_moment.status != 'ready' then
    return jsonb_build_object('error', 'moment_not_ready');
  end if;

  select count(*)
  into contribution_count
  from public.contributions
  where moment_id = selected_moment.id;

  if contribution_count != 2 then
    return jsonb_build_object('error', 'moment_not_ready');
  end if;

  select *
  into selected_prompt
  from public.prompt_concepts
  where concept_key = selected_moment.prompt_concept_key;

  insert into public.memories (
    pair_id,
    moment_id,
    prompt_concept_key,
    prompt_es,
    prompt_en,
    response_type,
    response_options,
    local_date,
    pom_state
  ) values (
    selected_moment.pair_id,
    selected_moment.id,
    selected_prompt.concept_key,
    selected_prompt.prompt_es,
    selected_prompt.prompt_en,
    selected_prompt.response_type,
    selected_prompt.response_options,
    selected_moment.local_date,
    'celebrating'
  )
  on conflict (moment_id) do nothing;

  update public.moments
  set status = 'revealed', revealed_at = coalesce(revealed_at, now())
  where id = selected_moment.id;

  return public.moment_payload_for_user(selected_moment.id, current_user_id);
end;
$$;

revoke all on function public.reveal_moment(uuid) from public, anon;
grant execute on function public.reveal_moment(uuid) to authenticated;

create function public.get_memory_history()
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

  select pm.pair_id
  into selected_pair_id
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
      order by m.local_date desc, m.revealed_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.memories m
  where m.pair_id = selected_pair_id;

  return result;
end;
$$;

revoke all on function public.get_memory_history() from public, anon;
grant execute on function public.get_memory_history() to authenticated;

create function public.list_memories()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select public.get_memory_history();
$$;

revoke all on function public.list_memories() from public, anon;
grant execute on function public.list_memories() to authenticated;

alter table public.moments enable row level security;
alter table public.contributions enable row level security;
alter table public.memories enable row level security;

revoke all on table public.moments from anon, authenticated;
revoke all on table public.contributions from anon, authenticated;
revoke all on table public.memories from anon, authenticated;

grant select on table public.moments to authenticated;
grant select on table public.contributions to authenticated;
grant select on table public.memories to authenticated;
grant all on table public.moments to service_role;
grant all on table public.contributions to service_role;
grant all on table public.memories to service_role;

create policy "Active Pair members read Moments"
  on public.moments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pair_memberships pm
      join public.pairs p on p.id = pm.pair_id
      where pm.pair_id = moments.pair_id
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and p.status = 'active'
    )
  );

create policy "Pair members read permitted Contributions"
  on public.contributions
  for select
  to authenticated
  using (
    contributions.user_id = (select auth.uid())
    or exists (
      select 1
      from public.moments m
      join public.pair_memberships pm on pm.pair_id = m.pair_id
      where m.id = contributions.moment_id
        and pm.user_id = (select auth.uid())
        and pm.ended_at is null
        and m.status = 'revealed'
    )
  );

create policy "Pair members read Memories"
  on public.memories
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pair_memberships pm
      where pm.pair_id = memories.pair_id
        and pm.user_id = (select auth.uid())
    )
  );

alter publication supabase_realtime add table public.moments, public.memories;
