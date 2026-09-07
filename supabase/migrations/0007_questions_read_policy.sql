-- Fix readability of the shared questions bank.
--
-- 0005 used `auth.role() = 'authenticated'`, which can deny the app's reads
-- (returning zero rows), making the UI silently fall back to static prep
-- questions that don't vary by difficulty. Questions are shared, non-sensitive
-- content, so allow plain read access for everyone (writes are still seeded with
-- the service-role key and have no client write policy).

drop policy if exists "read all" on questions;

create policy "questions read" on questions
  for select using (true);
