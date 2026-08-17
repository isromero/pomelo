create or replace function public.get_journal_entries()
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

  select coalesce((
    select state.free_entry_consumed
    from public.pair_journal_state state
    where state.pair_id = selected_pair.id
  ), false) into allowance_consumed;

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

create or replace function public.get_journal_access()
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

  select coalesce((
    select state.free_entry_consumed
    from public.pair_journal_state state
    where state.pair_id = selected_pair.id
  ), false) into allowance_consumed;

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
