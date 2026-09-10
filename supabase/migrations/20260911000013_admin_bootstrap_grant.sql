-- Bootstrap the first superadmin: connectaphnfc@gmail.com.
--
-- `admins` is a closed loop -- only a superadmin may create a superadmin, and
-- this project has none. 20260911000008 added bootstrap_superadmin() for an
-- operator to break that loop by hand, but it requires the account to already
-- exist, and auth.users is currently empty.
--
-- WHY NOT JUST CREATE THE ACCOUNT HERE
-- ------------------------------------
-- Inserting into auth.users directly means hand-writing GoTrue internals: a
-- bcrypt password, email_confirmed_at, aud/role, and a matching auth.identities
-- row whose shape has changed across GoTrue versions. Get any of it subtly
-- wrong and the row still exists -- which means the email is TAKEN, normal
-- signup is refused, and the owner is locked out of their own admin account
-- with no way back except more hand-surgery. The supported signup path is
-- guaranteed to produce a correct row; this migration just makes that path
-- also grant admin.
--
-- WHY ON CONFIRMATION, NOT ON SIGNUP
-- ----------------------------------
-- 20260911000008 refused to auto-grant on an email match at signup, because
-- that hands the admin console to whoever can type the address into a form.
-- That objection is answered by keying on email_confirmed_at instead: a
-- confirmation link is delivered to the mailbox, so only someone who can READ
-- that inbox can trigger the grant.
--
-- REQUIRES EMAIL CONFIRMATION TO BE ENABLED. With confirmations off, GoTrue
-- stamps email_confirmed_at at signup and the protection above evaporates --
-- the address becomes a password-less admin key for whoever types it first.
-- See the handover doc; this is listed as a required dashboard setting.
--
-- Single-use by construction: the grant is consumed, so a later signup with
-- the same address (after the owner has deleted and recreated an account, say)
-- does not silently mint a second admin.

create table public.admin_bootstrap_grants (
  email       text primary key,
  role        public.admin_role not null default 'superadmin',
  consumed_at timestamptz,
  consumed_by uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Nobody reaches this from the client. RLS on with no policies is the
-- strictest state available: invisible to every role that is not BYPASSRLS,
-- so service_role and definer functions only. A readable version of this
-- table would advertise which address to race for.
alter table public.admin_bootstrap_grants enable row level security;
revoke all on public.admin_bootstrap_grants from anon, authenticated;

create function public.apply_admin_bootstrap_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending public.admin_bootstrap_grants;
begin
  -- Unconfirmed accounts get nothing. This is the whole security property.
  if new.email_confirmed_at is null or new.email is null then
    return new;
  end if;

  select * into pending
    from public.admin_bootstrap_grants
   where lower(email) = lower(new.email)
     and consumed_at is null
   for update;

  if not found then
    return new;
  end if;

  -- Defensive: admins.user_id references public.users, and that row is created
  -- by a sibling AFTER INSERT trigger on this same table. Trigger order is
  -- alphabetical, and this one is named to sort last, but relying on a naming
  -- convention for referential integrity is the kind of thing that breaks
  -- silently when somebody renames a trigger.
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.admins (user_id, role, granted_by, reason)
  values (new.id, pending.role, null, 'bootstrap grant on confirmed email')
  on conflict do nothing;

  update public.admin_bootstrap_grants
     set consumed_at = now(), consumed_by = new.id
   where email = pending.email;

  return new;
end;
$$;

revoke all on function public.apply_admin_bootstrap_grant() from public, anon, authenticated;

-- Named to sort AFTER on_auth_user_created, so the public.users row exists
-- before the admins row that references it. Fires both on insert (a signup
-- that arrives already confirmed) and on the update that confirms an existing
-- signup.
create trigger zz_apply_admin_bootstrap_grant
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.apply_admin_bootstrap_grant();

insert into public.admin_bootstrap_grants (email, role)
values ('connectaphnfc@gmail.com', 'superadmin')
on conflict (email) do update set role = excluded.role, consumed_at = null;

comment on table public.admin_bootstrap_grants is
  'Single-use superadmin grants applied when a matching email is CONFIRMED. Requires email confirmation to be enabled.';
