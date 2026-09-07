-- Bind GitHub OAuth metadata into app profiles.
-- RLS remains owner-only through profiles.user_id = auth.uid(); this keeps
-- the profile row enriched when the auth identity comes from GitHub.

create or replace function create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  github_username text;
begin
  github_username := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username'
  );

  insert into profiles (user_id, email, display_name, avatar_url, github_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when github_username is null or github_username = '' then null
      else 'https://github.com/' || github_username
    end
  )
  on conflict (user_id) do update
    set email = excluded.email,
        display_name = coalesce(profiles.display_name, excluded.display_name),
        avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
        github_url = coalesce(profiles.github_url, excluded.github_url),
        updated_at = now();

  return new;
end;
$$;

insert into profiles (user_id, email, display_name, avatar_url, github_url)
select
  id,
  email,
  coalesce(
    raw_user_meta_data ->> 'display_name',
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name'
  ),
  raw_user_meta_data ->> 'avatar_url',
  case
    when coalesce(raw_user_meta_data ->> 'user_name', raw_user_meta_data ->> 'preferred_username') is null
      or coalesce(raw_user_meta_data ->> 'user_name', raw_user_meta_data ->> 'preferred_username') = ''
      then null
    else 'https://github.com/' || coalesce(raw_user_meta_data ->> 'user_name', raw_user_meta_data ->> 'preferred_username')
  end
from auth.users
on conflict (user_id) do update
  set email = excluded.email,
      display_name = coalesce(profiles.display_name, excluded.display_name),
      avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
      github_url = coalesce(profiles.github_url, excluded.github_url),
      updated_at = now();
