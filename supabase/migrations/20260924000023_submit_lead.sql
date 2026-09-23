-- Lead submission moves behind the server. Ports convex/leads.ts createLead.
--
-- REGRESSION FIXED HERE: the port kept the length caps but lost the rate
-- limit. leads_insert_anyone (20260911000005) is `with check (true)` for anon,
-- so any script could fill any owner's inbox as fast as PostgREST would take
-- the rows. Convex bounded that twice (convex/leads.ts:37-38):
--
--   VISITOR_MAX 5/min          per visitor, so one person cannot spam
--   OWNER_AGGREGATE_MAX 30/min per owner, the backstop when the visitor key
--                              is rotated on every request
--
-- It also sent the owner an email for each lead, which the direct insert had
-- no way to do: the owner's address is exactly what an anonymous submitter
-- must never be able to read.
--
-- Both need a server in the loop, so submission becomes this function, which
-- ONLY service_role may call -- the /api/leads route handler is its sole
-- caller. That is what lets it return the owner's email: the only party that
-- ever sees the return value is our own server, which uses it to send mail.
--
-- The visitor key is the client IP as the route sees it. Convex used a
-- browser-minted id, which its own comment concedes "a scripted attacker can
-- trivially rotate". An IP is not unforgeable either, but on Vercel the
-- platform overwrites x-forwarded-for, so rotating it takes real addresses.
--
-- self_capture is the owner entering leads into their own inbox (offline
-- capture at an event). No limit applies -- a limit that protects someone
-- from themselves would only reject a queued backlog on reconnect -- and the
-- route skips the email, since nobody needs mail about a lead they just typed.

create function public.submit_lead(
  lead_owner       uuid,
  inquirer_name    text,
  inquirer_contact text,
  message          text default null,
  property_id      uuid default null,
  property_name    text default null,
  visitor_key      text default null,
  self_capture     boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_row     public.users;
  new_id        uuid;
  clean_name    text := btrim(coalesce(inquirer_name, ''));
  clean_contact text := btrim(coalesce(inquirer_contact, ''));
begin
  select * into owner_row from public.users where id = lead_owner;

  -- A suspended owner's profile is hidden from the public, so an inquiry
  -- addressed to one did not come from a real visitor. Same answer as a
  -- missing owner: distinguishing them would reveal who is suspended.
  if owner_row.id is null or owner_row.subscription_status = 'suspended' then
    raise exception using errcode = 'P0001',
      message = 'Invalid recipient', detail = 'INVALID_RECIPIENT';
  end if;

  if clean_name = '' or clean_contact = '' then
    raise exception using errcode = 'P0001',
      message = 'Name and contact are required', detail = 'MISSING_FIELDS';
  end if;

  if not self_capture then
    perform public.check_rate_limit(
      'lead:' || lead_owner::text || ':' || coalesce(nullif(visitor_key, ''), 'anon'), 5, 60);
    perform public.check_rate_limit('lead:' || lead_owner::text, 30, 60);
  end if;

  -- Truncated at the edge, as Convex did with capLen: a real person who typed
  -- too much should have their inquiry arrive, not bounce. The table CHECKs
  -- still reject anything that reaches the table some other way.
  insert into public.leads
    (owner_id, inquirer_name, inquirer_contact, message, property_id, property_name)
  values (
    lead_owner,
    left(clean_name, 120),
    left(clean_contact, 200),
    left(nullif(btrim(submit_lead.message), ''), 2000),
    submit_lead.property_id,
    left(nullif(btrim(submit_lead.property_name), ''), 200))
  returning id into new_id;

  return jsonb_build_object(
    'leadId',     new_id,
    'ownerEmail', owner_row.email,
    'ownerName',  owner_row.name);
end;
$$;

revoke all on function public.submit_lead(uuid, text, text, text, uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.submit_lead(uuid, text, text, text, uuid, text, text, boolean)
  to service_role;

-- With submission behind the route, a direct insert is only a way around the
-- rate limit. Leads now have no client-side insert path at all.
drop policy leads_insert_anyone on public.leads;
revoke insert on public.leads from anon, authenticated;
