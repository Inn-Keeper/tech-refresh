-- Complete app profile rows for Web and Mobile.
-- Auth remains the identity source; profiles stores user-owned app metadata.

alter table profiles
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists headline text,
  add column if not exists target_role text,
  add column if not exists location text,
  add column if not exists portfolio_url text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists timezone text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (user_id) do update
    set email = excluded.email,
        display_name = coalesce(profiles.display_name, excluded.display_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;

create trigger auth_users_create_profile
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function create_profile_for_auth_user();

insert into profiles (user_id, email, display_name)
select
  id,
  email,
  coalesce(
    raw_user_meta_data ->> 'display_name',
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name'
  )
from auth.users
on conflict (user_id) do update
  set email = excluded.email,
      display_name = coalesce(profiles.display_name, excluded.display_name),
      updated_at = now();

drop trigger if exists profiles_set_updated_at on profiles;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();
