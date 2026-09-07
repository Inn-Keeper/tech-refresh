-- Techs extracted from a user's CV, persisted for Interview Prep customization.
-- The raw CV is parsed in-browser and never stored; only the derived tech list
-- lands here. Inherits the profiles "own rows" RLS (user_id = auth.uid()).

alter table profiles
  add column if not exists cv_techs text[] not null default '{}';
