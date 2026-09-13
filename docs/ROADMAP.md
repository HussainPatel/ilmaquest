# Roadmap

Phased to keep the highest-risk piece (content accuracy) small and provable before expanding scope.

## Phase 0 — Foundations (current)
- [x] Name selected: ilmaQuest (initially built as HalaqaPlay, renamed 2026-08-23 — see README naming record)
- [x] Process, data model, architecture, security, best-practices docs written
- [x] Supabase project + Next.js project scaffolded
- [x] RLS policies for content pipeline tables implemented and tested (5 migrations live on the cloud project, verified via /dev-check)
- [x] Adult auth flow (email magic link) built and verified end to end
- [x] Domain/trademark check for ilmaQuest — ilmaquest.com and ilmaquest.app both available (verified via official registry RDAP, 2026-08-23); no existing product/trademark found in web search. USPTO federal trademark search still needs to be run manually by the user before full reliance.
- [ ] First deploy to Vercel

## Phase 1 — MVP: core quiz loop + content pipeline (Quran + Seerah only)
- [x] Web app: host a live quiz, join via code (guest play, no account required — this is the kid-access model from SECURITY.md §1), live scoreboard. Built and verified end to end 2026-08-23: `/host` (pick a quiz, get a join code, control pace, live leaderboard) and `/join` + `/play/[sessionId]` (guest joins by code/name, answers, sees live score). Uses 2s polling rather than Supabase Realtime for now — documented tradeoff in ARCHITECTURE.md, upgrade candidate later.
- [x] 5 seeded demo questions (Quran + Seerah, real sourced citations) inserted directly as `published` via migration, bypassing the human review pipeline for demo purposes only — see the warning comment in `20260823020100_seed_demo_content.sql`. Not a substitute for the real pipeline below.
- [x] Content pipeline UI built 2026-08-23: `/contribute` (source + question form, role-gated to contributor+), `/review` (queue of pending_review + approved-awaiting-publish), `/review/[id]` (full checklist from CONTENT_PROCESS.md §4, gates the Approve button; reject/needs_edit require a comment; two-person rule surfaced with a clear message when a reviewer hits their own submission). Publish is a separate step from approve, matching the batch-publish design. Input validated with Zod (`src/lib/content/validation.ts`), mirroring the DB constraints.
- [ ] Actually run real Quran/Seerah content through this pipeline by hand to prove it end to end (the 5 demo questions currently live were seeded directly via migration, bypassing this UI — see the warning in `20260823020100_seed_demo_content.sql`).
- [x] Public "Report an issue" flag on every question — built 2026-08-23, shown under the current question on `/play/[sessionId]`, writes directly to `flags` via RLS (`flags_insert_anyone`), no API route needed.
- [x] "Create a quiz" flow (`/host/new`) — pick a title, category, and any published questions; the existing `validate_quiz_questions` trigger rejects anything not published. Unblocks turning newly reviewed content into something playable without manual SQL.
- [x] Admin role-management panel (`/admin/users`) — replaces the manual SQL role-grant step from earlier testing with a UI; an admin can't demote/promote themselves through it (self-service still blocked, matching SECURITY.md §2).
- [x] "My submissions" page (`/my-questions`) — a contributor can see all their own questions across every state, the reviewer's comment when rejected/needs-edit, and resubmit. Fixed an RLS gap found while building this: `review_log` was staff-only, so an author had no way to see *why* their question was rejected — added a scoped policy (`review_log_select_own_question`) letting authors read review_log entries for their own questions only.
- [x] In-place editing for `needs_edit`/`draft` questions (`/my-questions/[id]/edit`) — closes the gap noted above. A contributor can now actually fix the source or question content based on the reviewer's comment and resubmit in one step. Required adding an UPDATE policy on `sources` (there was none at all before — see `20260823030100_sources_editable_while_unpublished.sql`), scoped to the author's own sources while the linked question is still draft/needs_edit.
- [x] Flagged-content resolution UI — closes the loop on "Report an issue": `/review` now shows a Flagged section, and `/review/[id]` shows the open report reasons with three actions (dismiss & republish, send back for edits, retire). Resolution is logged through `review_log` (same two-person-rule-protected insert as ordinary review decisions), and the flag summary rides along in that comment so the author sees it via the visibility fix from the previous entry — no new RLS needed for flags-to-author visibility.
- [ ] Classroom/kid guest-join refinements beyond the basic name+code flow already built.

## Phase 2 — Engagement: Chrome extension
- [x] Async challenge system (`/challenges`, `/challenges/new`, `/challenges/[id]/play`) — challenge a friend by email to any existing quiz, play your side immediately, they get notified and play independently, scores compared once both sides are in.
- [x] Manifest V3 extension (`extension/`) — polls for notifications every 5 min via `chrome.alarms`, shows native OS notifications, click-through opens `/challenges`. Plain JS, no build pipeline (see ARCHITECTURE.md implementation notes).
- [x] Auth handoff from web app to extension — `/extension/connect` generates a one-time token (hash stored server-side), manually pasted into the extension popup. Not an automatic deep-link handoff — documented simplification, not yet built.
- [ ] Streak reminders / scheduled quiz drops — needs a scheduled job (e.g. a cron-triggered API route) to generate these notifications; not built yet, only challenge-driven notifications exist so far.
- [ ] Real end-to-end test of the extension itself (load unpacked, connect, receive a live notification) — built but not yet run by the user.

## Monetization — Donations (in progress)
- [x] Donation flow built 2026-08-26: Stripe Checkout (one-time + recurring), multi-currency (see MONETIZATION.md §2a), gated behind login so it's never reachable from the unauthenticated `/`, `/join`, `/play` routes that guests (including kids) use. `/support` page + `/account` donation history/manage-billing section, nav link visible only when signed in.
- [ ] Real Stripe account created and test-mode end-to-end flow verified (see MONETIZATION.md §6) — nothing above works yet without this.
- [ ] Decision made on registered-nonprofit status (`ORG_IS_REGISTERED_NONPROFIT`), even if the decision is "not yet."
- [ ] Post-quiz "support us" prompt on the results screen — deferred, needs confirmation of who can see that screen first (MONETIZATION.md §1).

## Phase 3 — Expand content: Hadith
- Sunnah.com API integration, sahih/hasan-only constraint enforced.
- Senior Reviewer role activated and staffed.
- Category launches only after Phase 1's process has run cleanly for at least a few weeks with real usage.

## Phase 4 — Fiqh + AI content-assist at scale
- Fiqh category with madhab tagging, Senior Reviewer sign-off required per question.
- AI-assist drafting tool rolled out to Contributors to speed up question creation (still DRAFT-only, still human-reviewed — see CONTENT_PROCESS.md §5).

## Phase 5 — Growth features (not yet scoped in detail)
- Classroom/madrasah teacher mode with progress export.
- Multilingual support (Arabic script + transliteration + translation toggle).
- Mobile app.
- Live 1v1 duels inside the extension (if warranted — see ARCHITECTURE.md "deferred" section).

## Explicitly out of scope for now
- Any user-facing AI chat that answers religious questions live/unreviewed.
- Any image generation involving depictions of the Prophet ﷺ or other prohibited imagery.
- Monetization/ads targeting the `kid` age tier (see SECURITY.md §1) — this doesn't block the adult-only donation flow above, which is deliberately kept off every route a kid guest can reach.
