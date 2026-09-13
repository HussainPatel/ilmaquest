# Data Model

This schema implements the process described in [CONTENT_PROCESS.md](CONTENT_PROCESS.md) and supports the core quiz/host/join flow plus the Chrome extension challenge system. Written as Postgres tables (works directly as Supabase SQL); types are illustrative, not final DDL.

## Content pipeline tables

```sql
-- Approved raw source material (Quran ayat, hadith, seerah citations, fiqh refs)
sources (
  id                uuid primary key,
  type              text not null check (type in ('quran','hadith','seerah','fiqh')),
  external_ref      text not null,        -- e.g. "2:255" or "bukhari:1:1:1"
  text_original     text,                 -- Arabic, where applicable
  text_translation  text,
  translator        text,                 -- required if text_translation is set
  grading           text check (grading in ('sahih','hasan')),  -- required + constrained for type='hadith'
  madhab            text check (madhab in ('hanafi','shafii','maliki','hanbali','consensus')), -- required for type='fiqh'
  citation_text     text,                 -- free-text citation, required for type='seerah'
  fetched_at        timestamptz,
  api_source        text,                 -- 'tanzil' | 'sunnah.com' | 'manual'
  created_at        timestamptz not null default now()
)

-- DB-level guard: hadith sources must carry a valid grading, no exceptions
alter table sources add constraint hadith_requires_grading
  check (type != 'hadith' or grading is not null);

alter table sources add constraint fiqh_requires_madhab
  check (type != 'fiqh' or madhab is not null);

categories (
  id              uuid primary key,
  name            text not null,          -- 'Quran', 'Seerah', 'Hadith', 'Fiqh'
  audience_level  text not null check (audience_level in ('kids','general','advanced')),
  is_active       boolean not null default true
)

questions (
  id                  uuid primary key,
  source_id           uuid not null references sources(id),   -- required, no orphan content
  category_id         uuid not null references categories(id),
  question_text       text not null,
  choices             jsonb not null,     -- [{id, text}, ...]
  correct_choice_id   text not null,
  explanation_text    text not null,
  difficulty          int not null check (difficulty between 1 and 5),
  state               text not null default 'draft'
                        check (state in ('draft','pending_review','needs_edit','rejected','approved','published','flagged','retired')),
  version             int not null default 1,
  parent_question_id  uuid references questions(id),  -- set when this is an edited republish of a prior published question
  is_ai_drafted       boolean not null default false,
  created_by          uuid not null references users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
)

-- append-only audit trail of every review decision
review_log (
  id            uuid primary key,
  question_id   uuid not null references questions(id),
  reviewer_id   uuid not null references users(id),
  action        text not null check (action in ('approve','reject','needs_edit','flag','publish','retire')),
  comment       text,
  created_at    timestamptz not null default now()
)

-- DB-level guard: author cannot review their own submission (enforced in application layer
-- via a trigger or check against questions.created_by at insert time on review_log)

flags (
  id             uuid primary key,
  question_id    uuid not null references questions(id),
  flagged_by     uuid references users(id),   -- nullable: anonymous reports allowed
  reason         text not null,
  created_at     timestamptz not null default now(),
  resolved_by    uuid references users(id),
  resolved_at    timestamptz
)
```

## Users and roles

```sql
users (
  id            uuid primary key,          -- maps to Supabase auth.users
  display_name  text not null,
  email         text,
  role          text not null default 'player'
                  check (role in ('player','contributor','reviewer','senior_reviewer','admin')),
  age_tier      text check (age_tier in ('kid','teen','adult')),   -- self-reported at signup, drives content filtering
  created_at    timestamptz not null default now()
)
```

## Quiz hosting / gameplay

```sql
quizzes (
  id            uuid primary key,
  title         text not null,
  category_id   uuid not null references categories(id),
  question_ids  uuid[] not null,           -- ordered list, all must be state='published'
  created_by    uuid not null references users(id),
  created_at    timestamptz not null default now()
)

game_sessions (
  id            uuid primary key,
  quiz_id       uuid not null references quizzes(id),
  host_id       uuid not null references users(id),
  join_code     text not null unique,      -- short code players enter to join
  status        text not null default 'lobby' check (status in ('lobby','active','finished')),
  started_at    timestamptz,
  ended_at      timestamptz,
  current_question_index  int not null default 0,   -- added in 20260823020000_gameplay_state.sql
  question_started_at     timestamptz                -- added in 20260823020000_gameplay_state.sql
)

game_players (
  id              uuid primary key,
  session_id      uuid not null references game_sessions(id),
  user_id         uuid references users(id),   -- nullable for guest play
  guest_name      text,                         -- required if user_id is null
  score           int not null default 0,
  joined_at       timestamptz not null default now()
)

game_answers (
  id              uuid primary key,
  session_id      uuid not null references game_sessions(id),
  player_id       uuid not null references game_players(id),
  question_id     uuid not null references questions(id),
  choice_id       text not null,
  is_correct      boolean not null,
  answer_ms       int not null,           -- response time, used for scoring speed bonus
  created_at      timestamptz not null default now()
)
```

## Chrome extension: async challenges

```sql
challenges (
  id                uuid primary key,
  quiz_id           uuid not null references quizzes(id),   -- a short 5-question set
  challenger_id     uuid not null references users(id),
  challenger_score  int,
  opponent_id       uuid not null references users(id),
  opponent_score    int,
  status            text not null default 'pending'
                      check (status in ('pending','opponent_played','completed','expired')),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null       -- e.g. 72h to respond
)

notifications (
  id            uuid primary key,
  user_id       uuid not null references users(id),
  type          text not null check (type in ('challenge_received','challenge_result','streak_reminder','scheduled_quiz')),
  payload       jsonb not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
)
```

## Donations

See [MONETIZATION.md](MONETIZATION.md) for the `donations` table and the `users.stripe_customer_id`
column — not duplicated here since that doc covers the full payment flow, not just the schema.

## Notes

- All row-level security (RLS) policies enforcing "users can only see their own answers," "PENDING_REVIEW is invisible to `role='player'`," etc. are defined in [SECURITY.md](SECURITY.md), not duplicated here.
- `questions.state` transitions are the single source of truth for what's playable — `quizzes.question_ids` should be validated (trigger or application check) to only ever reference `state='published'` questions at insert/update time.
