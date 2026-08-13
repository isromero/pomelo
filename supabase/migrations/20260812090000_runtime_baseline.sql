create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  locale text not null default 'es' check (locale in ('es', 'en')),
  appearance text not null default 'system' check (appearance in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_concepts (
  concept_key text primary key check (concept_key ~ '^[a-z0-9_]+$'),
  format text not null check (format in ('question', 'photo', 'doodle')),
  prompt_es text not null check (char_length(prompt_es) > 0),
  prompt_en text not null check (char_length(prompt_en) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.prompt_concepts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.prompt_concepts from anon, authenticated;

grant select on table public.profiles to anon;
grant select on table public.prompt_concepts to anon;
grant select, update (display_name, locale, appearance, updated_at)
  on table public.profiles to authenticated;
grant select on table public.prompt_concepts to authenticated;

create policy "Users read their own Profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users update their own Profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users read active Prompt concepts"
  on public.prompt_concepts
  for select
  to authenticated
  using (active);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, locale, appearance)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Pomelo'
    ),
    case when new.raw_user_meta_data ->> 'locale' in ('es', 'en')
      then new.raw_user_meta_data ->> 'locale' else 'es' end,
    case when new.raw_user_meta_data ->> 'appearance' in ('system', 'light', 'dark')
      then new.raw_user_meta_data ->> 'appearance' else 'system' end
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
