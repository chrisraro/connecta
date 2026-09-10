-- Align admin_dashboard_stats with the console it feeds, and add the two
-- counters it needs that the first version did not compute.
--
-- lowStockCount and newLeads are the ones that actually drive action in the
-- console: the first tells an operator to reorder, the second is the unworked
-- inbox. Counting them in the same statement as everything else means the
-- dashboard shows one consistent instant rather than a set of numbers read at
-- slightly different times.
--
-- Naming matches the page rather than the table columns. The alternative was
-- renaming in the client, which puts the mapping somewhere nobody looks when
-- a number turns out wrong.
create or replace function public.admin_dashboard_stats()
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
    'totalUsers',     (select count(*) from public.users),
    'suspendedUsers', (select count(*) from public.users where subscription_status = 'suspended'),
    'paidUsers',      (select count(*) from public.users where plan <> 'free'),
    'totalProfiles',  (select count(*) from public.profiles),
    'totalCards',     (select count(*) from public.cards),
    'inventoryCards', (select count(*) from public.cards where status = 'inventory'),
    'activeCards',    (select count(*) from public.cards where status = 'active'),
    'lostCards',      (select count(*) from public.cards where status = 'lost'),
    'totalTaps',      (select coalesce(sum(tap_count), 0) from public.cards),
    'totalLeads',     (select count(*) from public.leads),
    -- Two different questions, deliberately both answered. newLeads7d is
    -- recent VOLUME (the console labels it "New Leads (7d)"); newLeads is the
    -- UNWORKED inbox, which does not shrink with time and is the one that
    -- means somebody has to do something.
    'newLeads7d',     (select count(*) from public.leads
                        where created_at > now() - interval '7 days'),
    'newLeads',       (select count(*) from public.leads where status = 'new'),
    -- Only counts products that actually track inventory; an untracked
    -- product has no stock level to be low.
    'lowStockCount',  (select count(*) from public.products
                        where track_inventory and inventory <= low_stock_threshold),
    'admins',         (select count(*) from public.admins where revoked_at is null)
  ) into result;
  return result;
end;
$$;
