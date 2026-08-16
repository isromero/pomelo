create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  anniversary date not null check (
    anniversary >= date '1900-01-01' and anniversary <= current_date
  ),
  status text not null default 'waiting' check (
    status in ('waiting', 'active', 'archived')
  ),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  dissolved_at timestamptz,
  check (
    (status = 'waiting' and activated_at is null and dissolved_at is null)
    or (status = 'active' and activated_at is not null and dissolved_at is null)
    or (status = 'archived' and dissolved_at is not null)
  )
);

create table public.pair_memberships (
  pair_id uuid not null references public.pairs (id),
  user_id uuid not null references auth.users (id),
  role text not null check (role in ('creator', 'member')),
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  primary key (pair_id, user_id),
  check (ended_at is null or ended_at >= joined_at)
);

create unique index pair_memberships_one_current_pair_per_user
  on public.pair_memberships (user_id)
  where ended_at is null;

create unique index pair_memberships_one_creator_per_pair
  on public.pair_memberships (pair_id)
  where role = 'creator';

create table public.pair_invitations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id),
  creator_id uuid not null references auth.users (id),
  token text not null unique check (
    token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  code text not null unique check (code ~ '^[A-F0-9]{8}$'),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'cancelled', 'expired')
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id),
  cancelled_at timestamptz,
  check (expires_at > created_at),
  check (
    (status = 'accepted' and accepted_at is not null and accepted_by is not null)
    or (status != 'accepted' and accepted_at is null and accepted_by is null)
  ),
  check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status != 'cancelled' and cancelled_at is null)
  )
);

create unique index pair_invitations_one_pending_per_pair
  on public.pair_invitations (pair_id)
  where status = 'pending';

create function public.enforce_pair_membership_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair_status text;
begin
  select status
  into pair_status
  from public.pairs
  where id = new.pair_id
  for update;

  if pair_status is distinct from 'waiting' then
    raise exception using errcode = '23514', message = 'pair_not_waiting';
  end if;

  if (
    select count(*)
    from public.pair_memberships
    where pair_id = new.pair_id and ended_at is null
  ) >= 2 then
    raise exception using errcode = '23514', message = 'pair_full';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_pair_membership_limit() from public, anon, authenticated;

create trigger pair_memberships_enforce_limit
before insert on public.pair_memberships
for each row execute function public.enforce_pair_membership_limit();

create function public.create_pair_invitation_record(
  target_pair_id uuid,
  target_creator_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_code text;
  invitation_id uuid;
begin
  loop
    invitation_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.pair_invitations where code = invitation_code
    );
  end loop;

  insert into public.pair_invitations (
    pair_id,
    creator_id,
    token,
    code,
    expires_at
  ) values (
    target_pair_id,
    target_creator_id,
    gen_random_uuid()::text,
    invitation_code,
    now() + interval '7 days'
  )
  returning id into invitation_id;

  return invitation_id;
end;
$$;

revoke all on function public.create_pair_invitation_record(uuid, uuid)
  from public, anon, authenticated;

create function public.pair_state_for_user(target_user_id uuid)
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

  return jsonb_build_object(
    'id', selected_pair.id,
    'anniversary', selected_pair.anniversary,
    'status', selected_pair.status,
    'members', members,
    'invitation', invitation
  );
end;
$$;

revoke all on function public.pair_state_for_user(uuid) from public, anon, authenticated;

create function public.get_pair_state()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select public.pair_state_for_user(auth.uid());
$$;

revoke all on function public.get_pair_state() from public, anon;
grant execute on function public.get_pair_state() to authenticated;

create function public.create_pair_with_invitation(pair_anniversary date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_pair_id uuid;
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

  if exists (
    select 1
    from public.pair_memberships
    where user_id = current_user_id and ended_at is null
  ) then
    return jsonb_build_object('error', 'already_paired');
  end if;

  insert into public.pairs (anniversary, created_by)
  values (pair_anniversary, current_user_id)
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

create function public.create_pair_invitation()
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
    and pm.role = 'creator'
    and p.status = 'waiting'
  for update of p;

  if selected_pair_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  update public.pair_invitations
  set status = 'expired'
  where pair_id = selected_pair_id
    and status = 'pending'
    and expires_at <= now();

  if not exists (
    select 1
    from public.pair_invitations
    where pair_id = selected_pair_id and status = 'pending'
  ) then
    perform public.create_pair_invitation_record(selected_pair_id, current_user_id);
  end if;

  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.create_pair_invitation() from public, anon;
grant execute on function public.create_pair_invitation() to authenticated;

create function public.cancel_pair_invitation(invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_invitation public.pair_invitations%rowtype;
begin
  select *
  into selected_invitation
  from public.pair_invitations
  where id = invitation_id and creator_id = current_user_id
  for update;

  if selected_invitation.id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  if selected_invitation.status = 'pending' then
    if selected_invitation.expires_at <= now() then
      update public.pair_invitations
      set status = 'expired'
      where id = selected_invitation.id;
    else
      update public.pair_invitations
      set status = 'cancelled', cancelled_at = now()
      where id = selected_invitation.id;
    end if;
  end if;

  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.cancel_pair_invitation(uuid) from public, anon;
grant execute on function public.cancel_pair_invitation(uuid) to authenticated;

create function public.preview_pair_invitation(invitation_credential text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  compact_credential text := upper(regexp_replace(trim(invitation_credential), '[[:space:]-]', '', 'g'));
  selected_invitation public.pair_invitations%rowtype;
  selected_pair public.pairs%rowtype;
  creator_name text;
  active_members bigint;
begin
  select *
  into selected_invitation
  from public.pair_invitations
  where token = lower(trim(invitation_credential))
    or code = compact_credential
  limit 1;

  if selected_invitation.id is null then
    return jsonb_build_object(
      'status', 'invalid',
      'creatorName', null,
      'anniversary', null
    );
  end if;

  if selected_invitation.status = 'pending'
    and selected_invitation.expires_at <= now() then
    update public.pair_invitations
    set status = 'expired'
    where id = selected_invitation.id;
    selected_invitation.status := 'expired';
  end if;

  if selected_invitation.status = 'accepted' then
    return jsonb_build_object('status', 'used', 'creatorName', null, 'anniversary', null);
  end if;
  if selected_invitation.status = 'cancelled' then
    return jsonb_build_object('status', 'cancelled', 'creatorName', null, 'anniversary', null);
  end if;
  if selected_invitation.status = 'expired' then
    return jsonb_build_object('status', 'expired', 'creatorName', null, 'anniversary', null);
  end if;

  select * into selected_pair from public.pairs where id = selected_invitation.pair_id;
  select count(*) into active_members
  from public.pair_memberships
  where pair_id = selected_pair.id and ended_at is null;

  if selected_pair.status != 'waiting' or active_members >= 2 then
    return jsonb_build_object('status', 'pairFull', 'creatorName', null, 'anniversary', null);
  end if;

  select display_name into creator_name
  from public.profiles
  where id = selected_invitation.creator_id;

  return jsonb_build_object(
    'status', 'valid',
    'creatorName', creator_name,
    'anniversary', selected_pair.anniversary
  );
end;
$$;

revoke all on function public.preview_pair_invitation(text) from public;
grant execute on function public.preview_pair_invitation(text) to anon, authenticated;

create function public.accept_pair_invitation(invitation_credential text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  compact_credential text := upper(regexp_replace(trim(invitation_credential), '[[:space:]-]', '', 'g'));
  selected_invitation public.pair_invitations%rowtype;
  selected_pair public.pairs%rowtype;
  active_members bigint;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'not_allowed');
  end if;

  select *
  into selected_invitation
  from public.pair_invitations
  where token = lower(trim(invitation_credential))
    or code = compact_credential
  limit 1
  for update;

  if selected_invitation.id is null then
    return jsonb_build_object('error', 'invitation_invalid');
  end if;
  if selected_invitation.status = 'accepted' then
    return jsonb_build_object('error', 'invitation_used');
  end if;
  if selected_invitation.status = 'cancelled' then
    return jsonb_build_object('error', 'invitation_cancelled');
  end if;
  if selected_invitation.status = 'expired'
    or selected_invitation.expires_at <= now() then
    if selected_invitation.status = 'pending' then
      update public.pair_invitations
      set status = 'expired'
      where id = selected_invitation.id;
    end if;
    return jsonb_build_object('error', 'invitation_expired');
  end if;

  select *
  into selected_pair
  from public.pairs
  where id = selected_invitation.pair_id
  for update;

  select count(*) into active_members
  from public.pair_memberships
  where pair_id = selected_pair.id and ended_at is null;

  if selected_pair.status != 'waiting' or active_members >= 2 then
    return jsonb_build_object('error', 'pair_full');
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id and avatar_key is not null and birth_date is not null
  ) then
    return jsonb_build_object('error', 'profile_incomplete');
  end if;

  if exists (
    select 1
    from public.pair_memberships
    where user_id = current_user_id and ended_at is null
  ) then
    return jsonb_build_object('error', 'already_paired');
  end if;

  begin
    insert into public.pair_memberships (pair_id, user_id, role)
    values (selected_pair.id, current_user_id, 'member');
  exception
    when unique_violation then
      return jsonb_build_object('error', 'already_paired');
    when check_violation then
      return jsonb_build_object('error', 'pair_full');
  end;

  update public.pair_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = current_user_id
  where id = selected_invitation.id;

  update public.pair_invitations
  set status = 'cancelled', cancelled_at = now()
  where pair_id = selected_pair.id
    and id != selected_invitation.id
    and status = 'pending';

  update public.pairs
  set status = 'active', activated_at = now()
  where id = selected_pair.id;

  return public.pair_state_for_user(current_user_id);
end;
$$;

revoke all on function public.accept_pair_invitation(text) from public, anon;
grant execute on function public.accept_pair_invitation(text) to authenticated;

create function public.dissolve_pair()
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

alter table public.pairs enable row level security;
alter table public.pair_memberships enable row level security;
alter table public.pair_invitations enable row level security;

revoke all on table public.pairs from anon, authenticated;
revoke all on table public.pair_memberships from anon, authenticated;
revoke all on table public.pair_invitations from anon, authenticated;

grant select on table public.pairs to authenticated;
grant select on table public.pair_memberships to authenticated;
grant select on table public.pair_invitations to authenticated;
grant all on table public.pairs to service_role;
grant all on table public.pair_memberships to service_role;
grant all on table public.pair_invitations to service_role;

create policy "Members read their Pair"
  on public.pairs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pair_memberships
      where pair_id = pairs.id and user_id = (select auth.uid())
    )
  );

create policy "Users read their own Pair membership"
  on public.pair_memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Creators read their Invitations"
  on public.pair_invitations
  for select
  to authenticated
  using (creator_id = (select auth.uid()));

alter publication supabase_realtime add table public.pairs, public.pair_invitations;
