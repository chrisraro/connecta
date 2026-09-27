-- Rename the paid plans: Pro -> Lead tools, Business -> Teams.
--
-- DECISION (owner, 2026-09-27): the app adopts the homepage plan names and
-- prices everywhere. The limits behind each tier are UNCHANGED -- this
-- migration only renames the enum labels that store them, so every existing
-- row keeps meaning exactly what it meant before.
--
-- `alter type ... rename value` rewrites the label in place; every column,
-- index, and stored row that held the old label keeps its value under the
-- new one automatically. Nothing needs a data migration.
alter type public.plan_tier rename value 'pro' to 'lead_tools';
alter type public.plan_tier rename value 'business' to 'teams';

-- ---------------------------------------------------------------------------
-- Every function whose body compares against the literal 'pro' or 'business'
-- AS A PLAN must be recreated -- a literal that no longer exists in the enum
-- raises at runtime the first time the branch is reached. Functions that only
-- ever compared against 'free' (enforce_profile_plan_limit,
-- claim_card_by_uuid, activate_card_by_code) are untouched: 'free' did not
-- move.
--
-- public.profile_type's own 'business' member (individual/company/business,
-- 20260911000001) is a PROFILE CATEGORY, not a plan, and is deliberately left
-- alone -- see 20260911000021_onboarding.sql's use of it.
--
-- Each function below is recreated verbatim from its LATEST definition, with
-- only the plan literal changed, preserving security definer, search_path,
-- and grants/revokes.
-- ---------------------------------------------------------------------------

-- Latest definition: 20260911000020_team_operations.sql (get_team_leads).
-- Business-only team lead pool -> now gated on 'teams'.
create or replace function public.get_team_leads()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  team   public.teams;
  result jsonb;
begin
  if caller is null or public.effective_plan(caller) is distinct from 'teams' then
    return '[]'::jsonb;
  end if;

  select * into team from public.teams where owner_id = caller limit 1;
  if team.id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb)
    into result
    from (
      select jsonb_build_object(
               'id',              l.id,
               'inquirerName',    l.inquirer_name,
               'inquirerContact', l.inquirer_contact,
               'message',         l.message,
               'status',          l.status,
               'createdAt',       l.created_at,
               'ownerName',       coalesce(u.name, u.email)
             ) as x
        from public.leads l
        join public.users u on u.id = l.owner_id
       where u.team_id = team.id or u.id = team.owner_id
    ) rows;

  return result;
end;
$$;

revoke all on function public.get_team_leads() from public, anon;
grant execute on function public.get_team_leads() to authenticated;

-- Latest definition: 20260911000022_public_profile.sql (get_public_profile).
-- Team branding on the public profile was a Business perk -> now 'teams'.
create or replace function public.get_public_profile(
  lookup_slug text default null,
  lookup_id   uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prof          public.profiles;
  owner_row     public.users;
  owner_plan    public.plan_tier;
  show_branding boolean := true;
  team_branding jsonb := null;
  team          public.teams;
begin
  if lookup_id is not null then
    select * into prof from public.profiles where id = lookup_id;
  elsif lookup_slug is not null then
    select * into prof from public.profiles where lower(slug) = lower(lookup_slug);
  end if;

  if prof.id is null then
    return null;
  end if;

  -- Suspended owners are invisible to the public, matching
  -- profiles_select_anon. Without this check the definer function would be a
  -- way around the very policy that hides them.
  if prof.owner_suspended then
    return null;
  end if;

  select * into owner_row from public.users where id = prof.owner_id;
  if owner_row.id is not null then
    owner_plan := public.effective_plan(owner_row.id);

    -- Free shows branding; paid tiers do not. Mirrors PLAN_LIMITS.showBranding.
    show_branding := (owner_plan = 'free');

    if owner_plan = 'teams' and owner_row.team_id is not null then
      select * into team from public.teams where id = owner_row.team_id;
      if team.id is not null then
        team_branding := jsonb_build_object(
          'companyName', team.company_name,
          'logoUrl',     team.logo_url,
          'accentColor', team.accent_color);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'id',               prof.id,
    'ownerId',          prof.owner_id,
    'name',             prof.name,
    'slug',             prof.slug,
    'profileType',      prof.profile_type,
    'agentInfo',        prof.agent_info,
    'layoutConfig',     prof.layout_config,
    'products',         prof.products,
    'services',         prof.services,
    'propertyListings', prof.property_listings,
    'inlineProjects',   prof.inline_projects,
    'skin',             prof.skin,
    'showStorefront',   prof.show_storefront,
    'showBranding',     show_branding,
    'teamBranding',     team_branding);
end;
$$;

revoke all on function public.get_public_profile(text, uuid) from public;
grant execute on function public.get_public_profile(text, uuid) to anon, authenticated;

-- Latest definition: 20260924000024_admin_set_user_plan.sql
-- (admin_set_user_plan). A first Teams upgrade still provisions the 5-seat
-- team workspace.
create or replace function public.admin_set_user_plan(
  target_user uuid,
  new_plan    public.plan_tier,
  period_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller     uuid := public.require_superadmin();
  target     public.users;
  new_expiry timestamptz;
  new_team   uuid;
begin
  select * into target from public.users where id = target_user for update;
  if target.id is null then
    raise exception using errcode = 'P0001',
      message = 'User not found.', detail = 'NOT_FOUND';
  end if;

  if new_plan <> 'free' and (period_days is null or period_days < 1 or period_days > 3660) then
    raise exception using errcode = 'P0001',
      message = 'Period must be between 1 and 3660 days.', detail = 'INVALID_PERIOD';
  end if;

  if new_plan = 'free' then
    new_expiry := null;
  else
    new_expiry := greatest(now(), coalesce(target.plan_expires_at, now()))
                  + make_interval(days => period_days);
  end if;

  new_team := target.team_id;

  if new_plan = 'teams' and new_team is null then
    select t.id into new_team from public.teams t where t.owner_id = target.id limit 1;

    if new_team is null then
      insert into public.teams (name, owner_id, seats, company_name)
      values (
        coalesce(nullif(target.name, ''), nullif(split_part(coalesce(target.email, ''), '@', 1), ''), 'My')
          || '''s team',
        target.id,
        5,
        nullif(target.onboarding_data ->> 'company', ''))
      returning id into new_team;
    end if;
  end if;

  update public.users u
     set plan            = new_plan,
         plan_expires_at = new_expiry,
         team_id         = new_team
   where u.id = target.id;

  perform public.log_audit(
    caller, 'set_plan', 'user', target.id::text,
    jsonb_build_object(
      'from',       target.plan,
      'to',         new_plan,
      'periodDays', case when new_plan = 'free' then null else period_days end,
      'expiresAt',  new_expiry));

  return jsonb_build_object('plan', new_plan, 'planExpiresAt', new_expiry, 'teamId', new_team);
end;
$$;

revoke all on function public.admin_set_user_plan(uuid, public.plan_tier, int)
  from public, anon;
grant execute on function public.admin_set_user_plan(uuid, public.plan_tier, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Not changed, checked and ruled out:
--   * enforce_profile_plan_limit, claim_card_by_uuid, activate_card_by_code
--     (20260911000009 / re-created 20260911000017 effective_plan) only ever
--     compare against 'free', which is unaffected by this rename.
--   * team_invite_member's LATEST definition (20260924000026) has no plan
--     literal at all -- seats are checked by count, not by plan.
--   * onboarding.sql's `when 'business'` branches key off profile_type
--     (individual/company/business), a different enum, not a plan.
--   * No settings row is seeded by any migration for plan pricing keys
--     ("pro"/"business"); usePlanPricing (hooks/useSettings.ts) falls back to
--     compiled defaults when the settings row is absent, so there is nothing
--     stored under the old keys to migrate. The settings VALUE shape is
--     re-keyed in application code (lib/plans.ts) going forward; an admin who
--     re-saves the Plan Pricing form after this deploy writes the new keys.
-- ---------------------------------------------------------------------------
