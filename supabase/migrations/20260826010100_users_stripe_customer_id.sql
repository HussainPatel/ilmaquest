-- Links a user to their Stripe Customer object, created lazily on first
-- checkout attempt (see src/app/api/donations/checkout/route.ts). Nullable —
-- most users will never donate. Written by the user's own authenticated
-- client (existing users_update_own RLS policy already permits this; it's
-- not a role change, so the self-change trigger doesn't apply).
alter table public.users add column stripe_customer_id text unique;
