-- Implements the content lifecycle and source rules from docs/CONTENT_PROCESS.md.

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  audience_level  text not null check (audience_level in ('kids','general','advanced')),
  is_active       boolean not null default true
);

alter table public.categories enable row level security;

create policy "categories_select_all" on public.categories
  for select using (true);

create policy "categories_admin_insert" on public.categories
  for insert with check (public.current_role() = 'admin');

create policy "categories_admin_update" on public.categories
  for update using (public.current_role() = 'admin');


-- Raw, source-of-truth material (Quran ayat, hadith, seerah citations, fiqh refs).
-- Not exposed to players directly — only staff, since it includes unreviewed/in-progress
-- editorial material. Players only ever see the resulting `questions` row.
create table public.sources (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in ('quran','hadith','seerah','fiqh')),
  external_ref      text not null,
  text_original     text,
  text_translation  text,
  translator        text,
  grading           text check (grading in ('sahih','hasan')),
  madhab            text check (madhab in ('hanafi','shafii','maliki','hanbali','consensus')),
  citation_text     text,
  fetched_at        timestamptz,
  api_source        text,
  created_by        uuid not null references public.users(id),
  created_at        timestamptz not null default now(),

  -- Hard DB-level guards from CONTENT_PROCESS.md §1 — not just reviewer judgment calls.
  constraint hadith_requires_grading  check (type <> 'hadith'  or grading is not null),
  constraint fiqh_requires_madhab     check (type <> 'fiqh'    or madhab is not null),
  constraint seerah_requires_citation check (type <> 'seerah'  or citation_text is not null)
);

alter table public.sources enable row level security;

create policy "sources_select_staff" on public.sources
  for select using (public.current_role() in ('contributor','reviewer','senior_reviewer','admin'));

create policy "sources_insert_staff" on public.sources
  for insert with check (
    public.current_role() in ('contributor','reviewer','senior_reviewer','admin')
    and created_by = auth.uid()
  );


create table public.questions (
  id                  uuid primary key default gen_random_uuid(),
  source_id           uuid not null references public.sources(id),
  category_id         uuid not null references public.categories(id),
  question_text       text not null,
  choices             jsonb not null,
  correct_choice_id   text not null,
  explanation_text    text not null,
  difficulty          int not null check (difficulty between 1 and 5),
  state               text not null default 'draft'
                        check (state in ('draft','pending_review','needs_edit','rejected','approved','published','flagged','retired')),
  version             int not null default 1,
  parent_question_id  uuid references public.questions(id),
  is_ai_drafted       boolean not null default false,
  created_by          uuid not null references public.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.questions enable row level security;

-- Anyone (including anonymous players) can see published questions only.
create policy "questions_select_published" on public.questions
  for select using (state = 'published');

-- A contributor can always see their own drafts, whatever state they're in.
create policy "questions_select_own" on public.questions
  for select using (created_by = auth.uid());

-- Reviewers/admins can see everything, including the review queue.
create policy "questions_select_staff" on public.questions
  for select using (public.current_role() in ('reviewer','senior_reviewer','admin'));

create policy "questions_insert_contributor" on public.questions
  for insert with check (
    public.current_role() in ('contributor','reviewer','senior_reviewer','admin')
    and created_by = auth.uid()
    and state = 'draft'
  );

-- Contributors may edit their own draft/needs_edit questions and submit them for review.
create policy "questions_update_own_draft" on public.questions
  for update using (
    created_by = auth.uid() and state in ('draft','needs_edit')
  ) with check (
    created_by = auth.uid() and state in ('draft','pending_review')
  );

-- Reviewers/senior reviewers/admins drive every other state transition
-- (pending_review -> approved/rejected/needs_edit, approved -> published,
--  published -> flagged/retired).
create policy "questions_update_staff" on public.questions
  for update using (public.current_role() in ('reviewer','senior_reviewer','admin'));


-- Append-only audit trail of every review decision.
create table public.review_log (
  id             uuid primary key default gen_random_uuid(),
  question_id    uuid not null references public.questions(id),
  reviewer_id    uuid not null references public.users(id),
  action         text not null check (action in ('approve','reject','needs_edit','flag','publish','retire')),
  comment        text,
  created_at     timestamptz not null default now()
);

alter table public.review_log enable row level security;

create policy "review_log_select_staff" on public.review_log
  for select using (public.current_role() in ('reviewer','senior_reviewer','admin'));

-- The two-person rule from CONTENT_PROCESS.md §3, enforced at the database layer:
-- a reviewer can never log a review decision on a question they authored themselves.
create policy "review_log_insert_staff" on public.review_log
  for insert with check (
    public.current_role() in ('reviewer','senior_reviewer','admin')
    and reviewer_id = auth.uid()
    and reviewer_id <> (select created_by from public.questions where id = question_id)
  );


-- User-facing "report an issue" flags, including anonymous reports (flagged_by nullable).
create table public.flags (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.questions(id),
  flagged_by    uuid references public.users(id),
  reason        text not null,
  created_at    timestamptz not null default now(),
  resolved_by   uuid references public.users(id),
  resolved_at   timestamptz
);

alter table public.flags enable row level security;

create policy "flags_insert_anyone" on public.flags
  for insert with check (true);

create policy "flags_select_staff" on public.flags
  for select using (public.current_role() in ('reviewer','senior_reviewer','admin'));

create policy "flags_update_staff" on public.flags
  for update using (public.current_role() in ('reviewer','senior_reviewer','admin'));

-- Fail-safe: pull a published question from rotation automatically once it
-- accumulates 2 flags, before any human has looked at it (CONTENT_PROCESS.md §6).
create function public.handle_new_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  flag_count int;
begin
  select count(*) into flag_count from public.flags where question_id = new.question_id;
  if flag_count >= 2 then
    update public.questions
      set state = 'flagged', updated_at = now()
      where id = new.question_id and state = 'published';
  end if;
  return new;
end;
$$;

create trigger trg_new_flag
  after insert on public.flags
  for each row execute function public.handle_new_flag();
