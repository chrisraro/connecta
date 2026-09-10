-- Phase 1: identity. users + admins, and the admin predicate every later
-- policy depends on.
--
-- DECISION (2026-09-11) -- restores one of the ~9 decisions lost with the
-- original record: `public.users.id` IS `auth.users.id`. There is no `clerk_id`
-- column and no separate surrogate key.
--
-- The alternative -- keeping a surrogate `id` and storing the auth subject
-- beside it -- would force every RLS policy on every table to join back to
-- users to translate `auth.uid()` into an owner id. That join runs on EVERY
-- ROW of EVERY QUERY, and a policy is the one place where a subtle mistake
-- fails open. Making the two ids the same value reduces the entire ownership
-- check to `auth.uid() = owner_id`: no join, no translation, nothing to get
-- wrong. `on delete cascade` means deleting the auth user removes the profile
-- data with it rather than orphaning it.

create table public.users (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text not null,
  name                 text,
  role                 public.user_role not null default 'agent',
  subscription_status  text not null default 'inactive',
  plan                 public.plan_tier not null default 'free',
  plan_expires_at      timestamptz,
  onboarding_completed boolean not null default false,
  onboarding_data      jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- NOT CREATED, deliberately: `credits`. convex/schema.ts documents it as
-- orphaned data dropped in 79d6e7c without a migration, kept optional only so
-- schema validation accepted rows that still carried it. With the data purged
-- there is nothing to carry, so it is deleted by omission rather than created
-- and then retired.

-- Convex never enforced this; two rows could share an email. auth.users does
-- enforce it, so the mirror table must agree or the two can drift into a state
-- no code expects. Case-insensitive because email is.
create unique index users_email_lower_key on public.users (lower(email));

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Admin grants. Kept as a table of grants rather than a flag on users so that
-- revocation is an audit record instead of an erasure: `revoked_at` preserves
-- who held admin and when.
create table public.admins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  role       public.admin_role not null,
  granted_by uuid not null references public.users (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason     text
);

-- A real constraint Convex could not express: a user cannot hold two live
-- grants at once. Without it, "revoke admin" can leave a second active row
-- behind and the user quietly stays an admin. Doubles as the lookup index for
-- is_admin(), which only ever queries live grants.
create unique index admins_one_active_grant_per_user
  on public.admins (user_id) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- The admin predicate
-- ---------------------------------------------------------------------------
-- Every admin policy in every later migration calls this. It is
-- `security definer` for a specific reason: the policies ON `admins` need to
-- ask "is the caller an admin?", and answering that means reading `admins` --
-- which would re-enter the same policy and recurse forever. A definer function
-- reads the table with the owner's rights, outside RLS, and terminates.
--
-- `search_path = ''` and fully-qualified names are mandatory here, not stylistic:
-- a definer function that resolves `admins` through a caller-controlled
-- search_path executes attacker-chosen code as the owner. This is the exact
-- shape of the `rls_auto_enable` finding fixed on 2026-09-10.
create function public.is_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = check_user
      and a.revoked_at is null
  );
$$;

create function public.is_superadmin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = check_user
      and a.revoked_at is null
      and a.role = 'superadmin'
  );
$$;

-- A definer function is executable by PUBLIC by default, which would let an
-- anonymous caller probe admin membership for any uuid. Same lesson as above.
revoke all on function public.is_admin(uuid)      from public;
revoke all on function public.is_superadmin(uuid) from public;
grant execute on function public.is_admin(uuid)      to authenticated;
grant execute on function public.is_superadmin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
-- Supabase grants ALL on new public tables to anon and authenticated by
-- default, leaving RLS as the only thing standing between a caller and the
-- data. RLS is row-level and cannot say "you may edit your name but not your
-- own role" -- so privilege columns are withheld with COLUMN grants, which is
-- the tool Postgres actually provides for that.
--
-- Without this, a user could `update users set role = 'admin' where id =
-- auth.uid()` and the ownership policy would happily allow it: the row IS
-- theirs. Self-service privilege escalation, permitted by a policy that looks
-- correct.
revoke all on public.users  from anon, authenticated;
revoke all on public.admins from anon, authenticated;

grant select on public.users to authenticated;
grant update (name, onboarding_completed, onboarding_data) on public.users to authenticated;
grant select on public.admins to authenticated;

-- INSERT/UPDATE are granted at the table level and then narrowed to
-- superadmins by policy. Granting SELECT alone would leave
-- admins_write_superadmin unreachable: RLS filters which rows a verb may
-- touch, but the GRANT decides whether the verb is available at all, so a
-- missing grant silently makes the policy dead code.
-- DELETE is granted to nobody, which is what makes "never delete a grant, set
-- revoked_at" an enforced rule rather than a comment.
grant insert, update on public.admins to authenticated;

-- INSERT on users is granted to nobody: the row is created by the signup
-- trigger in Phase 2, running as the definer. DELETE is granted to nobody: the
-- row dies with its auth.users parent via the cascade.

alter table public.users  enable row level security;
alter table public.admins enable row level security;

create policy users_select_own_or_admin on public.users
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

create policy users_update_own on public.users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins may read the roster; only superadmins may change it. `moderator` is a
-- deliberately weaker grant, and letting one mint another admin would erase
-- that distinction.
create policy admins_select_admin on public.admins
  for select to authenticated
  using (public.is_admin());

create policy admins_write_superadmin on public.admins
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

comment on table public.users is
  'Application mirror of auth.users. id is the auth subject -- see migration header.';
comment on table public.admins is
  'Admin grants, append-then-revoke. Never delete a row; set revoked_at.';
