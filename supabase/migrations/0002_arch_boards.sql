-- Persisted Arch Board canvases.
-- Nodes and edges are stored as JSONB because the board model is intentionally
-- document-shaped: a small, user-owned design snapshot rather than shared graph entities.

create table arch_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  scenario_id text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index arch_boards_user_updated on arch_boards (user_id, updated_at desc);

alter table arch_boards enable row level security;

create policy "own rows" on arch_boards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
