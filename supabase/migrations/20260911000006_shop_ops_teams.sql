-- Phase 1 (final): shop, operational tables, and teams.

-- ---------------------------------------------------------------------------
-- Shop catalogue
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  description text,
  parent_id   uuid references public.product_categories (id) on delete set null,
  image       text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- A category that is its own parent renders as an infinite tree. Convex
  -- could not express this; one CHECK is cheaper than the guard clause it
  -- replaces. (Deeper cycles still need an application check.)
  constraint product_categories_no_self_parent check (parent_id is distinct from id)
);
create unique index product_categories_slug_key on public.product_categories (lower(slug));
create index product_categories_parent_idx on public.product_categories (parent_id);
create trigger product_categories_set_updated_at before update on public.product_categories
  for each row execute function public.set_updated_at();

create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null,
  description         text,
  category_id         uuid references public.product_categories (id) on delete set null,
  -- Prices are numeric, never float. See properties.price in
  -- 20260911000003 for the reasoning.
  base_price          numeric(12,2) not null check (base_price       >= 0),
  compare_at_price    numeric(12,2)          check (compare_at_price >= 0),
  cost_price          numeric(12,2)          check (cost_price       >= 0),
  sku                 text not null,
  barcode             text,
  inventory           int  not null default 0,
  low_stock_threshold int  not null default 0 check (low_stock_threshold >= 0),
  track_inventory     boolean not null default true,
  is_published        boolean not null default false,
  is_featured         boolean not null default false,
  tags                text[] not null default '{}',
  images              text[] not null default '{}',
  primary_image_index int not null default 0 check (primary_image_index >= 0),
  weight              numeric(10,3) check (weight >= 0),
  dimensions          jsonb,
  shipping_required   boolean not null default true,
  metadata            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index products_slug_key on public.products (lower(slug));
create unique index products_sku_key  on public.products (upper(sku));
create index products_category_idx    on public.products (category_id);
create index products_published_idx   on public.products (is_published) where is_published;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variations (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name       text not null,
  sku        text not null,
  price      numeric(12,2) not null check (price >= 0),
  inventory  int not null default 0,
  options    jsonb not null default '[]'::jsonb,
  image      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_variations_sku_key on public.product_variations (upper(sku));
create index product_variations_product_idx on public.product_variations (product_id);
create trigger product_variations_set_updated_at before update on public.product_variations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- carts
-- ---------------------------------------------------------------------------
-- CARVE-OUT (re-identified 2026-09-11): `guest_id` is NOT created.
--
-- Convex carts carried `userId OR guestId`, where guestId is a token the
-- browser mints itself (contexts/CartContext.tsx:53,
-- `guest_${Date.now()}_${random}`). Under RLS that is unprotectable: a
-- self-issued, guessable, unauthenticated identifier cannot be checked against
-- anything, so honouring it means letting anon read and write cart rows keyed
-- by a value the caller supplies -- i.e. an open table with a naming
-- convention in front of it.
--
-- It also no longer buys anything. With the payment gateway removed the cart
-- is an inquiry basket whose only outcome is an email, so a signed-out
-- shopper's basket can live entirely in localStorage and never touch the
-- database. Server-side carts remain for signed-in users, where the row has a
-- real owner and the ordinary ownership policy applies.
--
-- Phase 4 note: CartContext must stop persisting guest baskets and keep them
-- local until sign-in, at which point the local basket merges into the row.
create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One cart per user: Convex allowed several and the code simply took the
-- first, so a second cart was invisible inventory of someone's intent.
create unique index carts_user_key on public.carts (user_id);
create trigger carts_set_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Operational tables
-- ---------------------------------------------------------------------------
-- `is_public` is new. convex/settings.ts:81 exposes getShopSettings as a
-- PUBLIC query (the storefront reads tax and shipping), but `settings` is a
-- generic key/value table that will accumulate keys which are not public. A
-- blanket anon read would leak each new one the day it is added -- failing
-- open, silently, for a key nobody thought about. The flag defaults to FALSE,
-- so a new setting is private until somebody deliberately publishes it.
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- Infrastructure, not user data. No role except service_role and definer
-- functions ever touches it: a rate limiter the client can read tells an
-- attacker exactly how much budget is left, and one the client can write is
-- not a rate limiter.
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 0
);

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  owner_id     uuid not null references public.users (id) on delete cascade,
  seats        int not null default 1 check (seats > 0),
  logo_url     text,
  accent_color text,
  company_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index teams_owner_idx on public.teams (owner_id);
create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

-- Deferred from 20260911000002 because users and teams reference each other:
-- users.team_id needs teams to exist, teams.owner_id needs users to exist.
alter table public.users
  add column team_id uuid references public.teams (id) on delete set null;
create index users_team_idx on public.users (team_id);

-- Deliberately NOT added to the column grants in 20260911000002. If a user
-- could write their own team_id they could join any team by guessing a uuid,
-- and team membership is what team-scoped reads key on. Membership changes go
-- through the invite flow.

create table public.team_invites (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  email      text not null,
  invited_by uuid not null references public.users (id) on delete cascade,
  status     public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One live invite per address per team, so re-inviting updates rather than
-- accumulating duplicates that all have to be revoked separately.
create unique index team_invites_pending_key
  on public.team_invites (team_id, lower(email)) where status = 'pending';
create index team_invites_email_idx on public.team_invites (lower(email));
create trigger team_invites_set_updated_at before update on public.team_invites
  for each row execute function public.set_updated_at();

-- Reading the caller's team means reading public.users, whose own policy would
-- be evaluated inside the teams policy. Definer, for the same
-- termination-and-clarity reason as is_admin().
create function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.team_id from public.users u where u.id = auth.uid()
$$;
revoke execute on function public.current_team_id() from public, anon;
grant  execute on function public.current_team_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
revoke all on public.product_categories from anon, authenticated;
revoke all on public.products           from anon, authenticated;
revoke all on public.product_variations from anon, authenticated;
revoke all on public.carts              from anon, authenticated;
revoke all on public.settings           from anon, authenticated;
revoke all on public.rate_limits        from anon, authenticated;
revoke all on public.teams              from anon, authenticated;
revoke all on public.team_invites       from anon, authenticated;

grant select on public.product_categories to anon, authenticated;
grant select on public.products           to anon, authenticated;
grant select on public.product_variations to anon, authenticated;
grant select on public.settings           to anon, authenticated;

grant insert, update, delete on public.product_categories to authenticated;
grant insert, update, delete on public.products           to authenticated;
grant insert, update, delete on public.product_variations to authenticated;
grant select, insert, update, delete on public.carts        to authenticated;
grant insert, update, delete on public.settings           to authenticated;
grant select, insert, update, delete on public.teams        to authenticated;
grant select, insert, update, delete on public.team_invites to authenticated;

alter table public.product_categories enable row level security;
alter table public.products           enable row level security;
alter table public.product_variations enable row level security;
alter table public.carts              enable row level security;
alter table public.settings           enable row level security;
alter table public.rate_limits        enable row level security;
alter table public.teams              enable row level security;
alter table public.team_invites       enable row level security;

-- Catalogue: the storefront is public, but only PUBLISHED products are. An
-- unpublished product is a draft -- price experiments, unreleased skins -- and
-- `is_published` is the line. Admins see everything.
create policy product_categories_select_active on public.product_categories
  for select to anon, authenticated using (is_active or public.is_admin());
create policy product_categories_write_admin on public.product_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_select_published on public.products
  for select to anon, authenticated using (is_published or public.is_admin());
create policy products_write_admin on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A variation inherits its parent's visibility. Without the EXISTS, an
-- unpublished product's prices leak through its variations.
create policy product_variations_select_published on public.product_variations
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and (p.is_published or public.is_admin())
  ));
create policy product_variations_write_admin on public.product_variations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy carts_own on public.carts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy settings_select_public on public.settings
  for select to anon, authenticated
  using (is_public or public.is_admin());
create policy settings_write_admin on public.settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- rate_limits: RLS enabled with NO policy at all. That is the strictest
-- possible state -- every row is invisible to every role that is not
-- BYPASSRLS. service_role and definer functions still reach it.

create policy teams_select_member on public.teams
  for select to authenticated
  using (id = public.current_team_id() or owner_id = auth.uid() or public.is_admin());
create policy teams_write_owner on public.teams
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- An invitee is identified by the email on their JWT, which is the only thing
-- tying a signed-in user to an invitation addressed to an address.
create policy team_invites_select_own on public.team_invites
  for select to authenticated
  using (
    lower(email) = lower(auth.jwt() ->> 'email')
    or exists (select 1 from public.teams t
               where t.id = team_id and t.owner_id = auth.uid())
    or public.is_admin()
  );
create policy team_invites_write_owner on public.team_invites
  for all to authenticated
  using (exists (select 1 from public.teams t
                 where t.id = team_id and t.owner_id = auth.uid()) or public.is_admin())
  with check (exists (select 1 from public.teams t
                      where t.id = team_id and t.owner_id = auth.uid()) or public.is_admin());

comment on table public.rate_limits is
  'RLS enabled with no policies: unreachable except via service_role/definer. Intentional.';
comment on column public.settings.is_public is
  'Defaults false so a new setting is private until deliberately published.';
comment on table public.carts is
  'Signed-in users only. Guest baskets live in localStorage -- see migration header.';
