-- Phase 2: the users row lifecycle.
--
-- Every RLS policy in this database resolves ownership through
-- `public.users`, so an auth.users row without its public.users partner is an
-- account that can authenticate and then see nothing -- failing closed, but
-- looking like data loss to the person it happens to. The row has to be
-- created by the database, at signup, in the same transaction.

-- ---------------------------------------------------------------------------
-- email becomes nullable
-- ---------------------------------------------------------------------------
-- Supabase Auth can create a user with no email (phone and some OAuth flows),
-- and convex/cards.ts:262 already relied on this: claiming a card creates the
-- user with `email: ""` to be filled in during onboarding.
--
-- NULL rather than '' matters here. The unique index on lower(email) would
-- treat two empty strings as a collision, so the second person to claim a card
-- before onboarding would be rejected with a duplicate-key error. Postgres
-- excludes NULLs from unique indexes, so NULL is the value that means
-- "not known yet" without pretending to be a value.
alter table public.users alter column email drop not null;

-- ---------------------------------------------------------------------------
-- signup
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    nullif(new.email, ''),
    nullif(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ON CONFLICT DO NOTHING, not an error: this trigger must never be the reason
-- a signup fails. A duplicate here means the row already exists, which is the
-- desired end state anyway.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the mirror honest. Without this, a user who changes their email in
-- Supabase Auth keeps the old address in public.users, and every feature that
-- reads it (lead notification emails, team invites matched by address) quietly
-- uses the stale one.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.users
       set email = nullif(new.email, '')
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Trigger functions are not API. See 20260911000007 for why this is done
-- explicitly rather than trusting `revoke ... from public`.
revoke all on function public.handle_new_user()          from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Superadmin bootstrap
-- ---------------------------------------------------------------------------
-- The plan requires `tapfolio.dev@gmail.com` to hold the superadmin grant
-- again after cutover, and `admins` is otherwise a closed loop: only a
-- superadmin may create a superadmin, and there are none.
--
-- This is deliberately NOT a trigger that grants admin to anyone signing up
-- with a matching address. That would make the entire admin console reachable
-- by whoever can complete a signup form with that email -- which, with email
-- confirmation disabled even briefly, is anyone at all. Bootstrapping is a
-- one-time operator action, so it is an explicit call.
--
-- Not callable by anon or authenticated (see the revokes below): only
-- service_role, or an operator running SQL directly.
alter table public.admins alter column granted_by drop not null;
comment on column public.admins.granted_by is
  'NULL means the grant was created by the system bootstrap, which has no granting user.';

create function public.bootstrap_superadmin(target_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select id into target_id from public.users where lower(email) = lower(target_email);
  if target_id is null then
    return 'no such user: ' || target_email || ' (they must sign up first)';
  end if;

  -- Idempotent: re-running must not create a second live grant, which
  -- admins_one_active_grant_per_user would reject anyway.
  if exists (select 1 from public.admins
              where user_id = target_id and revoked_at is null) then
    update public.admins set role = 'superadmin'
     where user_id = target_id and revoked_at is null;
    return 'existing grant upgraded to superadmin: ' || target_email;
  end if;

  insert into public.admins (user_id, role, granted_by, reason)
  values (target_id, 'superadmin', null, 'system bootstrap');
  return 'superadmin granted: ' || target_email;
end;
$$;

revoke all on function public.bootstrap_superadmin(text) from public, anon, authenticated;

comment on function public.bootstrap_superadmin(text) is
  'One-time operator action. Run from the SQL editor or service_role after the account signs up.';
