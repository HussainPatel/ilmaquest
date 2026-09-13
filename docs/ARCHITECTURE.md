# Architecture

## Why this stack

The user building this is new to these technologies but is launching a real product and cares about security, data integrity, and performance. That combination points toward a **managed platform** over fully custom infrastructure: you get production-grade security defaults (auth, encrypted storage, row-level security) without needing deep ops expertise, while still owning real infrastructure — not a no-code toy.

| Layer | Choice | Why |
|---|---|---|
| Frontend + backend | **Next.js** (React, TypeScript) | One language/framework for UI and API routes — less to learn than separate frontend/backend stacks. Huge ecosystem, easy hosting on Vercel. |
| Database + Auth + Storage | **Supabase** (managed Postgres) | Real Postgres (not a proprietary DB), built-in auth (email, magic link, OAuth), **row-level security (RLS)** enforced at the database layer so security doesn't depend on remembering to check permissions in every API route, and file storage for any future media. MVP auth: email magic link only (decided 2026-08-23). Google/OAuth sign-in deferred to a later phase — add via Supabase's built-in OAuth provider config when ready, no schema changes needed. |
| Hosting | **Vercel** | Zero-config deploys from git, automatic HTTPS, handles scaling without server management. |
| Real-time gameplay | **Supabase Realtime** (Postgres logical replication over websockets) | Live quiz host/join screens (lobby updates, live scoreboards) without standing up a separate websocket server. |
| Chrome extension | **Manifest V3**, TypeScript, shares auth session with the web app | See dedicated section below. |
| AI assist | Claude API, RAG restricted to `sources`/`questions` tables only (see CONTENT_PROCESS.md) | Never given open internet access when drafting religious content — grounded only in pre-approved sources. |
| Payments | **Stripe** (Checkout + Billing Portal + webhooks) | Donations only (see MONETIZATION.md). Hosted Checkout means card data never touches our server; hosted Billing Portal means we don't build subscription-management UI ourselves. |

This is a recommendation, not a lock-in: Supabase is standard Postgres underneath, so migrating off it later (e.g. to self-hosted Postgres) is possible without a rewrite if the project outgrows it.

## High-level system diagram

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   Web App   │◄──────►│   Next.js API     │◄──────►│    Supabase      │
│  (players,  │        │   routes          │        │  (Postgres+Auth  │
│  reviewers, │        │                   │        │   +RLS+Realtime) │
│   admins)   │        └──────────────────┘        └─────────────────┘
└─────────────┘                 ▲                            ▲
      ▲                         │                             │
      │                  ┌──────┴───────┐                     │
      │                  │  Claude API   │◄────────────────────┘
      │                  │ (content-     │   (RAG over approved
      │                  │  draft assist)│    sources/questions only)
      │                  └──────────────┘
      │
┌─────┴───────────┐
│ Chrome Extension │──── shares auth session with web app
│ (MV3, service    │──── polls/receives challenge + streak notifications
│  worker)         │
└──────────────────┘
```

## Live quiz gameplay flow (host/join)

1. Host creates a `game_sessions` row from a published `quiz`, gets a short `join_code`.
2. Players join via code (logged in or guest), inserted into `game_players`.
3. Host advances questions; each question push and countdown is broadcast via Supabase Realtime channel scoped to `session_id`.
4. Players submit answers → `game_answers` insert → score computed server-side (API route), never trusted from the client, to prevent score tampering.
5. Live scoreboard reads from `game_answers`/`game_players` via the same realtime channel.
6. On `status='finished'`, final results are persisted and the session channel closes.

**Anti-cheat principle**: correctness and scoring are always computed server-side from `game_answers.answer_ms` and the question's `correct_choice_id` — the client only ever sends "player X chose option Y at time T," never a score or correctness value.

## Chrome extension design (Manifest V3)

- **Background**: a service worker (MV3 has no persistent background page) using `chrome.alarms` to poll the backend every ~15 minutes for pending challenges/notifications — avoids needing a long-lived websocket inside a service worker, which MV3 aggressively suspends.
- **Auth handoff**: extension opens a one-time auth link to the web app on install; web app issues a scoped token the extension stores via `chrome.storage.local` (never `localStorage`, which extensions shouldn't rely on for this). Token is short-lived and refreshed, not a permanent credential.
- **Notifications**: `chrome.notifications.create()` for "X challenged you" / "Daily streak quiz ready" — click opens a popup or new tab straight into the challenge.
- **Async challenge model (v1, not live multiplayer)**: challenger plays a 5-question set anytime; a `challenges` row is created; opponent gets notified whenever they're next online (via the alarm poll) and plays the same set independently; winner is determined by comparing `challenger_score`/`opponent_score`. This avoids needing both users online simultaneously, which is much simpler to build and ship than true real-time sync inside a browser extension.
- **Least privilege**: extension requests only the permissions it needs (`notifications`, `alarms`, `storage`, and host permission scoped to the app's own domain) — never broad `<all_urls>` access.

## Chrome extension implementation notes (2026-08-23)

Built as plain JavaScript with ES modules (`extension/`), not TypeScript with
a bundler — a deliberate simplification given the extension is only 4 small
files (`background.js`, `popup.html`/`popup.js`, `shared.js`). Adding a build
pipeline (webpack/esbuild) for something this size would be setup overhead
without much payback at this stage; revisit if the extension grows.

- **Auth**: `public.extension_tokens` (hash stored, raw token shown once at
  `/extension/connect`) — the handoff is manual copy/paste from the web app
  into the popup for v1, not an automatic deep-link. Simpler to build and
  reason about; an automatic handoff is a documented future improvement.
- **Polling**: every 5 minutes via `chrome.alarms` (ARCHITECTURE.md originally
  called for ~15 min in real use — 5 min is a reasonable middle ground for
  early testing).
- **Extension-facing API** (`/api/extension/*`) authenticates via
  `Authorization: Bearer <token>`, not cookies — see `src/lib/extension/auth.ts`.
  Uses the service-role client (the extension has no Supabase session for RLS
  to key off), with every query explicitly scoped to the resolved user id as
  defense in depth.
- **Async challenges**: implemented as designed — challenger picks a quiz +
  opponent (by email) and plays immediately; opponent gets notified and plays
  independently later; scores are compared once both sides have played. No
  live 1v1 sync (that's explicitly deferred, see below).

## Deferred for later phases

- True live 1v1 duels from inside the extension (would need a websocket-capable approach, e.g. a lightweight persistent connection via `chrome.runtime` + a keep-alive strategy, or moving live play to the web app and using the extension purely for notifications).
- Mobile app (React Native) — same Supabase backend would be reusable.
