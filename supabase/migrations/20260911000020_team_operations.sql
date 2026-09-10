-- Team membership. Ports convex/teams.ts.
--
-- Membership lives in users.team_id, which is deliberately NOT in the column
-- grants a user holds over their own row (20260911000006): if a person could
-- write their own team_id they would join any team by guessing a uuid, and
-- team_id is what team-scoped reads key on. So every membership change is a
-- definer function that decides who may make it.

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------
-- One aggregate rather than five round trips. The seat counter has to agree
-- with the member list it is displayed beside, and separate queries can be
-- taken at different instants -- showing "3 of 3 seats used" above four
-- members is the kind of inconsistency nobody can debug from a screenshot.
create function public.get_my_team()
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

  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', u.id,
           'name',   u.name,
           'email',  u.email,
           'role',   case when u.id = team.owner_id then 'owner' else 'member' end
         ) order by (u.id = team.owner_id) desc, u.email), '[]'::jsonb)
    into members
    from public.users u
   where u.team_id = team.id or u.id = team.owner_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',        i.id,
           'email',     i.email,
           'createdAt', i.created_at
         ) order by i.created_at desc), '[]'::jsonb)
    into invites
    from public.team_invites i
   where i.team_id = team.id and i.status = 'pending';

  used := jsonb_array_length(members);

  return jsonb_build_object(
    'plan',    public.effective_plan(caller),
    'isOwner', team.owner_id = caller,
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
-- Inviting
-- ---------------------------------------------------------------------------
create function public.team_invite_member(invite_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller        uuid := auth.uid();
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

  select * into team from public.teams where owner_id = caller limit 1;
  if team.id is null then
    raise exception using errcode = 'P0001',
      message = 'You do not own a team.', detail = 'NO_TEAM';
  end if;

  if email_clean = '' or position('@' in email_clean) = 0 then
    raise exception using errcode = 'P0001',
      message = 'Enter a valid email address', detail = 'INVALID_EMAIL';
  end if;

  -- Seats count members AND outstanding invites. Counting only members lets a
  -- team issue unlimited invites and overflow the moment they are accepted.
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
  if exists (select 1 from public.team_invites
              where team_id = team.id and lower(email) = email_clean and status = 'pending') then
    raise exception using errcode = 'P0001',
      message = 'That email already has a pending invite', detail = 'DUPLICATE_INVITE';
  end if;

  insert into public.team_invites (team_id, email, invited_by, status)
  values (team.id, email_clean, caller, 'pending')
  returning id into new_id;

  return new_id;
end;
$$;

create function public.team_revoke_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  update public.team_invites i
     set status = 'revoked'
   where i.id = invite_id
     and i.status = 'pending'
     and exists (select 1 from public.teams t
                  where t.id = i.team_id and t.owner_id = caller);

  if not found then
    raise exception using errcode = 'P0001',
      message = 'Invite not found.', detail = 'NOT_FOUND';
  end if;
end;
$$;

-- Accepting is the invitee's action, matched on the email of their verified
-- JWT -- not on an id they pass in. Otherwise anyone could accept any invite
-- by guessing its uuid.
create function public.team_accept_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller       uuid := auth.uid();
  caller_email text;
  inv          public.team_invites;
  member_count int;
  team         public.teams;
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

  select * into team from public.teams where id = inv.team_id;

  -- Re-checked at acceptance, not just at invite time: seats can be reduced,
  -- or several invites issued and accepted in any order.
  select count(*) into member_count
    from public.users u where u.team_id = team.id or u.id = team.owner_id;
  if member_count >= team.seats then
    raise exception using errcode = 'P0001',
      message = 'This team has no seats available.', detail = 'NO_SEATS';
  end if;

  update public.users set team_id = inv.team_id where id = caller;
  update public.team_invites set status = 'accepted' where id = inv.id;
end;
$$;

-- Removal is the owner's action, or the member removing themselves. A member
-- must always be able to leave without asking permission.
create function public.team_remove_member(member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  team   public.teams;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in.', detail = 'UNAUTHORIZED';
  end if;

  -- Resolved by membership OR ownership. An owner is not required to carry
  -- their own team_id (get_my_team falls back to the team they own for
  -- exactly this reason), so a membership-only lookup misses them entirely --
  -- which made the OWNER_TARGET guard below unreachable in the normal case
  -- and reported a misleading "not on a team" instead.
  select t.* into team
    from public.teams t
   where t.id = (select u.team_id from public.users u where u.id = member_id)
      or t.owner_id = member_id
   limit 1;

  if team.id is null then
    raise exception using errcode = 'P0001',
      message = 'That person is not on a team.', detail = 'NOT_FOUND';
  end if;

  if team.owner_id <> caller and member_id <> caller then
    raise exception using errcode = 'P0001',
      message = 'Only the team owner can remove members.', detail = 'FORBIDDEN';
  end if;

  if member_id = team.owner_id then
    raise exception using errcode = 'P0001',
      message = 'The team owner cannot be removed from their own team.',
      detail  = 'OWNER_TARGET';
  end if;

  update public.users set team_id = null where id = member_id;
end;
$$;

revoke all on function public.get_my_team()             from public, anon;
revoke all on function public.team_invite_member(text)  from public, anon;
revoke all on function public.team_revoke_invite(uuid)  from public, anon;
revoke all on function public.team_accept_invite(uuid)  from public, anon;
revoke all on function public.team_remove_member(uuid)  from public, anon;

grant execute on function public.get_my_team()            to authenticated;
grant execute on function public.team_invite_member(text) to authenticated;
grant execute on function public.team_revoke_invite(uuid) to authenticated;
grant execute on function public.team_accept_invite(uuid) to authenticated;
grant execute on function public.team_remove_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Team-wide lead visibility (Business plan)
-- ---------------------------------------------------------------------------
-- Cannot be a plain select: leads_select_own scopes rows to their owner, which
-- is correct for every other surface. This is the one place a person may read
-- leads belonging to somebody else, so it is a definer function with the
-- entitlement check inside it.
--
-- Gated on effective_plan, not the stored plan: an expired Business
-- subscription must stop showing the team inbox, or the most valuable thing
-- the tier sells keeps working after it lapses. Owner-only, matching the
-- Convex original -- a member sees their own leads through the ordinary
-- dashboard.
create function public.get_team_leads()
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
  if caller is null or public.effective_plan(caller) is distinct from 'business' then
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
