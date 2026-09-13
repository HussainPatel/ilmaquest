-- Lets any signed-in user browse available quizzes to host — quizzes only
-- bundle already-published question ids (no sensitive content beyond a
-- title/category), so this is safe to open up beyond the creator/admin-only
-- policy from the original DATA_MODEL.md.
create policy "quizzes_select_authenticated" on public.quizzes
  for select using (auth.role() = 'authenticated');
