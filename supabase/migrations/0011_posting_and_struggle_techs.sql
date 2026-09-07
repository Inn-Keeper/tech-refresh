-- Phase 6: Quest drives Prep.
-- contacts.posting_techs: techs detected from a pasted job posting (the raw
-- posting text is parsed client-side and never stored, mirroring the CV flow).
-- retros.struggled_techs: techs the candidate struggled with in a real
-- interview — feeds drill weighting on Prep.

alter table contacts add column posting_techs text[] not null default '{}';
alter table retros add column struggled_techs text[] not null default '{}';
