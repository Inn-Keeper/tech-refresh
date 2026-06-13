-- Tiered quiz questions: the first SHARED-content table (all others are
-- per-user). Rows are app content seeded with the service-role key, not written
-- by clients — RLS grants read-only access to any authenticated user and no
-- insert/update/delete policy, so PostgREST rejects client writes.
--
-- `options` is a JSONB array of 4 strings; `correct` is the index of the right
-- answer in the source array (0 by convention) and is shuffled at runtime by
-- shuffleOptions() in packages/core/src/quiz.js.

create table questions (
  id uuid primary key default gen_random_uuid(),
  tech text not null,
  category text not null,
  difficulty text not null check (difficulty in ('easy', 'mid', 'high', 'ultra')),
  prompt text not null,
  options jsonb not null,
  correct int not null default 0,
  explanation text,
  created_at timestamptz not null default now()
);

create index questions_tech_difficulty on questions (tech, difficulty);

alter table questions enable row level security;

create policy "read all" on questions
  for select using (auth.role() = 'authenticated');

-- Tag each answer with the tier it was attempted at, so per-level accuracy can
-- be reported later. Nullable: existing rows and untiered flip-card answers
-- simply carry NULL.
alter table answer_events add column difficulty text
  check (difficulty in ('easy', 'mid', 'high', 'ultra'));
