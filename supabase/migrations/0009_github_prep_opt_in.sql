-- Let users choose whether GitHub techs customize Interview Prep.

alter table profiles
  add column if not exists use_github_techs_for_prep boolean not null default false;
