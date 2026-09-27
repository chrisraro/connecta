-- Team invites become consent, not silent membership. Owner decision,
-- 2026-09-27.
--
-- 20260924000026 made an EXISTING confirmed user's invite join them the
-- instant the owner clicked "Invite" -- no notice, no accept, no decline.
-- That is the "silent join" the owner ruled out here: from now on every
-- invite -- brand-new email or existing account -- becomes a PENDING row
-- and the person decides. A brand-new email additionally gets Supabase's
-- built-in invite email (sent by the server route, not this migration,
-- since it needs the service-role client); an existing account sees the
-- invite as an in-app Accept/Decline (get_my_invites, team_accept_invite,
-- the new team_decline_invite).
--
-- The on-confirm auto-accept trigger from 20260924000026
-- (accept_team_invites_on_confirm / accept_pending_team_invite) is left
-- exactly as it is. It only ever fires when auth.users.email_confirmed_at
-- moves from null to set, which for an ALREADY-confirmed existing account
-- never happens again -- so it no longer has any silent-join case left to
-- cause. For a brand-new address invited by email, that confirmation is the
-- moment they click the invite link and set a password, which IS their
-- acceptance.

-- ---------------------------------------------------------------------------
-- A third resolution: declined, alongside pending/accepted/revoked.
-- ---------------------------------------------------------------------------
alter type public.invite_status add value 'declined';

-- ---------------------------------------------------------------------------
-- team_invite_member: never sets team_id directly.
-- ---------------------------------------------------------------------------
-- Return shape changes (uuid -> jsonb: {inviteId, hasAccount}), so this is a
-- drop + create rather than a create-or-replace, and the grants below are
-- re-issued afterwards. Every check from the latest definition
-- (20260924000026) is kept -- signed-in owner, valid email, seats (members +
-- pending), self-invite, already-a-member, duplicate pending invite -- plus
-- one more that definition already needed for its confirmed-user branch:
-- refusing to invite someone who already belongs to a DIFFERENT team, which
-- otherwise would sit as a pending invite that could never be accepted.
drop function if exists public.team_invite_member(text);

create function public.team_invite_member(invite_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller        uuid := auth.uid();
  caller_row    public.users;
  team          public.teams;
  email_clean   text := lower(btrim(invite_email));
  member_count  int;
  pending_count int;
  existing      public.users;
  new_id        uuid;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in.', detail = 'UNAUTHORIZED';
  end if;

  select * into caller_row from public.users where id = caller;

  select * into team from public.teams where owner_id = caller limit 1;
  if team.id is null then
    raise exception using errcode = 'P0001',
      message = 'You do not own a team.', detail = 'NO_TEAM';
  end if;

  if email_clean = '' or position('@' in email_clean) = 0 then
    raise exception using errcode = 'P0001',
      message = 'Enter a valid email address', detail = 'INVALID_EMAIL';
  end if;

  -- Seats count members AND outstanding invites, so a team cannot issue more
  -- invites than it has room for and overflow the moment they are accepted.
  select count(*) into member_count
    from public.users u where u.team_id = team.id or u.id = team.owner_id;
  select count(*) into pending_count
    from public.team_invites where team_id = team.id and status = 'pending';

  if member_count + pending_count >= team.seats then
    raise exception using errcode = 'P0001',
      message = 'No seats available. All seats are in use.', detail = 'NO_SEATS';
  end if;

  select * into existing from public.users where lower(email) = email_clean;

  if existing.id = team.owner_id then
    raise exception using errcode = 'P0001',
      message = 'You are the team owner', detail = 'SELF_INVITE';
  end if;
  if existing.id is not null and existing.team_id = team.id then
    raise exception using errcode = 'P0001',
      message = 'That person is already on your team', detail = 'ALREADY_MEMBER';
  end if;
  if existing.id is not null and existing.team_id is not null and existing.team_id <> team.id then
    raise exception using errcode = 'P0001',
      message = 'That person already belongs to another team', detail = 'OTHER_TEAM';
  end if;
  if exists (select 1 from public.team_invites
              where team_id = team.id and lower(email) = email_clean and status = 'pending') then
    raise exception using errcode = 'P0001',
      message = 'That email already has a pending invite', detail = 'DUPLICATE_INVITE';
  end if;

  insert into public.team_invites (team_id, email, invited_by, status)
  values (team.id, email_clean, caller, 'pending')
  returning id into new_id;

  -- An existing account gets an in-app heads-up immediately, so the invite
  -- is not something they only discover by opening the Team page unprompted.
  -- A brand-new address has no `users` row to notify -- the server route
  -- sends Supabase's own invite email for that case instead.
  if existing.id is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      existing.id,
      'system',
      'Team invite',
      format('%s invited you to join %s on Connecta PH.',
             coalesce(nullif(caller_row.name, ''), caller_row.email, 'Someone'),
             team.name),
      '/dashboard/team'
    );
  end if;

  return jsonb_build_object('inviteId', new_id, 'hasAccount', existing.id is not null);
end;
$$;

revoke all on function public.team_invite_member(text) from public, anon;
grant execute on function public.team_invite_member(text) to authenticated;

-- ---------------------------------------------------------------------------
-- team_decline_invite: the invitee's other option besides team_accept_invite.
-- ---------------------------------------------------------------------------
-- Matched on the email of the caller's own row, exactly like
-- team_accept_invite (20260911000020) -- not on an id passed in, or anyone
-- could decline anyone else's invite by guessing its uuid.
create function public.team_decline_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller       uuid := auth.uid();
  caller_email text;
  inv          public.team_invites;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in.', detail = 'UNAUTHORIZED';
  end if;

  select email into caller_email from public.users where id = caller;

  select * into inv from public.team_invites
   where id = invite_id and status = 'pending' for update;

  if inv.id is null or lower(inv.email) is distinct from lower(coalesce(caller_email, '')) then
    raise exception using errcode = 'P0001',
      message = 'Invite not found.', detail = 'NOT_FOUND';
  end if;

  update public.team_invites set status = 'declined' where id = inv.id;
end;
$$;

revoke all on function public.team_decline_invite(uuid) from public, anon;
grant execute on function public.team_decline_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_invites: what the dashboard/Team-page banner renders.
-- ---------------------------------------------------------------------------
create function public.get_my_invites()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller       uuid := auth.uid();
  caller_email text;
  result       jsonb;
begin
  if caller is null then
    return '[]'::jsonb;
  end if;

  select email into caller_email from public.users where id = caller;
  if caller_email is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',        i.id,
           'teamId',    t.id,
           'teamName',  t.name,
           'ownerName', coalesce(nullif(o.name, ''), o.email),
           'invitedAt', i.created_at
         ) order by i.created_at desc), '[]'::jsonb)
    into result
    from public.team_invites i
    join public.teams t on t.id = i.team_id
    join public.users o on o.id = t.owner_id
   where lower(i.email) = lower(caller_email) and i.status = 'pending';

  return result;
end;
$$;

revoke all on function public.get_my_invites() from public, anon;
grant execute on function public.get_my_invites() to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_team: pending invites are owner-only (they carry other people's
-- email addresses); plan inheritance is handled below in effective_plan, so
-- no change is needed here beyond that gate.
-- ---------------------------------------------------------------------------
-- Latest definition: 20260911000020_team_operations.sql.
create or replace function public.get_my_team()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller  uuid := auth.uid();
  team    public.teams;
  members jsonb;
  invites jsonb;
  used    int;
  owner   boolean;
begin
  if caller is null then
    return null;
  end if;

  -- The team they belong to, or failing that the one they own. Both, because
  -- an owner is not required to also carry their own team_id.
  select t.* into team
    from public.teams t
    join public.users u on u.team_id = t.id
   where u.id = caller;

  if team.id is null then
    select * into team from public.teams where owner_id = caller limit 1;
  end if;

  if team.id is null then
    return jsonb_build_object(
      'plan',        public.effective_plan(caller),
      'isOwner',     false,
      'team',        null,
      'members',     '[]'::jsonb,
      'pendingInvites', '[]'::jsonb,
      'seatUsage',   jsonb_build_object('used', 0, 'total', 0));
  end if;

  owner := team.owner_id = caller;

  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', u.id,
           'name',   u.name,
           'email',  u.email,
           'role',   case when u.id = team.owner_id then 'owner' else 'member' end
         ) order by (u.id = team.owner_id) desc, u.email), '[]'::jsonb)
    into members
    from public.users u
   where u.team_id = team.id or u.id = team.owner_id;

  -- A pending invite's email is only the owner's business to see.
  if owner then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id',        i.id,
             'email',     i.email,
             'createdAt', i.created_at
           ) order by i.created_at desc), '[]'::jsonb)
      into invites
      from public.team_invites i
     where i.team_id = team.id and i.status = 'pending';
  else
    invites := '[]'::jsonb;
  end if;

  used := jsonb_array_length(members);

  return jsonb_build_object(
    'plan',    public.effective_plan(caller),
    'isOwner', owner,
    'team', jsonb_build_object(
      'id',          team.id,
      'name',        team.name,
      'companyName', team.company_name,
      'logoUrl',     team.logo_url,
      'accentColor', team.accent_color,
      'seats',       team.seats,
      'ownerId',     team.owner_id),
    'members',        members,
    'pendingInvites', invites,
    'seatUsage', jsonb_build_object('used', used, 'total', team.seats));
end;
$$;

-- ---------------------------------------------------------------------------
-- effective_plan: a team member inherits the Teams plan from an owner whose
-- OWN effective plan is 'teams' -- never lower than the member's own plan.
-- ---------------------------------------------------------------------------
-- Latest definition: 20260911000017_effective_plan.sql. Signature, language,
-- volatility, security and grants are unchanged, so this is a plain
-- create-or-replace and every existing grant on this function survives it.
--
-- The owner's plan is computed here from the OWNER'S OWN plan/plan_expires_at
-- columns, inline, rather than by calling public.effective_plan(t.owner_id).
-- Calling itself on the owner is exactly the kind of thing that looks
-- harmless until two team rows ever pointed at each other (owner_id chains),
-- at which point it would recurse forever. Reading the owner's raw columns
-- directly cannot recurse, because it never calls this function again.
--
-- "Never lower than their own plan" holds trivially: 'teams' is the top
-- tier, so the only thing this CAN do to a member's own computed plan is
-- raise it to 'teams' -- it can never take a member from 'lead_tools' down
-- to 'free', or from 'teams' down to anything.
create or replace function public.effective_plan(check_user uuid default auth.uid())
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.team_id is not null
     and u.id <> t.owner_id
     and (
       case
         when o.plan = 'free' then 'free'::public.plan_tier
         when coalesce(o.plan_expires_at, 'epoch'::timestamptz) + interval '3 days' < now()
           then 'free'::public.plan_tier
         else o.plan
       end
     ) = 'teams'
    then 'teams'::public.plan_tier
    when u.plan = 'free' then 'free'::public.plan_tier
    when coalesce(u.plan_expires_at, 'epoch'::timestamptz)
         + interval '3 days' < now() then 'free'::public.plan_tier
    else u.plan
  end
  from public.users u
  left join public.teams t on t.id = u.team_id
  left join public.users o on o.id = t.owner_id
  where u.id = check_user
$$;

-- ---------------------------------------------------------------------------
-- Not changed, checked and ruled out:
--   * team_accept_invite (20260911000020) already matches the invitee's
--     verified-JWT-backed public.users.email, re-checks seats at acceptance,
--     and never depended on team_invite_member setting team_id -- it keeps
--     working unmodified against invites that are now ALWAYS pending.
--   * team_revoke_invite, team_remove_member, get_team_leads: no plan
--     literal or team_id-setting behaviour touched by this migration.
--   * accept_pending_team_invite / accept_team_invites_on_confirm
--     (20260924000026): unmodified, per the header note above.
-- ---------------------------------------------------------------------------
