-- Quiz hosting/gameplay tables. Anti-cheat principle from docs/ARCHITECTURE.md:
-- correctness and scores are ALWAYS computed and written server-side (via the
-- Supabase service role key in a Next.js API route), never trusted from the client.
-- That's why several tables below have no client-facing INSERT/UPDATE policy for
-- the fields that matter — the absence of a policy is the security control.

create table public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category_id   uuid not null references public.categories(id),
  question_ids  uuid[] not null,
  created_by    uuid not null references public.users(id),
  created_at    timestamptz not null default now()
);

alter table public.quizzes enable row level security;

create policy "quizzes_select_own_or_admin" on public.quizzes
  for select using (created_by = auth.uid() or public.current_role() = 'admin');

create policy "quizzes_insert_own" on public.quizzes
  for insert with check (created_by = auth.uid());

-- Guard: a quiz can only ever reference published questions.
create function public.validate_quiz_questions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from unnest(new.question_ids) as qid
    join public.questions q on q.id = qid
    where q.state <> 'published'
  ) then
    raise exception 'All quiz questions must be in published state.';
  end if;
  return new;
end;
$$;

create trigger trg_validate_quiz_questions
  before insert or update on public.quizzes
  for each row execute function public.validate_quiz_questions();


create table public.game_sessions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id),
  host_id       uuid not null references public.users(id),
  join_code     text not null unique,
  status        text not null default 'lobby' check (status in ('lobby','active','finished')),
  started_at    timestamptz,
  ended_at      timestamptz
);

alter table public.game_sessions enable row level security;

-- NOTE: the join_code is a shared secret, like a Kahoot PIN — knowing it is what lets a
-- player join, not row-level secrecy. Generate it with enough entropy and don't reuse
-- codes across sessions. Anyone can SELECT an open session (needed so a player can look
-- up a session by code before joining); only the host can create/update it.
create policy "sessions_select_open_or_own" on public.game_sessions
  for select using (status in ('lobby','active') or host_id = auth.uid());

create policy "sessions_insert_host" on public.game_sessions
  for insert with check (host_id = auth.uid());

create policy "sessions_update_host" on public.game_sessions
  for update using (host_id = auth.uid());

-- Lets a joined player load quiz metadata for a session they're in.
-- Defined here (after game_sessions exists) rather than in the quizzes block above,
-- since it references this table.
create policy "quizzes_select_via_open_session" on public.quizzes
  for select using (
    exists (
      select 1 from public.game_sessions gs
      where gs.quiz_id = quizzes.id and gs.status in ('lobby','active')
    )
  );


create table public.game_players (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.game_sessions(id),
  user_id       uuid references public.users(id),
  guest_name    text,
  score         int not null default 0,
  joined_at     timestamptz not null default now(),
  constraint player_identity check (user_id is not null or guest_name is not null)
);

alter table public.game_players enable row level security;

-- Read access (needed for the live scoreboard via Supabase Realtime).
create policy "players_select_in_open_session" on public.game_players
  for select using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = session_id and (gs.status in ('lobby','active') or gs.host_id = auth.uid())
    )
  );

-- Deliberately no INSERT/UPDATE policy: joining a session and updating `score`
-- happen only through a server-side API route using the service role key.


create table public.game_answers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.game_sessions(id),
  player_id     uuid not null references public.game_players(id),
  question_id   uuid not null references public.questions(id),
  choice_id     text not null,
  is_correct    boolean not null,
  answer_ms     int not null,
  created_at    timestamptz not null default now()
);

alter table public.game_answers enable row level security;

create policy "answers_select_in_open_session" on public.game_answers
  for select using (
    exists (
      select 1 from public.game_sessions gs
      where gs.id = session_id and (gs.status in ('lobby','active') or gs.host_id = auth.uid())
    )
  );

-- Deliberately no client INSERT policy: the API route receives {player_id, question_id,
-- choice_id, answer_ms} from the client, computes is_correct itself from
-- questions.correct_choice_id server-side, and only then writes the row — the client
-- never gets to assert its own answer was correct.
