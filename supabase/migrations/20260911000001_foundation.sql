-- Phase 1 foundation: enum types and shared trigger helpers.
--
-- Convex expressed closed sets as `v.union(v.literal(...))`, which is checked
-- by the Convex runtime and nowhere else. Postgres enums move that check into
-- the database, so a bad value is rejected even when written by a script, a
-- psql session, or the service-role key. Wire values are preserved EXACTLY
-- (including the hyphens in property status/type) so the port does not
-- silently rename data that the client already sends.

create type public.user_role         as enum ('agent', 'admin');
create type public.plan_tier         as enum ('free', 'pro', 'business');
create type public.admin_role        as enum ('superadmin', 'moderator');

create type public.card_status       as enum ('inventory', 'active', 'lost');

-- Card skins, per the 2026-08-31 design spec. `charcoal` is the signup
-- default. These four replace the freeform designer wholesale -- see the
-- profiles table for what is deliberately NOT created.
create type public.card_skin         as enum ('charcoal', 'scarlet', 'crimson', 'gradient');

create type public.profile_type      as enum ('individual', 'company', 'business');

create type public.property_status   as enum ('for-sale', 'for-rent', 'sold');
create type public.property_type     as enum ('lot-only', 'house-lot', 'townhouse', 'condo', 'commercial');

create type public.project_category  as enum (
  'graphic-design', 'web-design', 'photography', 'video', 'branding',
  'case-study', 'development', 'ui-ux', 'real-estate', 'other'
);

create type public.lead_status       as enum ('new', 'contacted', 'closed');
create type public.notification_type as enum ('new_lead', 'system');
create type public.invite_status     as enum ('pending', 'accepted', 'revoked');
create type public.dimension_unit    as enum ('cm', 'in');

-- Convex maintained `updatedAt` by hand in every mutation that touched a row,
-- which means any mutation that forgets leaves a stale timestamp. A trigger
-- cannot forget.
--
-- `security invoker` is correct here: this runs as whoever performed the write
-- and needs no elevated rights. `search_path = ''` is set regardless, because a
-- function without a pinned search_path can be hijacked by a caller-controlled
-- schema -- the same hazard that made `rls_auto_enable` a finding.
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: stamps updated_at on every UPDATE. Attached per table in later migrations.';
