-- The spoken half of a design round, saved alongside the board it belongs to.
-- Document-shaped like nodes/edges: six free-text sections plus a self-rating,
-- owned entirely by the board, never queried across rows. Existing boards
-- default to an empty object and normalize to blank sections on read.

alter table arch_boards add column talk_track jsonb not null default '{}'::jsonb;
