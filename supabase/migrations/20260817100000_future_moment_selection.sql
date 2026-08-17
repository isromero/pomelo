alter function public.get_daily_moment()
  rename to get_daily_moment_legacy;

create function public.get_daily_moment()
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
    and p.status = 'active';

  if selected_pair_id is null then
    return jsonb_build_object('error', 'pair_not_active');
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = selected_pair_time_zone
  ) then
    selected_pair_time_zone := 'UTC';
  end if;
  selected_local_date := (now() at time zone selected_pair_time_zone)::date;

  select m.id
  into selected_moment_id
  from public.moments m
  where m.pair_id = selected_pair_id
    and m.status = 'revealed'
    and m.local_date > selected_local_date
  order by m.local_date desc
  limit 1;

  if selected_moment_id is not null then
    return public.moment_payload_for_user(selected_moment_id, current_user_id);
  end if;

  return public.get_daily_moment_legacy();
end;
$$;

revoke all on function public.get_daily_moment() from public, anon;
grant execute on function public.get_daily_moment() to authenticated;
revoke all on function public.get_daily_moment_legacy() from public, anon, authenticated;
