-- Needed for the "edit a needs_edit question" flow: sources previously had
-- no UPDATE policy at all, so a contributor acting on reviewer feedback
-- (e.g. "add a translator attribution") had no way to fix the source. Scoped
-- tightly: only the source's own author, and only while the question that
-- uses it is still draft/needs_edit — once a question is pending_review or
-- further along, its source becomes immutable through this policy.
create policy "sources_update_own_unpublished_question" on public.sources
  for update using (
    created_by = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.source_id = sources.id
        and q.created_by = auth.uid()
        and q.state in ('draft', 'needs_edit')
    )
  );
