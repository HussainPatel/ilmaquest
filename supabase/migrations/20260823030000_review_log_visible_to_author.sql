-- Gap found while building the "my submissions" page: a contributor whose
-- question was rejected or sent back for edits had no way to see the
-- reviewer's comment, since review_log was staff-only. A usable pipeline
-- requires the author to see why, so this adds read access scoped to their
-- own questions only (not the whole review_log).
create policy "review_log_select_own_question" on public.review_log
  for select using (
    exists (
      select 1 from public.questions q
      where q.id = review_log.question_id and q.created_by = auth.uid()
    )
  );
