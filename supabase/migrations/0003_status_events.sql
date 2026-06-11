-- Exact funnel data: one row per contact status transition, written by a
-- trigger so no client can forget it. Fixes the two documented funnel
-- approximations (survivorship bias on conversions, stage-date overwrites
-- corrupting applications/week).

create table status_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create index status_events_user_created on status_events (user_id, created_at);

alter table status_events enable row level security;

create policy "own rows" on status_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Record the initial status on insert and every change afterwards.
create or replace function record_contact_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into status_events (user_id, contact_id, status)
    values (new.user_id, new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger contacts_status_event
  after insert or update of status on contacts
  for each row execute function record_contact_status();

-- Backfill: existing contacts contribute their current stage, dated by the
-- stage date when present. Earlier transitions are unknowable; conversions
-- converge to exact as new events accrue.
insert into status_events (user_id, contact_id, status, created_at)
select user_id, id, status, coalesce(date::timestamptz, created_at)
from contacts;

-- arch_boards.updated_at becomes server-owned instead of client-clock-owned.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger arch_boards_set_updated_at
  before update on arch_boards
  for each row execute function set_updated_at();
