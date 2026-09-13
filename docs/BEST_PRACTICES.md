# Best Practices & Workflow

Written with the assumption that whoever is reading this (including future-you) is still learning the stack — explicit over clever, every time.

## 1. Documentation-first, always

This project starts with docs, not code, and that pattern continues: any significant new feature or schema change gets a short note added to the relevant doc (CONTENT_PROCESS.md, DATA_MODEL.md, ARCHITECTURE.md, SECURITY.md) in the same change that implements it — not as a follow-up that never happens. If a piece of planned scope can't be finished now, say so explicitly in the doc/PR rather than silently dropping it.

## 2. Git workflow

- `main` is always deployable. No direct commits to `main` — all changes via a branch + pull request, even solo.
- Branch naming: `feature/short-description`, `fix/short-description`.
- Commit messages: short imperative summary line ("Add hadith grading constraint to sources table"), body explains *why* if not obvious.
- Never force-push to `main`. Never commit secrets — see SECURITY.md §4; double-check `git status`/diff before every commit.
- Small, focused PRs over large ones — easier to review, easier to revert if something's wrong (especially important for anything touching the content pipeline).

## 3. Code conventions

**Follow-up (not yet done)**: generate real Supabase types with `npx supabase gen types typescript --project-id xaqanchpqanazllqpknd > src/lib/supabase/database.types.ts` and pass them as the `Database` generic to every `createClient()` call in `src/lib/supabase/*.ts`. Without this, the client can't tell a to-one foreign-key embed (e.g. `game_sessions.quiz_id -> quizzes`) from a to-many one and defaults to typing it as an array, which is why a couple of gameplay routes/pages have manual `Array.isArray(...) ? x[0] : x` normalization or `as unknown as` casts. Doing this properly would remove those casts and catch real schema mismatches at compile time instead.

- **TypeScript everywhere**, strict mode on. Catches a large class of bugs before runtime — valuable precisely because you're still learning the ecosystem.
- Validate all external input (API payloads, form submissions) with a schema library (Zod) at the boundary — don't trust anything from the client.
- No comments explaining *what* code does (names should do that) — comments only for non-obvious *why* (e.g. "score computed server-side to prevent client tampering, see SECURITY.md").
- Don't build abstractions ahead of need. A single quiz-hosting flow doesn't need a plugin system; add structure when a second real use case demands it, not speculatively.
- Environment-specific config only via environment variables, never hardcoded.

## 4. Testing

- Unit tests for anything with real logic: scoring calculation, review-state transitions, RLS-adjacent permission checks (test as integration tests against a local Supabase instance where possible, since RLS bugs are exactly the kind of thing that must be tested, not assumed).
- Integration test for the full content lifecycle at least once (DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED, and the two-person-rule rejection case) — this is the highest-risk path in the app and deserves direct test coverage, not just manual QA.
- End-to-end test for the core game loop (host creates session → player joins → answers → score shown) before every release.

## 5. Review process (code, not content)

- Every PR gets at least a self-review pass (diff read start to finish) before merge; a second human reviewer once there's more than one contributor.
- Anything touching `SECURITY.md`-relevant code (auth, RLS policies, the review-state machine, rate limiting) gets extra scrutiny — flag it explicitly in the PR description.
- Use `/code-review` (or equivalent) before merging non-trivial changes to catch correctness issues and unnecessary complexity early.

## 6. Deployment

- Vercel preview deployments for every PR — test in a real environment before merging, not just locally.
- Staging Supabase project separate from production — never test destructive migrations against production data.
- Database migrations are version-controlled files (Supabase migrations), applied in order, never hand-edited directly against production through the dashboard.
- Rollback plan: know how to revert a bad deploy (Vercel's instant rollback) and how to revert a bad migration before you need it, not after.

## 7. When something breaks

- Fix root causes, not symptoms — don't silence a failing check to make it "pass," especially anything security- or content-pipeline-related.
- If a published question turns out to be wrong: this is a FLAGGED-state event (see CONTENT_PROCESS.md), not just a hotfix — go through the process even under time pressure, because the process *is* the safeguard.
