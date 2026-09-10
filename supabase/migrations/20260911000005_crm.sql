-- Phase 1: CRM -- leads, notifications, audit_logs.

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
-- CARVE-OUT (re-identified 2026-09-11): leads are the one table an ANONYMOUS
-- visitor writes to. convex/leads.ts:162 exposes `createLead` as a public
-- action -- the inquiry form on a public profile is submitted by someone who
-- is, by definition, not signed in.
--
-- The length caps mirror convex/leads.ts:10-13 (MAX_NAME 120, MAX_CONTACT 200,
-- MAX_MESSAGE 2000, MAX_PROPERTY_NAME 200). There they are applied by capLen,
-- which TRUNCATES; here they REJECT. That difference is deliberate: truncation
-- is right at the edge where a real person is typing, but a constraint exists
-- to stop a writer that bypassed the edge entirely, and silently storing a
-- truncated row would hide that it happened.
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.users (id) on delete cascade,
  -- The property can be deleted while the inquiry about it stays meaningful,
  -- which is why property_name is denormalized alongside the FK.
  property_id       uuid references public.properties (id) on delete set null,
  property_name     text check (length(property_name) <= 200),
  inquirer_name     text not null check (length(inquirer_name)    between 1 and 120),
  inquirer_contact  text not null check (length(inquirer_contact) between 1 and 200),
  message           text check (length(message) <= 2000),
  status            public.lead_status not null default 'new',
  last_contacted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index leads_owner_created_idx on public.leads (owner_id, created_at desc);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       public.notification_type not null,
  read       boolean not null default false,
  title      text not null,
  message    text not null,
  link       text,
  data       jsonb,
  created_at timestamptz not null default now()
);
-- Matches the by_user_read index Convex carried, for the unread badge.
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where not read;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  action        text not null,
  resource_type text not null,
  resource_id   text not null,
  changes       jsonb,
  -- text, NOT inet, on purpose. inet is the better type right up until the
  -- proxy hands over something unparseable ("unknown", a comma-joined
  -- X-Forwarded-For chain) -- at which point a stricter type REJECTS the write
  -- and destroys the audit record over a malformed field. An audit log that
  -- can refuse to record is worse than one holding an odd string.
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index audit_logs_user_idx     on public.audit_logs (user_id, created_at desc);
create index audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index audit_logs_created_idx  on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Lead -> notification fan-out
-- ---------------------------------------------------------------------------
-- convex/leads.ts:131 inserts the owner's notification in the same mutation
-- that inserts the lead. A trigger keeps that atomic without granting the
-- anonymous submitter any rights over `notifications` -- which would otherwise
-- let a stranger post arbitrary notifications to any user.
--
-- security definer for that reason; search_path pinned for the reason given in
-- 20260911000002.
create function public.notify_owner_of_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, read, title, message, link, data)
  values (
    new.owner_id, 'new_lead', false, 'New Lead Inquiry',
    new.inquirer_name || ' has sent you a message!',
    '/dashboard/leads',
    jsonb_build_object('leadId', new.id, 'inquirerName', new.inquirer_name)
  );
  return new;
end;
$$;

create trigger leads_notify_owner
  after insert on public.leads
  for each row execute function public.notify_owner_of_lead();

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
revoke all on public.leads         from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.audit_logs    from anon, authenticated;

-- Anon may INSERT a lead and nothing else -- no SELECT, so the inquiry form
-- cannot be turned into a reader of anyone's inbox.
--
-- The COLUMN list is the security boundary here, not the policy: without it an
-- anonymous submitter could set `status` (filing an inquiry pre-marked
-- 'closed', so it never shows as new) or backdate `created_at` to bury itself
-- at the bottom of the list. They may write only the fields a contact form
-- actually collects.
grant insert (owner_id, property_id, property_name, inquirer_name, inquirer_contact, message)
  on public.leads to anon, authenticated;
grant select on public.leads to authenticated;
grant update (status, last_contacted_at) on public.leads to authenticated;
grant delete on public.leads to authenticated;

grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

grant select on public.audit_logs to authenticated;

alter table public.leads         enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs    enable row level security;

-- NOTE for Phase 4: the Free-plan lead cap is NOT expressed here, and must not
-- be. convex/leads.ts:118 states the rule -- leads are ALWAYS captured
-- regardless of plan; the Free plan limits only how many are VIEWABLE. That is
-- an ordered-and-limited read concern belonging to getLeads. Encoding it as a
-- policy would make rows vanish from every query including the ones that count
-- and export them, turning a display cap into silent data loss.
create policy leads_insert_anyone on public.leads
  for insert to anon, authenticated
  with check (true);
create policy leads_select_own on public.leads
  for select to authenticated
  using (auth.uid() = owner_id or public.is_admin());
create policy leads_update_own on public.leads
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());
create policy leads_delete_own on public.leads
  for delete to authenticated
  using (auth.uid() = owner_id or public.is_admin());

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

-- Append-only by construction: admins may read, and NO ROLE is granted INSERT,
-- UPDATE or DELETE. Writes arrive through definer functions and the
-- service-role key. A user who could edit the record of what they did is not
-- being audited.
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

comment on table public.audit_logs is
  'Append-only. No write grants to anon/authenticated by design.';
comment on table public.leads is
  'Anon may INSERT (public inquiry form) but never SELECT. Column grants bound what they may set.';
