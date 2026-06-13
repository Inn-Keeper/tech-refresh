-- Grip schema v1: single-user job-hunt toolkit.
-- Every table is RLS-protected: rows belong to auth.uid().

-- ── profiles: one row per user, holds accumulated XP ─────────────────────────
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  xp int not null default 0
);

-- ── contacts: hiring pipeline ────────────────────────────────────────────────
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  status text not null default 'Contacted'
    check (status in ('Contacted', 'Applied', 'Interviewing', 'Offer', 'Rejected')),
  role text,
  link text,
  note text,
  date date,
  next_action text,
  next_action_date date,
  created_at timestamptz not null default now()
);

-- ── retros: interview retrospectives, 1:N under contacts ────────────────────
create table retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  contact_id uuid not null references contacts (id) on delete cascade,
  round text,
  questions text,
  went_well text,
  to_improve text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ── stories: STAR behavioral story bank ──────────────────────────────────────
create table stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  competency text not null,
  situation text,
  task text,
  action text,
  result text,
  created_at timestamptz not null default now()
);

-- ── answer_events: one row per quiz answer (analytics-friendly) ─────────────
create table answer_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  tech text not null,
  correct boolean not null,
  source text not null default 'card' check (source in ('card', 'drill', 'import')),
  created_at timestamptz not null default now()
);

create index answer_events_user_tech on answer_events (user_id, tech);

-- ── RLS: owner-only on everything ────────────────────────────────────────────
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table retros enable row level security;
alter table stories enable row level security;
alter table answer_events enable row level security;

create policy "own rows" on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on retros
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on stories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on answer_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── add_xp: atomic XP increment, creates the profile row on first use ───────
create or replace function add_xp(points int)
returns int
language sql
security invoker
as $$
  insert into profiles (user_id, xp)
  values (auth.uid(), points)
  on conflict (user_id) do update set xp = profiles.xp + excluded.xp
  returning xp;
$$;
