-- Unexposes rls_auto_enable(), which is Supabase's, not ours.
--
-- Newer Supabase projects ship an event trigger (ensure_rls) that enables RLS
-- on every table created in public, backed by this SECURITY DEFINER function.
-- It was granted to PUBLIC by default, so the security advisor lists it among
-- the anon-callable definer functions -- the category that hid a real
-- enumeration oracle in this schema once (20260911000004).
--
-- Harmless in itself: it returns event_trigger, so a call over the API only
-- errors. Revoked so that list holds only functions meant to be public
-- (get_public_profile, resolve_card_for_tap, record_card_tap). Event triggers
-- fire regardless of EXECUTE, so RLS auto-enabling is unaffected.
--
-- Guarded: projects created before the feature do not have the function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
