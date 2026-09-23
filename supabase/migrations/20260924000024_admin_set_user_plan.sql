-- Setting a customer's plan by hand.
--
-- GAP CLOSED HERE: there was no way for anyone to reach Pro or Business.
-- Plans used to be set by the PayRex webhook (convex/billing.ts
-- internalMarkInvoicePaid). Commit c1946c4 removed the gateway and said
-- upgrades are "arranged directly" -- but nothing was left for an admin to
-- arrange them WITH. users.plan is outside the column grants a user holds
-- (20260911000002), correctly, so the only path to a paid plan was raw SQL.
--
-- This is the webhook's activation logic, moved to where a person now
-- performs it:
--
--   * a paid plan runs for period_days from the LATER of now and the current
--     expiry, so renewing early never loses the days already paid for
--   * a first Business upgrade creates the team workspace, owned by the
--     customer, with the Business seat count (lib/plans.ts teamSeats: 5)
--   * 'free' clears the expiry; the team row is kept, as the Convex downgrade
--     kept teamId -- Business features gate off through effective_plan(), and
--     re-upgrading restores the same team rather than an empty new one
--
-- Superadmin only, the same bar as suspension: this changes what a customer
-- has paid for.

create function public.admin_set_user_plan(
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

  if new_plan = 'business' and new_team is null then
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
