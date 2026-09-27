-- Consent on the lead form (L-8, 2026-09-27).
--
-- Under RA 10173 a visitor's details are collected on their consent. The
-- public form now asks for it and /api/leads refuses a visitor submission
-- without it; this records, per lead, when consent was given and to which
-- wording, so the owner (the personal information controller for leads) can
-- show it later.
--
-- Backward compatible on purpose: both columns are nullable and the new
-- submit_lead parameter defaults to null, so the code already deployed keeps
-- working between this migration and the next deploy. Enforcement lives in
-- the route, the function's only caller (service_role only).

alter table public.leads
  add column consent_at      timestamptz,
  add column consent_version text check (length(consent_version) <= 40);

drop function public.submit_lead(uuid, text, text, text, uuid, text, text, boolean);

create function public.submit_lead(
  lead_owner       uuid,
  inquirer_name    text,
  inquirer_contact text,
  message          text default null,
  property_id      uuid default null,
  property_name    text default null,
  visitor_key      text default null,
  self_capture     boolean default false,
  consent_version  text default null
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
  clean_consent text := left(nullif(btrim(coalesce(submit_lead.consent_version, '')), ''), 40);
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

  insert into public.leads
    (owner_id, inquirer_name, inquirer_contact, message, property_id, property_name,
     consent_at, consent_version)
  values (
    lead_owner,
    left(clean_name, 120),
    left(clean_contact, 200),
    left(nullif(btrim(submit_lead.message), ''), 2000),
    submit_lead.property_id,
    left(nullif(btrim(submit_lead.property_name), ''), 200),
    case when clean_consent is not null then now() end,
    clean_consent)
  returning id into new_id;

  return jsonb_build_object(
    'leadId',     new_id,
    'ownerEmail', owner_row.email,
    'ownerName',  owner_row.name);
end;
$$;

revoke all on function public.submit_lead(uuid, text, text, text, uuid, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.submit_lead(uuid, text, text, text, uuid, text, text, boolean, text)
  to service_role;
