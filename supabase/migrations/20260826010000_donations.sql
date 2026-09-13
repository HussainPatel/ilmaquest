-- Donations feature — see docs/MONETIZATION.md.
-- No client insert/update policy exists at all: every write happens from the
-- Stripe webhook handler using the service-role client, since the webhook is
-- the only source of truth for "did the payment actually succeed" (never the
-- client-side checkout redirect, which can be skipped, replayed, or forged).

create table donations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id),
  stripe_customer_id      text not null,
  stripe_session_id       text not null unique,
  stripe_subscription_id  text,
  amount_cents            int not null check (amount_cents > 0),
  currency                text not null,
  interval                text not null check (interval in ('one_time','month')),
  status                  text not null check (status in ('pending','succeeded','failed','refunded','cancelled')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index donations_user_id_idx on donations(user_id);

alter table donations enable row level security;

-- A user can see only their own donation history.
create policy donations_select_own
  on donations for select
  using (user_id = auth.uid());

-- Admins can see all donations (no reporting UI built yet, but the policy
-- shouldn't require a migration later just to add that view).
create policy donations_select_admin
  on donations for select
  using (exists (
    select 1 from users where users.id = auth.uid() and users.role = 'admin'
  ));

-- Deliberately no insert/update/delete policy for any role — all writes go
-- through the service-role client in the webhook handler, matching the
-- pattern documented in src/lib/supabase/service.ts.
