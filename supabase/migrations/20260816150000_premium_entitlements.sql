create table public.premium_subscriptions (
  subscriber_id uuid primary key references auth.users (id) on delete cascade,
  revenuecat_app_user_id text not null unique,
  product_id text,
  store text,
  status text not null check (status in ('active', 'cancelled', 'expired', 'grace_period')),
  access_until timestamptz,
  will_renew boolean not null default false,
  last_event_at timestamptz not null,
  last_event_id text not null,
  updated_at timestamptz not null default now()
);

create table public.premium_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create index premium_subscriptions_access_until_idx
  on public.premium_subscriptions (access_until);

create function public.premium_timestamp_from_ms(value text)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
begin
  if value is null or value = '' then
    return null;
  end if;
  return to_timestamp(value::numeric / 1000.0);
exception when others then
  return null;
end;
$$;

revoke all on function public.premium_timestamp_from_ms(text) from public, anon, authenticated;

create function public.premium_subscription_payload(
  target_subscription public.premium_subscriptions
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'subscriberId', target_subscription.subscriber_id,
    'productId', target_subscription.product_id,
    'status', case target_subscription.status
      when 'grace_period' then 'gracePeriod'
      else target_subscription.status
    end,
    'expiresAt', target_subscription.access_until,
    'willRenew', target_subscription.will_renew
  );
$$;

revoke all on function public.premium_subscription_payload(public.premium_subscriptions)
  from public, anon, authenticated;

create function public.pair_has_premium(target_pair_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.pair_memberships pm
    join public.premium_subscriptions ps on ps.subscriber_id = pm.user_id
    where pm.pair_id = target_pair_id
      and pm.ended_at is null
      and ps.status in ('active', 'grace_period', 'cancelled')
      and ps.access_until is not null
      and ps.access_until > now()
  );
$$;

revoke all on function public.pair_has_premium(uuid) from public, anon, authenticated;

create function public.get_premium_state()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_pair public.pairs%rowtype;
  selected_subscription public.premium_subscriptions%rowtype;
  selected_access text := 'free';
begin
  if current_user_id is null then
    return jsonb_build_object('access', 'free', 'entitlement', null);
  end if;

  select p.*
  into selected_pair
  from public.pair_memberships pm
  join public.pairs p on p.id = pm.pair_id
  where pm.user_id = current_user_id
  order by (pm.ended_at is null) desc, coalesce(pm.ended_at, pm.joined_at) desc
  limit 1;

  select *
  into selected_subscription
  from public.premium_subscriptions
  where subscriber_id = current_user_id;

  if selected_pair.id is not null
    and selected_pair.status = 'active'
    and public.pair_has_premium(selected_pair.id) then
    selected_access := 'premium';
  elsif selected_pair.id is not null
    and exists (
      select 1
      from public.memories
      where pair_id = selected_pair.id
    ) then
    selected_access := 'archive';
  end if;

  return jsonb_build_object(
    'access', selected_access,
    'entitlement', case
      when selected_subscription.subscriber_id is null then null
      when selected_subscription.status = 'expired'
        then jsonb_build_object(
          'subscriberId', selected_subscription.subscriber_id,
          'productId', selected_subscription.product_id,
          'status', 'expired',
          'expiresAt', selected_subscription.access_until,
          'willRenew', false
        )
      else public.premium_subscription_payload(selected_subscription)
    end
  );
end;
$$;

revoke all on function public.get_premium_state() from public, anon;
grant execute on function public.get_premium_state() to authenticated;

create function public.process_revenuecat_webhook(target_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_payload jsonb := coalesce(target_payload -> 'event', target_payload);
  event_id text := nullif(event_payload ->> 'id', '');
  event_type text := nullif(event_payload ->> 'type', '');
  app_user_id text := nullif(event_payload ->> 'app_user_id', '');
  event_timestamp timestamptz := public.premium_timestamp_from_ms(
    event_payload ->> 'event_timestamp_ms'
  );
  expiration_at timestamptz := public.premium_timestamp_from_ms(
    event_payload ->> 'expiration_at_ms'
  );
  grace_period_expiration_at timestamptz := public.premium_timestamp_from_ms(
    event_payload ->> 'grace_period_expiration_at_ms'
  );
  subscriber_uuid uuid;
  current_subscription public.premium_subscriptions%rowtype;
  next_status text;
  next_access_until timestamptz;
  next_will_renew boolean;
  inserted_event boolean;
begin
  if event_id is null or event_type is null or app_user_id is null then
    return jsonb_build_object('status', 'rejected', 'reason', 'invalid_payload');
  end if;

  event_timestamp := coalesce(event_timestamp, now());
  begin
    subscriber_uuid := app_user_id::uuid;
  exception when others then
    return jsonb_build_object('status', 'ignored', 'reason', 'invalid_app_user_id');
  end;

  if not exists (select 1 from auth.users where id = subscriber_uuid) then
    return jsonb_build_object('status', 'ignored', 'reason', 'unknown_app_user_id');
  end if;

  insert into public.premium_webhook_events (
    event_id,
    event_type,
    app_user_id,
    occurred_at,
    payload
  ) values (
    event_id,
    event_type,
    app_user_id,
    event_timestamp,
    target_payload
  )
  on conflict on constraint premium_webhook_events_pkey do nothing;
  inserted_event := found;

  if not inserted_event then
    return jsonb_build_object('status', 'duplicate', 'eventId', event_id);
  end if;

  select *
  into current_subscription
  from public.premium_subscriptions
  where subscriber_id = subscriber_uuid
  for update;

  if current_subscription.subscriber_id is not null
    and event_timestamp < current_subscription.last_event_at then
    return jsonb_build_object('status', 'ignored', 'reason', 'out_of_order', 'eventId', event_id);
  end if;

  next_status := case event_type
    when 'INITIAL_PURCHASE' then 'active'
    when 'NON_RENEWING_PURCHASE' then 'active'
    when 'RENEWAL' then 'active'
    when 'UNCANCELLATION' then 'active'
    when 'PRODUCT_CHANGE' then 'active'
    when 'CANCELLATION' then 'cancelled'
    when 'BILLING_ISSUE' then case
      when grace_period_expiration_at is not null
        and grace_period_expiration_at > now() then 'grace_period'
      else 'expired'
    end
    when 'EXPIRATION' then 'expired'
    else null
  end;

  if next_status is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'unhandled_event', 'eventId', event_id);
  end if;

  next_access_until := case
    when next_status = 'expired' then coalesce(expiration_at, event_timestamp)
    when next_status = 'grace_period' then coalesce(grace_period_expiration_at, expiration_at)
    else coalesce(expiration_at, current_subscription.access_until)
  end;
  next_will_renew := next_status in ('active', 'grace_period')
    and event_type != 'CANCELLATION';

  insert into public.premium_subscriptions (
    subscriber_id,
    revenuecat_app_user_id,
    product_id,
    store,
    status,
    access_until,
    will_renew,
    last_event_at,
    last_event_id
  ) values (
    subscriber_uuid,
    app_user_id,
    nullif(event_payload ->> 'product_id', ''),
    nullif(event_payload ->> 'store', ''),
    next_status,
    next_access_until,
    next_will_renew,
    event_timestamp,
    event_id
  )
  on conflict (subscriber_id) do update set
    product_id = coalesce(excluded.product_id, public.premium_subscriptions.product_id),
    store = coalesce(excluded.store, public.premium_subscriptions.store),
    status = excluded.status,
    access_until = excluded.access_until,
    will_renew = excluded.will_renew,
    last_event_at = excluded.last_event_at,
    last_event_id = excluded.last_event_id,
    updated_at = now();

  return jsonb_build_object(
    'status', 'processed',
    'eventId', event_id,
    'subscriberId', subscriber_uuid,
    'subscriptionStatus', next_status
  );
end;
$$;

revoke all on function public.process_revenuecat_webhook(jsonb) from public, anon, authenticated;
grant execute on function public.process_revenuecat_webhook(jsonb) to service_role;

alter table public.premium_subscriptions enable row level security;
alter table public.premium_webhook_events enable row level security;
revoke all on table public.premium_subscriptions from anon, authenticated;
revoke all on table public.premium_webhook_events from anon, authenticated;
grant all on table public.premium_subscriptions to service_role;
grant all on table public.premium_webhook_events to service_role;

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
    select 1 from pg_catalog.pg_timezone_names where name = selected_pair_time_zone
  ) then
    selected_pair_time_zone := 'UTC';
  end if;
  selected_local_date := (now() at time zone selected_pair_time_zone)::date;

  select id
  into selected_moment_id
  from public.moments
  where pair_id = selected_pair_id and local_date = selected_local_date;

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
    select *
    into selected_prompt
    from public.prompt_concepts
    where concept_key = 'small_gesture_smile' and active;

    if selected_prompt.concept_key is null then
      return jsonb_build_object('error', 'prompt_unavailable');
    end if;

    select not exists (
      select 1 from public.memories where pair_id = selected_pair_id
    )
    into free_moment;

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
      free_moment
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
