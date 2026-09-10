-- Correct admin_delete_cards to match the behaviour it replaced.
--
-- 20260911000014 got this wrong twice, and described the Convex original
-- inaccurately while doing so. convex/admin.ts:470 does NOT delete whatever it
-- is given:
--
--   1. it SKIPS active cards and reports them back as skippedIds, so a mixed
--      selection partially succeeds instead of failing whole. The console
--      relies on that -- it renders "Deleted N. Skipped M active card(s) --
--      unpair them first." Throwing turns a partial success into a dead end
--      and leaves the operator guessing which row was the problem.
--
--   2. it DOES delete "lost" cards, deliberately. The comment there explains
--      why: a lost card has been reported physically gone and cannot come back
--      through the normal unpair flow, so hard-deleting it is the only way to
--      clear it. Refusing everything that is not inventory removed a working
--      admin path.
--
-- Only ACTIVE is protected, and that protection is the real point: an active
-- card is a physical object in a customer hand, and deleting its row does not
-- recall the object -- it orphans their tag with no way to restore the link.
--
-- DROP then CREATE, not CREATE OR REPLACE: the return type changes from int to
-- jsonb, and Postgres will not replace a function whose signature differs in
-- its result type.
drop function if exists public.admin_delete_cards(uuid[]);

create function public.admin_delete_cards(card_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller  uuid := public.require_admin();
  skipped uuid[];
  removed int;
begin
  select coalesce(array_agg(id), '{}')
    into skipped
    from public.cards
   where id = any(card_ids) and status = 'active';

  delete from public.cards
   where id = any(card_ids) and status <> 'active';
  get diagnostics removed = row_count;

  perform public.log_audit(caller, 'delete_cards', 'card',
    array_to_string(card_ids, ','),
    jsonb_build_object(
      'deletedCount', removed,
      'requested',    coalesce(array_length(card_ids, 1), 0),
      'skipped',      coalesce(array_length(skipped, 1), 0)));

  return jsonb_build_object(
    'success',        true,
    'deletedCount',   removed,
    'totalRequested', coalesce(array_length(card_ids, 1), 0),
    'skippedIds',     to_jsonb(skipped));
end;
$$;

revoke all on function public.admin_delete_cards(uuid[]) from public, anon;
grant execute on function public.admin_delete_cards(uuid[]) to authenticated;
