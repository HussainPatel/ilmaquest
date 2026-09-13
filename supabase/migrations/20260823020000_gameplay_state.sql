-- Adds the minimum state needed for a host to drive a live quiz: which
-- question is currently showing, and when it started (for a future timer/
-- speed-bonus feature). Not in the original docs/DATA_MODEL.md — documented
-- there now alongside this migration.
alter table public.game_sessions
  add column current_question_index int not null default 0,
  add column question_started_at timestamptz;
