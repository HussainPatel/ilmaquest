-- public.users mirrors auth.users with app-specific profile/role data.
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  email         text,
  role          text not null default 'player'
                  check (role in ('player','contributor','reviewer','senior_reviewer','admin')),
  age_tier      text check (age_tier in ('kid','teen','adult')),
  created_at    timestamptz not null default now()
);

alter table public.users enable row level security;

-- A user can always read and update their own profile.
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Role changes must go through the server (service role), never a direct client update.
-- This trigger blocks a user from granting themselves reviewer/admin access even if the
-- UPDATE policy above would otherwise allow it.
create function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'Role changes must be performed by an admin via the server.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_self_change
  before update on public.users
  for each row execute function public.prevent_role_self_change();

-- Every new Supabase auth user automatically gets a matching public.users row.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'New User'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies on other tables to check the caller's role
-- without each policy needing to repeat the subquery.
create function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;
