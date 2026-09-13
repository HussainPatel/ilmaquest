# Monetization — Donations (Phase 1 revenue feature)

First revenue feature for ilmaQuest. Scope: a donation flow (one-time + recurring), Stripe-based,
restricted to logged-in adult surfaces only. No other monetization (subscriptions for content,
ads, B2B licensing) is in scope here — see ROADMAP.md for the sequencing rationale.

## 1. Decisions made (2026-08-26)

| Question | Decision | Notes |
|---|---|---|
| Payment processor | **Stripe** | PCI compliance handled by Stripe Checkout (hosted page) — card data never touches our server. |
| Donation type | **One-time and recurring (monthly)**, both in v1 | Recurring uses Stripe Subscriptions; Stripe's hosted Customer Portal handles cancel/update so we don't build that UI ourselves. |
| Legal/charity status | **Unresolved — code for both** | No registered nonprofit exists yet. The code must not assume one ever will, and must not claim tax-deductibility unless explicitly turned on. See §5. |
| Kid-tier exposure | **Never reachable from `/`, `/join`, `/play/[sessionId]`** | Those routes are reachable by anonymous guests with no `age_tier` on file — the exact kid-access model in SECURITY.md §1. Donation UI only renders behind the existing `user` login check, same as the Host nav link. |
| Placement | **Header nav link (logged-in only) + section on `/account`** | Nav link reaches adults across every authenticated page (`/host`, `/contribute`, `/review`, `/admin`), not just `/account`. |
| Currency | **Multi-currency, donor-selected** | See §2a — donors are not forced into USD. |

**Explicitly deferred (not in this build)**: a post-quiz "support us" prompt on the results/podium screen. That screen's visibility (could a guest/kid ever see a host's results view?) needs to be confirmed before adding any ask-for-money surface there — flagged as a follow-up, not silently dropped.

## 2. Payment flow

1. Logged-in user clicks "Support ilmaQuest" (nav or `/account`), picks an amount and one-time/monthly.
2. Client calls `POST /api/donations/checkout` with `{ amount_cents, currency, interval: 'one_time' | 'month' }`.
3. Server validates input (Zod), creates a Stripe Checkout Session (`mode: 'payment'` for one-time, `mode: 'subscription'` for monthly) with `client_reference_id = user.id`, returns the session's redirect URL.
4. Client redirects the browser to Stripe's hosted Checkout page — we never collect card details ourselves.
5. On completion, Stripe redirects back to a `/account?donation=success` (or `cancelled`) page. This redirect is cosmetic only — **the row in our `donations` table is written from the webhook in step 6, never from this redirect**, since redirects can be skipped, replayed, or forged by the client.
6. Stripe sends a webhook (`checkout.session.completed`, and later `invoice.paid` for recurring renewals) to `POST /api/webhooks/stripe`. The handler verifies the Stripe signature, then upserts a `donations` row.
7. For recurring donors, `/account` shows a "Manage your donation" link that calls `POST /api/donations/portal` to create a Stripe Customer Portal session (Stripe-hosted cancel/update-card UI — we don't build this ourselves).

## 2a. Multi-currency / multi-country support

Donors are not forced through a single currency. `src/lib/donations/currencies.ts` holds an
allow-list of supported currencies (`usd, gbp, eur, cad, aud, aed, sar, pkr, inr, myr, idr, zar, try`)
with a per-currency label, symbol, and minimum donation floor — this list is a reasonable starting
set given ilmaQuest's likely donor base, **not exhaustive**; extend it if a real donor needs a
currency that's missing.

- The donation form (`/support`) shows a currency dropdown; the donor picks explicitly, nothing is
  silently inferred from IP/locale and then hidden from them.
- The Stripe Checkout Session is created **without** a `payment_method_types` list — this is what
  actually delivers "multi-country payment": leaving it unset (rather than hardcoding `['card']`)
  lets Stripe Checkout automatically offer locally relevant payment methods (cards, wallets, and
  country-specific methods where available and enabled in the Stripe dashboard) for the chosen
  currency, instead of us hand-coding a payment-method list per country. (Note: `automatic_payment_methods`
  is a PaymentIntent-level field, not applicable to Checkout Sessions — omitting `payment_method_types`
  is the Checkout-equivalent behavior.)
- Server-side validation (`src/lib/donations/validation.ts`) rejects any currency not in the
  allow-list, and enforces the per-currency min/max, so a tampered client request can't submit an
  unsupported currency or an absurd amount.
- **Payout currency is separate from this and is a Stripe-account-level setting, not something the
  code controls** — whatever currencies you accept, Stripe converts to your account's payout
  currency (set when the Stripe account itself is created, see §6). Worth understanding the
  conversion-fee implications in the Stripe dashboard once a real account exists.

## 3. Data model

```sql
donations (
  id                  uuid primary key,
  user_id             uuid not null references users(id),
  stripe_customer_id  text not null,
  stripe_session_id   text not null unique,   -- idempotency: webhook upserts on this, never double-inserts on retry
  stripe_subscription_id text,                -- null for one-time
  amount_cents        int not null check (amount_cents > 0),
  currency             text not null,             -- one of SUPPORTED_CURRENCIES, see §2a — no forced default
  interval            text not null check (interval in ('one_time','month')),
  status              text not null check (status in ('pending','succeeded','failed','refunded','cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
)
```

- `user_id` is required — anonymous/guest donations are not supported in v1, since the feature is
  scoped to logged-in adult surfaces only (§1). This also gives every donor a `/account` view of
  their own donation history for free.
- No PII beyond what Stripe already requires (email, handled entirely on Stripe's hosted page) is
  stored in our database.
- `users` gains one new nullable column, `stripe_customer_id text unique` — set the first time a
  user starts a checkout (see `src/app/api/donations/checkout/route.ts`), written via the user's
  own authenticated client under the existing `users_update_own` RLS policy (not a role change, so
  the self-change trigger in `20260823010100_users.sql` doesn't apply). This lets the portal route
  (§4) and future webhook events (`invoice.paid`) find the right user without a separate lookup
  table.

### RLS

- `donations`: a user can `select` only rows where `user_id = auth.uid()`. All `insert`/`update` happens via the server-side webhook handler using the Supabase **service role key** (bypasses RLS, same pattern as other trusted server-only writes — see SECURITY.md §4) — no client-side insert policy exists at all, so a compromised or malicious client can never fabricate a donation record.
- Only `admin` role can `select` across all `donations` rows (for a future reporting view) — not part of this build, but the RLS policy should allow it now so it doesn't require a migration later.

## 4. API routes & security

| Route | Purpose | Key security notes |
|---|---|---|
| `POST /api/donations/checkout` | Create a Stripe Checkout Session | Requires logged-in session (reuse existing auth check pattern). Zod-validated body, per-currency min/max enforced (§2a). **Not rate-limited** — no rate-limiting infrastructure exists anywhere in the codebase yet (SECURITY.md §3 lists it as a pre-launch requirement, not something already built), so this route has the same gap as every other endpoint today. Flagging explicitly rather than implying it's covered: don't add a one-off limiter just for this route — solve it project-wide before launch. |
| `POST /api/webhooks/stripe` | Receive Stripe events | **Must verify `Stripe-Signature` header** against `STRIPE_WEBHOOK_SECRET` before trusting any payload — without this, anyone could POST a fake "payment succeeded" event. Uses the Supabase service role key to write `donations` rows (never exposed to client). Handles `checkout.session.completed` (initial payment), `invoice.paid` (recurring renewal), and `customer.subscription.deleted` (marks the row `cancelled`). |
| `POST /api/donations/portal` | Create a Stripe Customer Portal session | Requires logged-in session; only allows creating a portal session for `stripe_customer_id` belonging to `auth.uid()`, never an arbitrary customer ID passed by the client. |

New secrets (added to `.env.example`, real values in `.env.local` / Vercel env — never committed, per SECURITY.md §4):

```
# SECRET — server-side only. Stripe API access.
STRIPE_SECRET_KEY=
# SECRET — server-side only. Verifies webhook payloads are genuinely from Stripe.
STRIPE_WEBHOOK_SECRET=
```

No `NEXT_PUBLIC_STRIPE_*` key is needed in v1 — we redirect to the Checkout Session URL Stripe returns rather than using Stripe.js in the browser, which keeps the client-side surface area (and thus attack surface) smaller.

## 5. Legal/tax-status framing (important — do not skip)

Since there's no registered nonprofit yet, and this may or may not exist in the future, the UI copy is driven by a single server-side flag rather than hardcoded either way:

```
# .env.local — defaults to false. Only set true after confirming real registered nonprofit status.
ORG_IS_REGISTERED_NONPROFIT=false
```

- When `false` (default, current state): copy reads "Support ilmaQuest" / "Your contribution helps cover hosting and content review costs" — **no mention of tax deductibility, no receipt claiming charitable status**, no unqualified "sadaqah" framing that implies formal charity registration.
- When `true`: copy can switch to charity-appropriate language and a real tax receipt — but this requires the actual nonprofit's EIN/registration details to be wired into the receipt template, which is out of scope until that entity exists. **Do not flip this flag without also implementing the receipt content** — flipping it alone would make a false claim.
- This keeps the code ready for either outcome without asserting a legal status that isn't confirmed.

## 6. Setup steps that are yours to do (not something I can do for you)

Creating accounts and entering payment/business details are actions I won't perform on your behalf (see the assistant's standing rules on prohibited actions). Before this feature can go live, you'll need to:

1. Create a Stripe account (business details, bank account for payouts, country/currency — pick your actual country, this determines available currencies and payout schedule).
2. Grab the **test mode** secret key first (`sk_test_...`) and use that in `.env.local` for all development — never test against live keys.
3. Set up a webhook endpoint in the Stripe dashboard pointing at `/api/webhooks/stripe` (Stripe CLI has a `stripe listen --forward-to localhost:3000/api/webhooks/stripe` command for local testing) and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Only switch to live keys after end-to-end testing in test mode, and after you've made a decision on §5's nonprofit-status question (even if the decision is "not yet, keep the flag false").

## 7. What's built vs. what's still needed

**Built (2026-08-26)**: `stripe` npm dependency; `src/lib/stripe/server.ts` (lazy client, throws a
clear error rather than crashing at build time if `STRIPE_SECRET_KEY` is unset); `src/lib/donations/currencies.ts`
and `validation.ts`; migrations `20260826010000_donations.sql` and `20260826010100_users_stripe_customer_id.sql`;
routes `api/donations/checkout`, `api/donations/portal`, `api/webhooks/stripe`; UI at `/support`
(`page.tsx` + `donate-form.tsx`) and a donations section + manage-billing button on `/account`;
nav link gated behind `user` in `layout.tsx`.

**Not built — real prerequisites before this can go live**:
- No actual Stripe account exists. Every route above will throw a clear "not configured" error
  until real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` values exist (see §6 for the setup steps
  that are yours to do).
- The migrations above have not been applied to the Supabase project yet.
- No automated test coverage yet for the webhook handler or the RLS policy.
- Rate limiting (see §4's note — a project-wide gap, not specific to donations).

## 8. Pre-launch checklist additions

- [ ] Real Stripe account created, test-mode keys in `.env.local` (§6)
- [ ] Migrations `20260826010000_donations.sql` / `20260826010100_users_stripe_customer_id.sql` applied
- [ ] Stripe webhook signature verification tested (including the failure case — a request with a bad/missing signature must be rejected, not silently accepted)
- [ ] Donation amount server-side max cap in place (prevents fat-finger or malicious huge charges) — implemented in `validation.ts`, but re-verify with a real request once keys exist
- [ ] Confirmed `donations` RLS: a user cannot read another user's donation rows (test as a real RLS test, not assumed — per BEST_PRACTICES.md §4)
- [ ] `ORG_IS_REGISTERED_NONPROFIT` confirmed `false` (or true + receipt content implemented) before going live
- [ ] Stripe test-mode → live-mode key swap done deliberately, not left on test keys in production by accident
- [ ] Donation UI manually verified to be absent from `/`, `/join`, `/play/[sessionId]` (automated test recommended: render each page unauthenticated and assert no donation element exists)
- [ ] Project-wide rate limiting solved before launch (pre-existing gap, not introduced by this feature — see §4)
