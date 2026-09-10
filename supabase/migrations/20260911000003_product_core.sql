-- Phase 1: product core -- profiles, cards, properties, projects.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Applies salvaged decisions 1 and 2: `digitalCard` does NOT migrate. The
-- freeform designer's backgroundColor, textColor, cardBackgroundType,
-- cardGradientStart/End, theme (light|dark|glass|carbon), layout, showQrCode
-- and the drag-editing positions{header,qr,bio,contacts}{x,y,width,scale} are
-- deleted BY OMISSION here -- never created, rather than created and dropped
-- later. With zero profiles remaining there is nothing to back-fill and no
-- legacy values to translate. The whole object collapses to `skin`.
create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.users (id) on delete cascade,
  name              text not null,
  slug              text,
  profile_type      public.profile_type,

  -- DECISION (2026-09-11), the JSONB-vs-normalized line the plan flagged as
  -- lost: a nested object stays jsonb when it is *presentation payload* --
  -- rendered as a block, never filtered, sorted or joined on. It becomes a
  -- table when it is an *entity* the app queries independently. agent_info
  -- (with its nested education/experience/tech_stack/testimonials arrays) is
  -- payload: no query in convex/profiles.ts looks inside it. properties and
  -- projects are entities, and stay real tables below.
  agent_info        jsonb not null,
  layout_config     jsonb not null,

  -- Same rule: these four are profile-embedded content blocks, distinct from
  -- the properties/projects tables despite the similar names.
  products          jsonb not null default '[]'::jsonb,
  services          jsonb not null default '[]'::jsonb,
  property_listings jsonb not null default '[]'::jsonb,
  inline_projects   jsonb not null default '[]'::jsonb,

  skin              public.card_skin not null default 'charcoal',
  show_storefront   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- NOT CREATED, deliberately: `featuredProjects`. It is `v.array(v.string())`
-- in Convex -- untyped strings, unlike featuredProperties' real ids -- and all
-- four call sites write `[]` while nothing anywhere reads it. Porting it would
-- carry a dead column plus the question of what those strings were meant to be.

create unique index profiles_slug_lower_key
  on public.profiles (lower(slug)) where slug is not null;
create index profiles_owner_id_idx on public.profiles (owner_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- properties / projects
-- ---------------------------------------------------------------------------
create table public.properties (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users (id) on delete cascade,
  title       text not null,
  description text,
  -- `price` was v.number(), an IEEE double. Money in a float silently rounds;
  -- numeric does not.
  price       numeric(14,2) not null,
  status      public.property_status not null,
  type        public.property_type not null,
  images      text[] not null default '{}',
  floor_area  numeric(10,2),
  lot_area    numeric(10,2),
  floors      int,
  bedrooms    int,
  bathrooms   int,
  location    text,
  details_url text,
  -- was a bare string with no format enforced
  date_sold   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index properties_owner_id_idx on public.properties (owner_id);
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.users (id) on delete cascade,
  title          text not null,
  description    text,
  category       public.project_category not null,
  tags           text[] not null default '{}',
  images         text[] not null default '{}',
  external_url   text,
  case_study_url text,
  featured       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index projects_owner_id_idx on public.projects (owner_id);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- CARVE-OUT (re-identified 2026-09-11): `profiles.featuredProperties` was
-- `v.array(v.id("properties"))` -- an array of foreign keys, which Postgres
-- cannot constrain element-by-element. As a junction table each reference is a
-- real FK, so a deleted property cannot leave a dangling id behind on a
-- profile, and `position` makes the ordering explicit instead of implied by
-- array index.
create table public.profile_featured_properties (
  profile_id  uuid not null references public.profiles (id)   on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  position    int  not null default 0,
  primary key (profile_id, property_id)
);
create index pfp_profile_idx on public.profile_featured_properties (profile_id, position);

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
-- CARVE-OUT (re-identified 2026-09-11): owner_id is NULLABLE here, where
-- Convex had it required.
--
-- convex/admin.ts:447 mints inventory stock with `ownerId: adminUser._id` and
-- warns in a comment: "do not use ownerId as an ownership gate for unactivated
-- stock." That warning is load-bearing, and under RLS it becomes dangerous:
-- the obvious policy `auth.uid() = owner_id` would hand every unclaimed card
-- in the factory to whichever admin happened to mint it, and any reviewer
-- reading that policy would think it correct.
--
-- Nullable owner_id makes the invariant true instead of merely documented:
-- unclaimed means unowned, so `auth.uid() = owner_id` says exactly what it
-- appears to say. The CHECK stops the two columns drifting apart.
create table public.cards (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references public.users (id) on delete set null,
  uuid              text not null,
  activation_code   text not null,
  status            public.card_status not null default 'inventory',
  linked_profile_id uuid references public.profiles (id) on delete set null,
  skin              public.card_skin not null default 'charcoal',
  tap_count         int not null default 0 check (tap_count >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint cards_inventory_is_unowned check (
    (status = 'inventory' and owner_id is null and linked_profile_id is null)
    or
    (status <> 'inventory' and owner_id is not null)
  ),

  -- The tap path lowercases and trims before lookup (convex/cards.ts:172).
  -- Enforcing the same shape on write means a mixed-case row can never be
  -- created and then silently fail every lookup against a card that is
  -- physically in a customer hand.
  constraint cards_uuid_normalized check (uuid = lower(btrim(uuid)) and uuid <> '')
);

create unique index cards_uuid_key            on public.cards (uuid);
create unique index cards_activation_code_key on public.cards (activation_code);
create index        cards_owner_id_idx        on public.cards (owner_id);

create trigger cards_set_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The anonymous tap path
-- ---------------------------------------------------------------------------
-- CARVE-OUT (re-identified 2026-09-11): `cards` is NOT readable by anon, and
-- the public tap goes through a definer function instead.
--
-- convex/cards.ts:170 `getCardByUuid` is a public query that deliberately
-- returns a narrowed projection -- id, uuid, status, linkedProfileId -- and
-- withholds activation_code, owner_id and tap_count. RLS is row-level: a
-- policy that lets anon read the row lets anon read ACTIVATION CODES, which
-- are what convert an inventory card into somebody card. Column grants could
-- express it, but then the projection lives in two places and PostgREST will
-- happily expose whatever is granted.
--
-- This function is the whole anon surface, and it returns exactly the four
-- fields the Convex query returned. Anything else stays behind RLS.
create function public.resolve_card_for_tap(card_uuid text)
returns table (id uuid, uuid text, status public.card_status, linked_profile_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.uuid, c.status, c.linked_profile_id
  from public.cards c
  where c.uuid = lower(btrim(card_uuid))
$$;

-- Tap counting. A definer function for the same reason: incrementing a counter
-- on a row the caller cannot see is otherwise impossible without opening the
-- table. Returns nothing so it cannot be used as an existence oracle beyond
-- what resolve_card_for_tap already exposes.
--
-- NOTE: convex/cards.ts:189 rate-limits this at 20/min per card. That limit
-- moves with the rate_limits table in a later Phase 1 migration; until then
-- this is uncapped, which inflates a vanity counter and nothing else.
create function public.record_card_tap(card_uuid text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.cards
     set tap_count = tap_count + 1
   where uuid = lower(btrim(card_uuid))
     and status = 'active'
$$;

revoke all on function public.resolve_card_for_tap(text) from public;
revoke all on function public.record_card_tap(text)      from public;
grant execute on function public.resolve_card_for_tap(text) to anon, authenticated;
grant execute on function public.record_card_tap(text)      to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
revoke all on public.profiles                     from anon, authenticated;
revoke all on public.properties                   from anon, authenticated;
revoke all on public.projects                     from anon, authenticated;
revoke all on public.profile_featured_properties  from anon, authenticated;
revoke all on public.cards                        from anon, authenticated;

-- Profiles, properties and projects are PUBLICLY READABLE by design: the whole
-- product is a card handed to a stranger, and /t/<uuid> renders for someone
-- who is not signed in. This is not a leak, it is the feature. Note it means
-- agent_info (phone, email) is public -- which is what a business card is.
grant select on public.profiles                    to anon, authenticated;
grant select on public.properties                  to anon, authenticated;
grant select on public.projects                    to anon, authenticated;
grant select on public.profile_featured_properties to anon, authenticated;

grant insert, update, delete on public.profiles                    to authenticated;
grant insert, update, delete on public.properties                  to authenticated;
grant insert, update, delete on public.projects                    to authenticated;
grant insert, update, delete on public.profile_featured_properties to authenticated;

-- cards: no anon grant at all (see the definer functions above), and no
-- INSERT for ordinary users -- stock is minted by the factory. Claiming is a
-- privileged transition and lands with the claim function in Phase 2.
grant select, update on public.cards to authenticated;

alter table public.profiles                    enable row level security;
alter table public.properties                  enable row level security;
alter table public.projects                    enable row level security;
alter table public.profile_featured_properties enable row level security;
alter table public.cards                       enable row level security;

-- Read: everyone. Write: owner only, and `with check` on the owner column is
-- what stops a user inserting a row that claims to belong to someone else.
create policy profiles_select_public on public.profiles
  for select to anon, authenticated using (true);
create policy profiles_write_own on public.profiles
  for all to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

create policy properties_select_public on public.properties
  for select to anon, authenticated using (true);
create policy properties_write_own on public.properties
  for all to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

create policy projects_select_public on public.projects
  for select to anon, authenticated using (true);
create policy projects_write_own on public.projects
  for all to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

-- The junction carries no owner of its own, so ownership is read through the
-- profile it belongs to. Without the EXISTS, any authenticated user could
-- attach a property to a profile that is not theirs.
create policy pfp_select_public on public.profile_featured_properties
  for select to anon, authenticated using (true);
create policy pfp_write_via_profile on public.profile_featured_properties
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_id and (p.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = profile_id and (p.owner_id = auth.uid() or public.is_admin())
  ));

-- Cards are private to their claimant. Inventory rows have owner_id IS NULL,
-- and `auth.uid() = owner_id` is never true for NULL -- so unclaimed stock is
-- invisible to every ordinary user, which is the point of the nullable column
-- above.
create policy cards_select_own on public.cards
  for select to authenticated
  using (auth.uid() = owner_id or public.is_admin());
create policy cards_update_own on public.cards
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

comment on function public.resolve_card_for_tap(text) is
  'The entire anonymous read surface for cards. Mirrors convex getCardByUuid projection.';
comment on table public.cards is
  'owner_id IS NULL means unclaimed inventory. See cards_inventory_is_unowned.';
