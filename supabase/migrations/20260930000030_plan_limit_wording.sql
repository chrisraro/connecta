-- Plan-limit errors still said "Upgrade to Pro". 20260927000028 renamed the
-- Pro plan to Lead tools but, by design, left the three functions that only
-- compare against 'free' untouched -- and those are exactly the ones whose
-- PLAN_LIMIT message names the plan. The message reaches the user verbatim
-- (lib/errors.ts#toUserMessage), so a Free user hitting a limit was told to
-- buy a plan that no longer exists.
--
-- Each function is recreated verbatim from its LATEST definition,
-- 20260911000017_effective_plan.sql, with only the message text changed.
-- detail = 'PLAN_LIMIT' is unchanged: lib/plans.ts#isPlanLimitError keys on
-- it, not on the wording.

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
      message = 'Upgrade to Lead tools to create more than one profile.',
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
        message = 'Upgrade to Lead tools to activate more than one card.', detail = 'PLAN_LIMIT';
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
        message = 'Upgrade to Lead tools to activate more than one card.', detail = 'PLAN_LIMIT';
    end if;
  end if;

  update public.cards set owner_id = caller, status = 'active' where id = target.id;
  return target.id;
end;
$$;
revoke all on function public.activate_card_by_code(text) from public, anon;
grant execute on function public.activate_card_by_code(text) to authenticated;
