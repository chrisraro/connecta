-- The public profile read. Ports convex/profiles.ts enrichProfile.
--
-- A profile row on its own is not enough to render the public page: two
-- things depend on the OWNER, whose row a visitor cannot read.
--
--   showBranding  -- whether the "made with Connecta" footer shows, which is
--                    a plan entitlement
--   teamBranding  -- a Business team's shared company name, logo and accent,
--                    inherited by its members' profiles
--
-- Both are derived from the owner's plan, and the original is explicit that
-- only the RESULT may cross the boundary: "expose ONLY a cosmetic boolean
-- plus optional team branding -- never leak the owner's plan/expiry
-- internals to the public." A definer function is what lets an anonymous
-- visitor get the answer without being able to ask the question.
--
-- NOT PORTED: resolvedImages. The Convex version batch-resolved every storage
-- id to a URL in one pass, because otherwise each <ProfileImage> fired its own
-- round trip -- documented there as "the single biggest contributor to slow
-- first paint on the public profile page". The bucket is public now, so an
-- image URL is a pure string derivation from its path (lib/imageUrl.ts) with
-- no request at all. The optimisation has nothing left to optimise.
--
-- Gated on effective_plan, so an expired Business subscription stops applying
-- team branding rather than keeping it forever.
create function public.get_public_profile(
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

    if owner_plan = 'business' and owner_row.team_id is not null then
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
