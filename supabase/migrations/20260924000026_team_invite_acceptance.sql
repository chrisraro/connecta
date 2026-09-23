-- Team invites that actually complete. Ports the two halves of Convex team
-- membership that the port (20260911000020) dropped.
--
-- REGRESSION FIXED HERE: an invite could never be accepted. team_invite_member
-- only ever wrote a PENDING row, and although team_accept_invite exists,
-- nothing in the app calls it -- so every invite stayed pending forever and
-- the Business tier's team feature was dead on arrival. The team page even
-- promised "existing users join instantly".
--
-- Convex did two things (convex/teams.ts inviteMember and
-- acceptInvitesForCurrentUser):
--
--   1. inviting an EXISTING user linked them immediately, refusing if they
--      already belonged to another team;
--   2. on every sign-in, a user with no team took the most recent pending
--      invite for their email whose team still had a free seat.
--
-- Both are ported, with one rule Convex did not need. Clerk only ever handed
-- over verified emails; here an account can exist unconfirmed. Joining a team
-- is keyed on an email address, so it happens only for a CONFIRMED one --
-- otherwise anyone could register an address they do not own, wait for its
-- owner to be invited, and be pulled into someone else's team. The same
-- reasoning, and the same trigger shape, as the admin bootstrap grant
-- (20260911000013).

-- ---------------------------------------------------------------------------
-- Shared: take the best pending invite for a user. Internal only.
-- ---------------------------------------------------------------------------
create function public.accept_pending_team_invite(target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  member   public.users;
  inv      record;
  members  int;
begin
  select * into member from public.users where id = target_user for update;
  if member.id is null or member.team_id is not null or member.email is null then
    return null;
  end if;

  -- Most recent first, as Convex did: the latest invite is the one the
  -- person most likely just heard about.
  for inv in
    select i.id as invite_id, t.id as team_id, t.seats, t.owner_id
      from public.team_invites i
      join public.teams t on t.id = i.team_id
     where lower(i.email) = lower(member.email)
       and i.status = 'pending'
     order by i.created_at desc
  loop
    select count(*) into members
      from public.users u where u.team_id = inv.team_id or u.id = inv.owner_id;
    continue when members >= inv.seats;

    update public.users set team_id = inv.team_id where id = member.id;
    update public.team_invites set status = 'accepted' where id = inv.invite_id;
    return inv.team_id;
  end loop;

  return null;
end;
$$;

revoke all on function public.accept_pending_team_invite(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Half 2: accept on email confirmation
-- ---------------------------------------------------------------------------
-- Convex ran this on every sign-in. Confirmation is the right moment here:
-- it is the first point at which the address is proven, and an account that
-- was invited while unconfirmed is picked up the instant it confirms. An
-- already-confirmed account is linked at invite time instead (below).
create function public.accept_team_invites_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null or new.email is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then
    return new;
  end if;
  perform public.accept_pending_team_invite(new.id);
  return new;
end;
$$;

revoke all on function public.accept_team_invites_on_confirm() from public, anon, authenticated;

-- Sorts after on_auth_user_created, so the public.users row exists.
create trigger zz_accept_team_invites_on_confirm
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.accept_team_invites_on_confirm();

-- ---------------------------------------------------------------------------
-- Half 1: inviting an existing, confirmed user links them immediately
-- ---------------------------------------------------------------------------
-- Same signature and return type as before (the invite id), so callers and
-- generated types are unchanged. Every check from 20260911000020 is kept.
create or replace function public.team_invite_member(invite_email text)
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
  confirmed     boolean;
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

  select a.email_confirmed_at is not null into confirmed
    from auth.users a where a.id = existing.id;

  if existing.id is not null and coalesce(confirmed, false) then
    if existing.team_id is not null then
      raise exception using errcode = 'P0001',
        message = 'That person already belongs to another team', detail = 'OTHER_TEAM';
    end if;

    update public.users set team_id = team.id where id = existing.id;
    insert into public.team_invites (team_id, email, invited_by, status)
    values (team.id, email_clean, caller, 'accepted')
    returning id into new_id;
    return new_id;
  end if;

  insert into public.team_invites (team_id, email, invited_by, status)
  values (team.id, email_clean, caller, 'pending')
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.team_invite_member(text) from public, anon;
grant execute on function public.team_invite_member(text) to authenticated;
