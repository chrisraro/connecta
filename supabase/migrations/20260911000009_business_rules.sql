-- Phase 2/4: business rules that RLS cannot express.
--
-- The plan flags this as trap 2: Convex had 23 internalMutation and 4
-- internalQuery functions that deliberately bypass user-facing auth. Their
-- Postgres equivalent is a SECURITY DEFINER function or the service-role key,
-- and both bypass RLS entirely -- so each one needs a deliberate decision
-- rather than a blanket port.
--
-- DECISION (2026-09-11): privileged operations that a SIGNED-IN USER triggers
-- live here, as definer functions with a narrow signature and their own checks.
-- The service-role key is reserved for callers with no user session at all
-- (webhooks, scheduled jobs). A service-role key reachable from anything the
-- browser can influence voids the whole RLS design, so the smaller its blast
-- radius the better.

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------
-- Ports convex/rateLimit.ts. Definer because rate_limits is deliberately
-- unreachable by anon and authenticated (a limiter the client can write is not
-- a limiter).
--
-- Raises rather than returning false: every caller here treats exceeding the
-- limit as fatal, and a boolean return invites a caller that forgets to check.
create function public.check_rate_limit(
  limit_key text,
  max_hits int,
  window_seconds int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_window_start timestamptz;
  row_count int;
begin
  select window_start, count into row_window_start, row_count
    from public.rate_limits where key = limit_key for update;

  if row_window_start is null then
    insert into public.rate_limits (key, window_start, count) values (limit_key, now(), 1)
      on conflict (key) do update set window_start = now(), count = 1;
    return;
  end if;

  if row_window_start < now() - make_interval(secs => window_seconds) then
    update public.rate_limits set window_start = now(), count = 1 where key = limit_key;
    return;
  end if;

  if row_count >= max_hits then
    raise exception using
      errcode = 'P0001',
      message = 'Too many attempts. Please wait a moment and try again.',
      detail  = 'RATE_LIMIT';
  end if;

  update public.rate_limits set count = count + 1 where key = limit_key;
end;
$$;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Plan limits
-- ---------------------------------------------------------------------------
-- Free = 1 profile and 1 active card; paid = unlimited. Mirrors
-- convex/plans.ts PLAN_LIMITS.
--
-- These are enforced by TRIGGER, not by application code, because they are the
-- paywall. A limit checked only in the client is a limit that anyone willing to
-- call the API directly does not have -- and PostgREST means calling the API
-- directly is trivial.
--
-- detail = PLAN_LIMIT is the contract lib/plans.ts#isPlanLimitError keys on,
-- so the UI shows its upgrade CTA instead of a dead-end error.
create function public.enforce_profile_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_plan public.plan_tier;
  existing int;
begin
  select plan into owner_plan from public.users where id = new.owner_id;
  if owner_plan is distinct from 'free' then
    return new;
  end if;

  select count(*) into existing from public.profiles where owner_id = new.owner_id;
  if existing >= 1 then
    raise exception using
      errcode = 'P0001',
      message = 'Upgrade to Pro to create more than one profile.',
      detail  = 'PLAN_LIMIT';
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_plan_limit
  before insert on public.profiles
  for each row execute function public.enforce_profile_plan_limit();

revoke all on function public.enforce_profile_plan_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A card may only link to a profile its owner owns
-- ---------------------------------------------------------------------------
-- cards_update_own lets the owner update their card, but RLS checks the ROW
-- being written, not the row it points at -- so without this a user could set
-- linked_profile_id to a profile id belonging to someone else and have their
-- physical card resolve to a stranger profile.
create function public.validate_card_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_owner uuid;
begin
  if new.linked_profile_id is null then
    return new;
  end if;
  select owner_id into profile_owner from public.profiles where id = new.linked_profile_id;
  if profile_owner is distinct from new.owner_id then
    raise exception using
      errcode = 'P0001',
      message = 'A card can only be linked to a profile you own.',
      detail  = 'INVALID_LINK';
  end if;
  return new;
end;
$$;

create trigger cards_validate_link
  before insert or update of linked_profile_id, owner_id on public.cards
  for each row execute function public.validate_card_link();

revoke all on function public.validate_card_link() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Claiming a card
-- ---------------------------------------------------------------------------
-- Definer because the card being claimed is, by design, invisible to the
-- person claiming it: inventory rows have owner_id IS NULL and no policy
-- matches them. The claimant cannot SELECT the row they are about to own.
--
-- Idempotent: re-tapping a card you already own returns its id instead of
-- failing, because the physical card gets tapped repeatedly and a second tap
-- must not read as an error.
--
-- status, NOT owner_id, is the source of truth for claimability -- the Convex
-- version documents this as a bug it already hit once: factory registration
-- stamped ownerId with the registering admin, so an owner check rejected every
-- card the factory ever produced. Here owner_id IS NULL for inventory, so both
-- readings agree.
create function public.claim_card_by_uuid(card_uuid text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  normalized text := lower(btrim(card_uuid));
  target public.cards;
  caller_plan public.plan_tier;
  active_count int;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in to claim a card.', detail = 'UNAUTHORIZED';
  end if;

  -- Keyed on the caller, not on client-supplied input, so it cannot be
  -- sidestepped by varying the argument. Charged BEFORE the lookup so that
  -- guessing uuids is itself limited.
  perform public.check_rate_limit('claim:' || caller::text, 10, 60);

  select * into target from public.cards where uuid = normalized for update;

  if target.id is null then
    raise exception using errcode = 'P0001',
      message = 'Card not found.', detail = 'CARD_NOT_FOUND';
  end if;

  if target.owner_id = caller and target.status = 'active' then
    return target.id;
  end if;

  if target.status <> 'inventory' then
    raise exception using errcode = 'P0001',
      message = 'Card is not available for claiming.', detail = 'NOT_AVAILABLE';
  end if;

  select plan into caller_plan from public.users where id = caller;
  if caller_plan is not distinct from 'free' then
    select count(*) into active_count
      from public.cards where owner_id = caller and status = 'active';
    if active_count >= 1 then
      raise exception using errcode = 'P0001',
        message = 'Upgrade to Pro to activate more than one card.', detail = 'PLAN_LIMIT';
    end if;
  end if;

  update public.cards
     set owner_id = caller, status = 'active'
   where id = target.id;

  return target.id;
end;
$$;

-- Same operation, keyed by the printed activation code rather than the tag
-- uuid -- the path for someone entering the code by hand.
create function public.activate_card_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.cards;
  caller_plan public.plan_tier;
  active_count int;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in to activate a card.', detail = 'UNAUTHORIZED';
  end if;

  -- Tighter than claim: this one is guessable by brute force, and each wrong
  -- guess must count. The limit is charged before the lookup so a wrong code
  -- costs the same as a right one.
  perform public.check_rate_limit('activate:' || caller::text, 5, 300);

  select * into target from public.cards
   where upper(btrim(activation_code)) = upper(btrim(code)) for update;

  if target.id is null then
    raise exception using errcode = 'P0001',
      message = 'Invalid activation code.', detail = 'INVALID_CODE';
  end if;

  if target.owner_id = caller and target.status = 'active' then
    return target.id;
  end if;

  if target.status <> 'inventory' then
    raise exception using errcode = 'P0001',
      message = 'This card has already been activated.', detail = 'NOT_AVAILABLE';
  end if;

  select plan into caller_plan from public.users where id = caller;
  if caller_plan is not distinct from 'free' then
    select count(*) into active_count
      from public.cards where owner_id = caller and status = 'active';
    if active_count >= 1 then
      raise exception using errcode = 'P0001',
        message = 'Upgrade to Pro to activate more than one card.', detail = 'PLAN_LIMIT';
    end if;
  end if;

  update public.cards set owner_id = caller, status = 'active' where id = target.id;
  return target.id;
end;
$$;

-- These two ARE meant to be called by a signed-in user, so authenticated keeps
-- EXECUTE. anon does not: claiming requires an identity to claim on behalf of.
revoke all on function public.claim_card_by_uuid(text)    from public, anon;
revoke all on function public.activate_card_by_code(text) from public, anon;
grant execute on function public.claim_card_by_uuid(text)    to authenticated;
grant execute on function public.activate_card_by_code(text) to authenticated;
