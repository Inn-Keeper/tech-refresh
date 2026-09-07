-- Phase 6: shareable Arch Board evaluations.
-- A board becomes public via an unguessable token. Reads go through a
-- token-scoped security-definer RPC instead of a select policy, so shared
-- boards cannot be enumerated — you must hold the exact token.

alter table arch_boards add column share_token uuid unique;

-- Owner-only toggle (security invoker: RLS "own rows" scopes the update).
-- Re-enabling keeps the existing token so shared links stay stable.
create or replace function set_board_sharing(board_id uuid, enable boolean)
returns uuid
language sql
security invoker
as $$
  update arch_boards
  set share_token = case when enable then coalesce(share_token, gen_random_uuid()) end
  where id = board_id
  returning share_token;
$$;

create or replace function get_shared_board(token uuid)
returns table (title text, scenario_id text, nodes jsonb, edges jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select title, scenario_id, nodes, edges, updated_at
  from arch_boards
  where share_token = token;
$$;

revoke all on function get_shared_board(uuid) from public;
grant execute on function get_shared_board(uuid) to anon, authenticated;
