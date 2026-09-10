-- Fix: anon-evaluated policies must never call is_admin().
--
-- 20260911000004 revoked EXECUTE on is_admin() from anon to close an
-- enumeration oracle, and noted the invariant that made it safe:
--
--   "no policy evaluated under the anon role calls either function"
--
-- That was true of the policies in 20260911000003. It was NOT true of
-- 20260911000006, which shipped four public-read policies shaped
-- `to anon, authenticated using (<visible> or public.is_admin())` so that
-- admins could also see unpublished rows. 20260911000011 then added a fifth
-- on profiles.
--
-- A policy is evaluated with the privileges of the querying role, so for a
-- signed-out visitor these do not fall back to false -- they RAISE
-- "permission denied for function is_admin" and the whole query fails. The
-- effect was that every anonymous read of products, product_categories,
-- product_variations and settings errored: the entire signed-out storefront,
-- and after 11, every public profile page. RLS did not leak; it broke, which
-- is the safe direction but not a working product.
--
-- Nothing caught this. The security advisor looks for permissive policies, not
-- policies that cannot run; tsc and the app tests never exercise a signed-out
-- database read. It surfaced only when a test impersonated `anon` and asserted
-- a real row came back.
--
-- The fix splits each one into a pair of role-specific policies. Policies for
-- the same command are OR-ed together, and a policy declared `to anon` is not
-- evaluated for `authenticated` (or vice versa), so the anon branch never
-- touches is_admin while admins keep their wider view. Behaviour is identical
-- to the intent of the originals; only the evaluation path changes.
--
-- Rule going forward: a policy naming `to anon` may only reference columns of
-- its own table and functions anon can execute.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy profiles_select_public on public.profiles;

create policy profiles_select_anon on public.profiles
  for select to anon
  using (not owner_suspended);

create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (not owner_suspended or public.is_admin());

-- ---------------------------------------------------------------------------
-- shop catalogue
-- ---------------------------------------------------------------------------
drop policy product_categories_select_active on public.product_categories;

create policy product_categories_select_anon on public.product_categories
  for select to anon
  using (is_active);

create policy product_categories_select_authenticated on public.product_categories
  for select to authenticated
  using (is_active or public.is_admin());

drop policy products_select_published on public.products;

create policy products_select_anon on public.products
  for select to anon
  using (is_published);

create policy products_select_authenticated on public.products
  for select to authenticated
  using (is_published or public.is_admin());

drop policy product_variations_select_published on public.product_variations;

create policy product_variations_select_anon on public.product_variations
  for select to anon
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.is_published
  ));

create policy product_variations_select_authenticated on public.product_variations
  for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and (p.is_published or public.is_admin())
  ));

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
drop policy settings_select_public on public.settings;

create policy settings_select_anon on public.settings
  for select to anon
  using (is_public);

create policy settings_select_authenticated on public.settings
  for select to authenticated
  using (is_public or public.is_admin());
