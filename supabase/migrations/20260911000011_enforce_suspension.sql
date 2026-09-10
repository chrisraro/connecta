-- Admin console hardening: make suspension mean something.
--
-- convex/admin.ts:247 setUserSuspended writes subscriptionStatus =
-- "suspended", logs an audit entry, and the admin table renders a Suspended
-- badge (app/admin/users/page.tsx:119). Nothing else in the codebase ever
-- reads that value. A grep for it finds the writer, the audit line and the
-- badge -- and no check, anywhere.
--
-- So suspension was decoration. A suspended account kept signing in, kept
-- editing profiles, and kept serving its public page; the only thing that
-- changed was a label in a console the suspended person never sees. An
-- enforcement control that does not enforce is worse than none, because it
-- stops anyone looking for the real one.
--
-- Two things change here:
--   1. a suspended user cannot WRITE anything
--   2. the public profile of a suspended user stops being served
--
-- Sign-in is NOT blocked. That needs a Supabase Auth hook rather than RLS, and
-- is noted in the handover -- but a suspended account that can sign in and
-- then do nothing is a very different thing from one that carries on as normal.

-- ---------------------------------------------------------------------------
-- Is the CALLER suspended
-- ---------------------------------------------------------------------------
-- Definer: an ordinary user can read their own users row, but a policy that
-- depends on RLS-filtered data to decide RLS is circular reasoning waiting to
-- go wrong. Reading it outside RLS makes the answer unconditional.
create function public.is_suspended(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.subscription_status = 'suspended'
       from public.users u where u.id = check_user),
    false)
$$;
revoke all on function public.is_suspended(uuid) from public, anon;
grant execute on function public.is_suspended(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Is the profile OWNER suspended
-- ---------------------------------------------------------------------------
-- Denormalised onto profiles rather than resolved through a function in the
-- policy, for two reasons.
--
-- Performance: profiles_select_public is the hottest read in the product --
-- every single NFC tap goes through it -- and a per-row function call on the
-- public path is a cost paid forever.
--
-- Disclosure: the alternative is a definer function that anon must be able to
-- execute for the policy to evaluate, which is an endpoint anyone can call to
-- ask whether a given account is suspended. A boolean column consulted inside
-- a policy answers the same question without publishing it.
alter table public.profiles
  add column owner_suspended boolean not null default false;

create index profiles_owner_suspended_idx on public.profiles (owner_id)
  where owner_suspended;

-- Backfill, so existing rows are correct rather than merely defaulted.
update public.profiles p
   set owner_suspended = true
  from public.users u
 where u.id = p.owner_id and u.subscription_status = 'suspended';

create function public.sync_profile_suspension()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.subscription_status is distinct from old.subscription_status then
    update public.profiles
       set owner_suspended = (new.subscription_status = 'suspended')
     where owner_id = new.id;
  end if;
  return new;
end;
$$;

create trigger users_sync_profile_suspension
  after update of subscription_status on public.users
  for each row execute function public.sync_profile_suspension();

revoke all on function public.sync_profile_suspension() from public, anon, authenticated;

-- A new profile inherits the current state, so suspending someone and then
-- letting them create a profile does not produce a visible one.
create function public.set_profile_suspension_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select (u.subscription_status = 'suspended') into new.owner_suspended
    from public.users u where u.id = new.owner_id;
  new.owner_suspended := coalesce(new.owner_suspended, false);
  return new;
end;
$$;

create trigger profiles_set_suspension
  before insert on public.profiles
  for each row execute function public.set_profile_suspension_on_insert();

revoke all on function public.set_profile_suspension_on_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Apply it
-- ---------------------------------------------------------------------------
-- Public reads skip suspended profiles. Admins still see them, otherwise the
-- console could not review or undo its own action.
drop policy profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select to anon, authenticated
  using (not owner_suspended or public.is_admin());

-- Every write path gains the same clause. Reads are left alone deliberately: a
-- suspended user can still see their own data, which makes the state
-- recoverable and legible rather than looking like deletion.
drop policy profiles_write_own on public.profiles;
create policy profiles_write_own on public.profiles
  for all to authenticated
  using ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended())
  with check ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended());

drop policy properties_write_own on public.properties;
create policy properties_write_own on public.properties
  for all to authenticated
  using ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended())
  with check ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended());

drop policy projects_write_own on public.projects;
create policy projects_write_own on public.projects
  for all to authenticated
  using ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended())
  with check ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended());

drop policy cards_update_own on public.cards;
create policy cards_update_own on public.cards
  for update to authenticated
  using ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended())
  with check ((auth.uid() = owner_id or public.is_admin()) and not public.is_suspended());

drop policy carts_own on public.carts;
create policy carts_own on public.carts
  for all to authenticated
  using (auth.uid() = user_id and not public.is_suspended())
  with check (auth.uid() = user_id and not public.is_suspended());

drop policy teams_write_owner on public.teams;
create policy teams_write_owner on public.teams
  for all to authenticated
  using ((owner_id = auth.uid() or public.is_admin()) and not public.is_suspended())
  with check ((owner_id = auth.uid() or public.is_admin()) and not public.is_suspended());

-- Admin write paths too. A suspended admin is a revoked admin in every way
-- that matters, and this is the case where it matters most.
drop policy products_write_admin on public.products;
create policy products_write_admin on public.products
  for all to authenticated
  using (public.is_admin() and not public.is_suspended())
  with check (public.is_admin() and not public.is_suspended());

drop policy product_categories_write_admin on public.product_categories;
create policy product_categories_write_admin on public.product_categories
  for all to authenticated
  using (public.is_admin() and not public.is_suspended())
  with check (public.is_admin() and not public.is_suspended());

drop policy product_variations_write_admin on public.product_variations;
create policy product_variations_write_admin on public.product_variations
  for all to authenticated
  using (public.is_admin() and not public.is_suspended())
  with check (public.is_admin() and not public.is_suspended());

drop policy settings_write_admin on public.settings;
create policy settings_write_admin on public.settings
  for all to authenticated
  using (public.is_admin() and not public.is_suspended())
  with check (public.is_admin() and not public.is_suspended());

drop policy admins_write_superadmin on public.admins;
create policy admins_write_superadmin on public.admins
  for all to authenticated
  using (public.is_superadmin() and not public.is_suspended())
  with check (public.is_superadmin() and not public.is_suspended());

comment on column public.profiles.owner_suspended is
  'Mirror of users.subscription_status = suspended, kept by trigger. Read by profiles_select_public.';
