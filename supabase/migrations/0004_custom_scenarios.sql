-- User-authored Arch Board scenarios.
-- Checks are stored as JSONB in the evaluator's native shape (kind/type/from/to/
-- label/points) so evaluate() runs them exactly like the built-in library.

create table custom_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  brief text not null default '',
  budget int not null,
  checks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_scenarios_user_created on custom_scenarios (user_id, created_at desc);

alter table custom_scenarios enable row level security;

create policy "own rows" on custom_scenarios
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger custom_scenarios_set_updated_at
  before update on custom_scenarios
  for each row execute function set_updated_at();
