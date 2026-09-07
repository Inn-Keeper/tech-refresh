-- Reasoning quality must come from a separate assessment. Talk-track length
-- and the candidate's self-rating remain practice metadata and do not populate
-- this field.

alter table arch_boards
  add column talk_grade int
  check (talk_grade between 0 and 100);
