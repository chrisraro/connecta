-- Admin console operations. Ports the privileged half of convex/admin.ts.
--
-- Every function here is SECURITY DEFINER and re-checks authorisation itself.
-- That is not belt-and-braces over RLS -- these operations write tables the
-- client has NO grants on at all (audit_logs has no INSERT for anyone; cards
-- has no INSERT for anyone), so RLS is not in the picture and the check inside
-- the function IS the boundary.
--
-- Each one also refuses a SUSPENDED admin. A suspended admin is a revoked
-- admin in every way that matters, and the console is exactly where that
-- matters most.

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
-- audit_logs is append-only with no write grant to any client role, so every
-- entry arrives through here. Callers cannot skip it by writing the table
-- directly, which is the property that makes the log trustworthy.
create function public.log_audit(
  actor         uuid,
  audit_action  text,
  resource_type text,
  resource_id   text,
  changes       jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (user_id, action, resource_type, resource_id, changes)
  values (actor, audit_action, resource_type, resource_id, changes)
$$;
revoke all on function public.log_audit(uuid, text, text, text, jsonb)
  from public, anon, authenticated;

-- Shared guard. Raises rather than returning false so no caller can forget to
-- branch on it.
create function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not public.is_admin(caller) or public.is_suspended(caller) then
    raise exception using errcode = 'P0001',
      message = 'Admin access required.', detail = 'FORBIDDEN';
  end if;
  return caller;
end;
$$;
revoke all on function public.require_admin() from public, anon, authenticated;

create function public.require_superadmin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not public.is_superadmin(caller) or public.is_suspended(caller) then
    raise exception using errcode = 'P0001',
      message = 'Superadmin access required.', detail = 'FORBIDDEN';
  end if;
  return caller;
end;
$$;
revoke all on function public.require_superadmin() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The NFC factory
-- ---------------------------------------------------------------------------
-- Alphabet for hand-typed activation codes: uppercase only, with every
-- lookalike pair removed (0/O, 1/I/L, 5/S, 8/B, 2/Z) because these are
-- transcribed by hand from a printed sticker, often off a phone screen.
-- 25^6 is about 244 million; uniqueness is enforced by lookup, not by size.
--
-- Randomness comes from gen_random_bytes, not random(): random() is a seeded
-- PRNG whose sequence is predictable from prior outputs, and this code is the
-- secret that converts factory stock into a claimed card. The modulo
-- introduces a slight bias toward the first six letters, which is immaterial
-- against a code that is physically printed and whose entry is rate limited to
-- five attempts per five minutes.
create function public.admin_register_card(
  card_uuid text,
  skin public.card_skin default 'charcoal'
)
returns public.cards
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller     uuid := public.require_admin();
  normalized text := lower(btrim(card_uuid));
  alphabet   text := 'ACDEFGHJKMNPQRTUVWXY34679';
  code       text;
  created    public.cards;
begin
  if normalized = '' then
    raise exception using errcode = 'P0001',
      message = 'A card UUID is required.', detail = 'INVALID_UUID';
  end if;

  -- Distinguishable from any other failure, because the factory page has to
  -- tell an operator "you already registered this tag" -- routine when working
  -- through a tray of cards -- rather than showing a generic error that looks
  -- like the tool is broken.
  if exists (select 1 from public.cards where uuid = normalized) then
    raise exception using errcode = 'P0001',
      message = 'Card with UUID ' || normalized || ' already exists',
      detail  = 'DUPLICATE_UUID';
  end if;

  for _attempt in 1..10 loop
    select string_agg(
             substr(alphabet,
                    1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)),
                    1),
             '')
      into code
      from generate_series(1, 6);

    exit when not exists (select 1 from public.cards where activation_code = code);
    code := null;
  end loop;

  if code is null then
    raise exception using errcode = 'P0001',
      message = 'Could not generate a unique activation code. Please try again.',
      detail  = 'CODE_COLLISION';
  end if;

  insert into public.cards (uuid, activation_code, status, skin)
  values (normalized, code, 'inventory', skin)
  returning * into created;

  perform public.log_audit(caller, 'register_card', 'card', created.id::text,
    jsonb_build_object('uuid', normalized, 'skin', skin));

  return created;
end;
$$;

-- Deleting stock. HARDENING: refuses anything that is not inventory.
--
-- The Convex version deleted whatever it was given. An active card is a
-- physical object in a customer hand pointing at a live profile, and deleting
-- its row does not recall the object -- it turns a working card into a dead
-- link with no way to restore it short of re-registering the same uuid. A
-- console that can do that by mis-click should not.
create function public.admin_delete_cards(card_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller  uuid := public.require_admin();
  claimed int;
  removed int;
begin
  select count(*) into claimed
    from public.cards where id = any(card_ids) and status <> 'inventory';

  if claimed > 0 then
    raise exception using errcode = 'P0001',
      message = 'Refusing to delete ' || claimed ||
                ' card(s) that are already claimed. Only unclaimed inventory can be deleted.',
      detail  = 'CARD_IN_USE';
  end if;

  delete from public.cards where id = any(card_ids) and status = 'inventory';
  get diagnostics removed = row_count;

  perform public.log_audit(caller, 'delete_cards', 'card', 'bulk',
    jsonb_build_object('count', removed, 'ids', to_jsonb(card_ids)));

  return removed;
end;
$$;

-- ---------------------------------------------------------------------------
-- User administration
-- ---------------------------------------------------------------------------
create function public.admin_set_user_suspended(target_user uuid, suspend boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_superadmin();
begin
  -- Locking yourself out of the console is not a recoverable mistake from
  -- inside the console.
  if target_user = caller then
    raise exception using errcode = 'P0001',
      message = 'You cannot suspend your own account.', detail = 'SELF_TARGET';
  end if;

  if not exists (select 1 from public.users where id = target_user) then
    raise exception using errcode = 'P0001',
      message = 'User not found.', detail = 'NOT_FOUND';
  end if;

  update public.users
     set subscription_status = case when suspend then 'suspended' else 'active' end
   where id = target_user;

  perform public.log_audit(
    caller,
    case when suspend then 'suspend_user' else 'reactivate_user' end,
    'user', target_user::text,
    jsonb_build_object('suspended', suspend));
end;
$$;

create function public.admin_grant_role(
  target_user uuid,
  grant_role public.admin_role,
  grant_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_superadmin();
begin
  if not exists (select 1 from public.users where id = target_user) then
    raise exception using errcode = 'P0001',
      message = 'User not found.', detail = 'NOT_FOUND';
  end if;

  -- One live grant per user is a unique index, so an existing grant is
  -- upgraded in place rather than colliding.
  if exists (select 1 from public.admins where user_id = target_user and revoked_at is null) then
    update public.admins
       set role = grant_role, reason = coalesce(grant_reason, reason)
     where user_id = target_user and revoked_at is null;
  else
    insert into public.admins (user_id, role, granted_by, reason)
    values (target_user, grant_role, caller, grant_reason);
  end if;

  perform public.log_audit(caller, 'grant_admin_role', 'user', target_user::text,
    jsonb_build_object('role', grant_role, 'reason', grant_reason));
end;
$$;

create function public.admin_revoke_role(target_user uuid, revoke_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_superadmin();
  remaining int;
begin
  if target_user = caller then
    raise exception using errcode = 'P0001',
      message = 'You cannot revoke your own admin access.', detail = 'SELF_TARGET';
  end if;

  -- Defensive only -- CURRENTLY UNREACHABLE, and documented as such so nobody
  -- mistakes it for the thing keeping the console from being orphaned.
  --
  -- Reaching it requires the target to be the last superadmin. But
  -- require_superadmin() above means the CALLER is a superadmin, and the
  -- SELF_TARGET check means caller <> target -- so whenever the target is a
  -- superadmin there are at least two, and `remaining` is never zero. The
  -- invariant "there is always at least one superadmin" is actually held by
  -- SELF_TARGET, not by this.
  --
  -- Kept because it costs one indexed count and becomes load-bearing the
  -- moment the guard above is loosened (say, letting moderators revoke).
  select count(*) into remaining
    from public.admins
   where revoked_at is null and role = 'superadmin' and user_id <> target_user;

  if remaining = 0 and exists (
    select 1 from public.admins
     where user_id = target_user and revoked_at is null and role = 'superadmin'
  ) then
    raise exception using errcode = 'P0001',
      message = 'Cannot revoke the last superadmin. Grant another one first.',
      detail  = 'LAST_SUPERADMIN';
  end if;

  -- Revoked, never deleted: the grant history is the audit trail.
  update public.admins
     set revoked_at = now(), reason = coalesce(revoke_reason, reason)
   where user_id = target_user and revoked_at is null;

  perform public.log_audit(caller, 'revoke_admin_role', 'user', target_user::text,
    jsonb_build_object('reason', revoke_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard counters
-- ---------------------------------------------------------------------------
create function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_admin();
  result jsonb;
begin
  select jsonb_build_object(
    'users',            (select count(*) from public.users),
    'suspendedUsers',   (select count(*) from public.users where subscription_status = 'suspended'),
    'paidUsers',        (select count(*) from public.users where plan <> 'free'),
    'profiles',         (select count(*) from public.profiles),
    'cardsTotal',       (select count(*) from public.cards),
    'cardsInventory',   (select count(*) from public.cards where status = 'inventory'),
    'cardsActive',      (select count(*) from public.cards where status = 'active'),
    'cardsLost',        (select count(*) from public.cards where status = 'lost'),
    'totalTaps',        (select coalesce(sum(tap_count), 0) from public.cards),
    'leads',            (select count(*) from public.leads),
    'admins',           (select count(*) from public.admins where revoked_at is null)
  ) into result;
  return result;
end;
$$;

-- These are the console API, so signed-in callers need EXECUTE; the guard
-- inside each one is what makes that safe. anon never gets it.
revoke all on function public.admin_register_card(text, public.card_skin)     from public, anon;
revoke all on function public.admin_delete_cards(uuid[])                      from public, anon;
revoke all on function public.admin_set_user_suspended(uuid, boolean)         from public, anon;
revoke all on function public.admin_grant_role(uuid, public.admin_role, text) from public, anon;
revoke all on function public.admin_revoke_role(uuid, text)                   from public, anon;
revoke all on function public.admin_dashboard_stats()                         from public, anon;

grant execute on function public.admin_register_card(text, public.card_skin)     to authenticated;
grant execute on function public.admin_delete_cards(uuid[])                      to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean)         to authenticated;
grant execute on function public.admin_grant_role(uuid, public.admin_role, text) to authenticated;
grant execute on function public.admin_revoke_role(uuid, text)                   to authenticated;
grant execute on function public.admin_dashboard_stats()                         to authenticated;
