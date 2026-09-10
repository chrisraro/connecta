-- Take the trigger functions off the public API surface.
--
-- PostgREST publishes every function in `public` as an RPC endpoint, and
-- Supabase's default privileges grant EXECUTE on each new one to anon and
-- authenticated (see 20260911000004 for how that bites). That leaves
-- /rest/v1/rpc/notify_owner_of_lead and /rest/v1/rpc/set_updated_at listed as
-- callable endpoints.
--
-- Neither is actually exploitable: Postgres refuses to invoke a function
-- returning `trigger` outside a trigger context, so a direct call fails before
-- the body runs. This is housekeeping, not a fix -- but an advertised endpoint
-- that errors is still an invitation to probe, and notify_owner_of_lead is
-- SECURITY DEFINER, so it is exactly the kind of thing that should not be
-- listed at all.
--
-- Safe because Postgres checks EXECUTE on a trigger function at CREATE TRIGGER
-- time, not on each firing. The accompanying test asserts both triggers still
-- work after this runs, rather than taking that on trust.
revoke all on function public.notify_owner_of_lead() from public, anon, authenticated;
revoke all on function public.set_updated_at()       from public, anon, authenticated;
