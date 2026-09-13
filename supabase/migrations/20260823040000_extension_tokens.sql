-- Auth handoff for the Chrome extension (docs/ARCHITECTURE.md "Chrome
-- extension design"). The extension has no cookie-based session, so it
-- authenticates its API calls with a long-lived opaque token instead.
-- Only the hash is stored (same principle as a password) — the raw token
-- is shown to the user once, at generation time, and never stored in
-- plaintext server-side.
create table public.extension_tokens (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  token_hash     text not null unique,
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz
);

alter table public.extension_tokens enable row level security;

-- A user can see and revoke their own tokens (future account-settings UI).
create policy "extension_tokens_select_own" on public.extension_tokens
  for select using (user_id = auth.uid());

create policy "extension_tokens_insert_own" on public.extension_tokens
  for insert with check (user_id = auth.uid());

create policy "extension_tokens_delete_own" on public.extension_tokens
  for delete using (user_id = auth.uid());

-- NOTE: the extension itself never holds a Supabase session, so its API
-- routes look up the token via the service-role client (bypassing RLS
-- entirely) after hashing the bearer token it was sent. These policies
-- exist for the web app's own account-management UI, not the extension.
