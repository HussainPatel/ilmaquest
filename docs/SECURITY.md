# Security & Privacy

This app will be used by children in madrasah/school settings, which raises the bar beyond typical app security — child privacy law (COPPA in the US, UK/EU equivalents like GDPR-K) applies, not just general good practice.

## 1. Child privacy — non-negotiable baseline

- **Minimize data collected from kids**: no email/phone required for a child account. A `guest_name` + teacher/parent-managed classroom code is preferred over individual kid signups where possible (see ROADMAP.md — classroom/madrasah mode).
- Where a real account is needed for a minor, require a **parent/guardian email** at signup for any `age_tier='kid'` account, and get verifiable parental consent before collecting anything beyond a display name (this is a legal COPPA requirement in the US if the app is available there).
- **No behavioral advertising, no selling data, no third-party trackers on any page reachable by a `kid` age tier.** This should be a hard rule in the codebase (e.g. analytics scripts conditionally excluded for kid sessions), not just a privacy-policy line.
- Never expose full names, emails, or any PII on public leaderboards — display names/usernames only.
- Data retention: define a deletion policy (e.g. inactive guest/kid data purged after 12 months) before launch, and provide a clear way for a parent to request deletion of a child's data.

## 2. Authentication & authorization

- Auth handled by Supabase Auth (battle-tested, not hand-rolled) — email/magic link for adults, classroom-code join flow for kids that doesn't require an email.
- **Row-level security (RLS) is mandatory on every table containing user or content data.** Baseline policies:
  - `questions`: `state != 'published'` rows are visible only to `role in ('contributor','reviewer','senior_reviewer','admin')`, and only their own drafts for `contributor`.
  - `review_log`: insertable only by `reviewer`/`senior_reviewer`/`admin`, and a policy check blocking `reviewer_id = questions.created_by` (the two-person rule from CONTENT_PROCESS.md) enforced in the database, not just app logic.
  - `game_answers`: a player can only insert rows for their own `player_id` in an active session.
  - `users`: a user can read/update only their own row; role changes require `admin`.
- Role elevation (player → contributor/reviewer/admin) is an explicit admin action, never self-service.

## 3. API & application security

- All scoring/correctness logic runs server-side (API routes), never trusted from client input — see ARCHITECTURE.md anti-cheat principle.
- Rate limiting on all public endpoints, especially: quiz join (`join_code` guessing), answer submission, and the flag/report endpoint (prevent spam flagging to grief content off rotation).
- Input validation on every API route (schema validation, e.g. Zod) — reject malformed payloads before they reach the database.
- Standard OWASP Top 10 hygiene: parameterized queries only (Supabase client handles this by default — never build raw SQL from user input), output encoding to prevent XSS in any user-generated text (guest names, flag reasons), CSRF protection on state-changing routes.

## 4. Secrets management

- No secrets (API keys, Supabase service role key, Claude API key) ever committed to git. Use `.env.local` (gitignored) locally and Vercel's encrypted environment variables in production.
- The Supabase **service role key** (which bypasses RLS) is used only in trusted server-side contexts (API routes), never shipped to the client or the Chrome extension.
- The Chrome extension never holds long-lived credentials — see the token handoff design in ARCHITECTURE.md.
- Rotate the Claude API key and Supabase keys if any suspected exposure occurs; treat this as an incident (see §7).
- **Stripe secrets** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) follow the same rule — server-side only, never in the client or extension. The webhook route additionally verifies the `Stripe-Signature` header on every request before trusting the payload — see MONETIZATION.md §4. No real Stripe account exists yet; these are placeholders in `.env.example` until one is created.

## 5. Chrome extension specific

- Manifest V3 with least-privilege permissions (`notifications`, `alarms`, `storage`, host permission scoped to the app's own domain only) — never request `<all_urls>` or broad tab access.
- Content Security Policy set to disallow remote code execution inside the extension (MV3 enforces this by default — don't weaken it).
- Auth tokens stored via `chrome.storage.local`, short-lived and refreshed, never a permanent password-equivalent.

## 6. AI-specific security

- The AI content-drafting assist is RAG-scoped to the `sources`/`questions` tables only (see CONTENT_PROCESS.md §5) — it is never given open internet or general knowledge access when generating religious content, which also closes off a prompt-injection surface (no untrusted external text gets pulled into a generation call).
- Treat any AI-generated draft as untrusted input requiring human verification before it can influence what's shown to users — this is enforced by the DRAFT-state workflow itself.

## 7. Dependency management & monitoring

- Enable automated dependency vulnerability scanning (GitHub Dependabot or equivalent) from day one.
- Enable Supabase's built-in audit logging; review admin/role-change actions periodically.
- Basic incident response plan: if a data exposure or credential leak is suspected, rotate all affected keys immediately, and if any user (especially minor) data may have been exposed, this needs a disclosure plan — worth a short conversation with someone with legal familiarity before launch, not something to improvise after the fact.

## 8. Pre-launch security checklist

- [ ] **Rotate the Supabase `service_role` key** — it was pasted into a chat session during initial setup (2026-08-23) rather than entered directly into `.env.local`. Low practical risk, but rotate before real users are on the platform.
- [ ] RLS policies written and tested for every table (not just designed on paper)
- [ ] Child privacy/consent flow implemented and reviewed
- [ ] Secrets audit: confirm nothing is in git history (`git log -p | grep` style check, or a tool like `gitleaks`)
- [ ] Rate limiting live on join/answer/flag endpoints
- [ ] Privacy policy and terms of service published (plain-language, not just legalese, given the audience includes kids and parents)
- [ ] Dependency scanning enabled
