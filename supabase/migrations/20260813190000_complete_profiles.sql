alter table public.profiles
  add column avatar_key text
    check (avatar_key in ('calm', 'affectionate', 'surprised')),
  add column birth_date date
    check (birth_date >= date '1900-01-01' and birth_date <= current_date);

grant update (avatar_key, birth_date) on public.profiles to authenticated;

create function public.set_profile_updated_at()
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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();
