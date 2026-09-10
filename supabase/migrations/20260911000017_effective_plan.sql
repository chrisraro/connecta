-- The paywall has to expire.
--
-- 20260911000009 enforces plan limits by reading users.plan directly. That
-- column is the STORED plan, not the effective one. convex/billing.ts:51
-- computes the difference:
--
--   a stored paid plan whose (planExpiresAt + 3 day grace) is in the past is
--   treated as "free" -- "the single source of truth used by every
--   enforcement point"
--
-- The port dropped that. An account that bought Pro once and never renewed
-- kept unlimited profiles and unlimited active cards forever, because
-- `plan is distinct from 'free'` stays true for a plan that expired two years
-- ago. The subscription lapses; the entitlement does not. Nothing surfaces it,
-- because the failure is silent generosity.
--
-- A NULL expiry on a paid plan counts as EXPIRED, matching the JS
-- (`user.planExpiresAt ?? 0`, i.e. the epoch). That is the fail-closed
-- reading: a paid plan with no expiry recorded is a data problem, and the safe
-- interpretation of a data problem in a paywall is "not entitled".
create function public.effective_plan(check_user uuid default auth.uid())
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.plan = 'free' then 'free'::public.plan_tier
    when coalesce(u.plan_expires_at, 'epoch'::timestamptz)
         + interval '3 days' < now() then 'free'::public.plan_tier
    else u.plan
  end
  from public.users u
  where u.id = check_user
$$;

revoke all on function public.effective_plan(uuid) from public, anon;
grant execute on function public.effective_plan(uuid) to authenticated;

-- Re-point the two enforcement sites at it.
create or replace function public.enforce_profile_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_plan public.plan_tier;
  existing int;
begin
  owner_plan := public.effective_plan(new.owner_id);
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
revoke all on function public.enforce_profile_plan_limit() from public, anon, authenticated;

create or replace function public.claim_card_by_uuid(card_uuid text)
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

  caller_plan := public.effective_plan(caller);
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
revoke all on function public.claim_card_by_uuid(text) from public, anon;
grant execute on function public.claim_card_by_uuid(text) to authenticated;

create or replace function public.activate_card_by_code(code text)
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

  caller_plan := public.effective_plan(caller);
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
revoke all on function public.activate_card_by_code(text) from public, anon;
grant execute on function public.activate_card_by_code(text) to authenticated;
