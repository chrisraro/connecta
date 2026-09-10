-- Releasing cards, and the account-deletion path that depends on it.
--
-- BUG FIXED HERE: deleting a user who held an active card failed outright.
--
--   ERROR: new row for relation "cards" violates check constraint
--          "cards_inventory_is_unowned"
--
-- cards.owner_id is ON DELETE SET NULL, and cards_inventory_is_unowned
-- (20260911000003) requires a non-inventory card to HAVE an owner. So the FK
-- action produced exactly the row the CHECK forbids, and the whole delete
-- aborted. Account deletion was impossible for anyone who had ever claimed a
-- card -- which is every real customer.
--
-- The fix is the behaviour the product already documented: convex/users.ts and
-- maintenance.ts return an active or linked card to INVENTORY rather than
-- hard-deleting it, because the physical object still exists and can be
-- reissued. Doing that in a BEFORE DELETE trigger means the card is already
-- unowned by the time the FK action runs, so there is nothing for the CHECK to
-- object to.

create function public.release_cards_on_user_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cards
     set status            = 'inventory',
         owner_id          = null,
         linked_profile_id = null,
         tap_count         = 0
   where owner_id = old.id;
  return old;
end;
$$;

create trigger users_release_cards
  before delete on public.users
  for each row execute function public.release_cards_on_user_delete();

revoke all on function public.release_cards_on_user_delete() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Unclaiming
-- ---------------------------------------------------------------------------
-- Returns a card to stock. Definer because the transition writes columns the
-- owner policy would allow individually but which must move together: leaving
-- owner_id set with status 'inventory' (or the reverse) is precisely what the
-- CHECK rejects, so a client doing this in two steps would fail on the first.
--
-- tap_count resets to zero. The counter belongs to the pairing, not the
-- plastic -- carrying a previous owner tally onto the next person would be
-- both wrong and a small privacy leak about the card history.
create function public.unclaim_card(card_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.cards;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in.', detail = 'UNAUTHORIZED';
  end if;

  select * into target from public.cards where id = card_id for update;
  if target.id is null then
    raise exception using errcode = 'P0001',
      message = 'Card not found.', detail = 'CARD_NOT_FOUND';
  end if;

  if target.owner_id is distinct from caller then
    -- Deliberately the same message as not-found: confirming that a card
    -- exists but belongs to somebody else is an oracle for card ids.
    raise exception using errcode = 'P0001',
      message = 'Card not found.', detail = 'CARD_NOT_FOUND';
  end if;

  update public.cards
     set status = 'inventory', owner_id = null, linked_profile_id = null, tap_count = 0
   where id = card_id;
end;
$$;

revoke all on function public.unclaim_card(uuid) from public, anon;
grant execute on function public.unclaim_card(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Account deletion
-- ---------------------------------------------------------------------------
-- Deletes the caller public.users row, which cascades to their profiles,
-- properties, projects, leads, notifications, cart and team, and releases
-- their cards through the trigger above.
--
-- It deliberately does NOT delete the auth.users row. Removing an identity is
-- an auth-server operation that needs the service-role key, and doing half of
-- it from a definer function would leave a signed-in session whose application
-- record has vanished -- every page rendering as though the account were brand
-- new. The route handler that calls this finishes the job with the admin API
-- and then signs the person out.
--
-- Returns what was removed so the UI can confirm specifics rather than a bare
-- "done", which is worth something when the action is irreversible.
create function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller   uuid := auth.uid();
  counts   jsonb;
  released int;
begin
  if caller is null then
    raise exception using errcode = 'P0001',
      message = 'You must be signed in.', detail = 'UNAUTHORIZED';
  end if;

  select jsonb_build_object(
    'profiles',      (select count(*) from public.profiles   where owner_id = caller),
    'properties',    (select count(*) from public.properties where owner_id = caller),
    'projects',      (select count(*) from public.projects   where owner_id = caller),
    'leads',         (select count(*) from public.leads      where owner_id = caller),
    'notifications', (select count(*) from public.notifications where user_id = caller)
  ) into counts;

  select count(*) into released from public.cards where owner_id = caller;

  delete from public.users where id = caller;

  return jsonb_build_object(
    'success', true,
    'deleted', counts,
    'cardsReleasedToInventory', released);
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
