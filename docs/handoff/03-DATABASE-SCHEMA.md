# Database Schema

Source of truth: `convex/schema.ts` (20 tables, `convex/schema.ts:1-472`, as of commit `4116d50`).
All fields, types, and indexes below are transcribed directly from that file — line numbers are cited
so you can diff this doc against the schema yourself if it changes.

Convex convention used throughout: every table gets an implicit `_id` (of type `Id<"tableName">`) and
`_creationTime` (number, ms epoch) that are not declared in `schema.ts` but always exist. They are
omitted from the field lists below since they're not table-specific.

Dead-field findings are pulled from `.superpowers/sdd/audit-dataflow.md` (a read-only data-flow audit
that cross-referenced schema, every writer/reader in `app/`+`components/`+`convex/`, and live rows
pulled from the `dev:nautical-tortoise-962` deployment — the one actually serving real traffic, see
`docs/handoff/02-TECH-STACK.md` Trap 3). **Do not build new features on a field flagged DEAD below
without first reading the cited audit section** — several of them look like real fields with real types
but are never populated or never read.

---

## `users` (`convex/schema.ts:5-41`)

Indexes: `by_clerkId(clerkId)`, `by_teamId(teamId)`.

| Field | Type | Optional | Notes |
|---|---|---|---|
| `email` | `string` | no | |
| `clerkId` | `string` | no | FK-equivalent to Clerk's user id; indexed, this is how every Convex function resolves "who is calling" |
| `name` | `string` | yes | |
| `role` | `"agent" \| "admin"` | no | Coarse role. Fine-grained admin permissions live in the separate `admins` table below |
| `subscriptionStatus` | `string` | no | Free-text status string (not a literal union) |
| `plan` | `"free" \| "pro" \| "business"` | yes | |
| `planExpiresAt` | `number` | yes | ms epoch |
| `teamId` | `Id<"teams">` | yes | |
| `onboardingCompleted` | `boolean` | yes | |
| `onboardingData` | object (see below) | yes | A **full copy** of onboarding-wizard answers, not a reference. See "Known drift" below |
| `credits` | `number` | yes | **DEAD** — deprecated, see below |

`onboardingData` shape (`convex/schema.ts:15-27`): `profileCategory` (`"individual"\|"company"\|"business"`,
optional), `email` (optional), `fullName` (required string), `title` (required string), `company`
(optional), `phone` (required string), `website` (optional), `about` (optional), `avatarUrl` (optional),
`services: string[]` (required array), `socialLinks: {platform, url}[]` (optional array).

**DEAD: `credits`** (`convex/schema.ts:28-39`). Self-documented in-repo: the field comment says it was
part of the original schema, dropped from active use in commit `79d6e7c` without a data migration, and
is declared `v.optional` purely so existing rows with the old value still pass schema validation. The
audit checked all 13 live user rows and found **none still carry the field** — the migration
(`users:internalStripLegacyCredits`, `convex/users.ts:195-220`) has effectively already run or the field
never persisted on today's rows. Safe to delete the schema declaration outright.

**Known drift (not dead, but do not trust as current):** `onboardingData` is a snapshot copied once into
a `profiles` row at first-completion (`convex/users.ts:131-160`) and never synced afterward. The audit
found live accounts where `onboardingData.profileCategory` and the live profile's `profileType` disagree,
and one account where `onboardingData` has real typed answers but the linked `profiles` row's `agentInfo`
is entirely blank (created directly through the builder, bypassing onboarding —
`.superpowers/sdd/audit-dataflow.md:66-113`). Treat `profiles` as authoritative for anything currently
live; `onboardingData` is only reliable as a resume-prefill for an *in-progress* wizard.

---

## `cards` (`convex/schema.ts:43-52`)

Indexes: `by_uuid(uuid)`, `by_owner(ownerId)`, `by_activationCode(activationCode)`.

| Field | Type | Optional | Notes |
|---|---|---|---|
| `ownerId` | `Id<"users">` | no | |
| `uuid` | `string` | no | Printed on the physical NFC tag / QR code, resolves `/t/<uuid>` |
| `activationCode` | `string` | no | 6-character code used to activate a card |
| `status` | `"inventory" \| "active" \| "lost"` | no | |
| `linkedProfileId` | `Id<"profiles">` | yes | Set once the card is linked to a profile |
| `tapCount` | `number` | no | |

---

## `profiles` (`convex/schema.ts:54-160`)

Indexes: `by_owner(ownerId)`, `by_slug(slug)`.

Top-level fields:

| Field | Type | Optional | Notes |
|---|---|---|---|
| `ownerId` | `Id<"users">` | no | |
| `name` | `string` | no | Machine-generated as `"<fullName>'s Profile"` (`convex/users.ts:133`); an internal dashboard label, **never rendered to a public visitor** — `ProfileRenderer`/`StorefrontView` never read `data.name`. Minor, not urgent to remove |
| `slug` | `string` | yes | Vanity URL segment. **Only assigned by the builder's `createProfile`** (`convex/profiles.ts`); onboarding's direct insert path does not set it — see "Two creation paths" below |
| `profileType` | `"individual" \| "company" \| "business"` | yes | Selects initial theme/template defaults at creation time. The **public render path never reads it** — `ProfileRenderer.tsx` and `StorefrontView.tsx` both destructure props without `profileType`; the already-computed `componentOrder` (inside `layoutConfig`) is what actually drives the page |
| `agentInfo` | object, see below | no | The authoritative identity/content record for the profile |
| `digitalCard` | object, see below | yes | Theming for the separate digital-business-card surface (distinct from the public profile page — see "Two color systems" below) |
| `layoutConfig` | object, see below | no | Theming/ordering for the public profile page |
| `featuredProperties` | `Id<"properties">[]` | no (always `[]`) | **DEAD**, see below |
| `featuredProjects` | `string[]` | yes (always `[]`) | **DEAD**, see below |
| `products` | `{title, description, price?, image?, link?}[]` | yes | Storefront product catalog — alive, editable, rendered |
| `services` | `{title, description, price?, image?}[]` | yes | **DEAD (top-level)** — do not confuse with `agentInfo.services`, see below |
| `propertyListings` | `{title, description?, price?, location?, image?, status?, link?}[]` | yes | Alive — real-estate listing blocks, editable in the builder |
| `inlineProjects` | `{title, description?, category?, image?, link?}[]` | yes | Alive — portfolio project blocks, editable in the builder |
| `showStorefront` | `boolean` | yes | |

`agentInfo` shape (`convex/schema.ts:59-98`): `fullName`, `title`, `company`, `phone`, `email` (all
required strings), `additionalPhones?: string[]`, `additionalEmails?: string[]`, `address?: string`
(**DEAD**, see below), `website?`, `about?`, `avatarUrl?`, `socialLinks: {platform, url}[]` (required),
`services?: string[]` (the **alive** services field — simple tags, editable via the builder's Services
panel), `certification?: {title, description}`, `education?: {degree, school, year?}[]`,
`techStack?: {category, skills: string[]}[]`, `experience?: {title, company, period, description?}[]`,
`testimonials?: {quote, author, role?}[]`, `gallery?: string[]`.

`digitalCard` shape (`convex/schema.ts:99-114`): `backgroundColor`, `textColor` (strings, required),
`layout: "classic"|"split"|"centered"`, `showQrCode: boolean`, `theme: "light"|"dark"|"glass"|"carbon"`,
`cardBackgroundType: "solid"|"gradient"`, `cardGradientStart?`, `cardGradientEnd?`, `positions?` — a
nested object of optional `{x, y, width?, scale?}` blocks for `header`/`qr`/`bio`/`contacts`.

`layoutConfig` shape (`convex/schema.ts:115-126`): `themeId: string`, `colorPalette: {primary,
background, text, secondary?, accent?}`, `componentOrder: string[]`, `heroStyle: string`.

**DEAD: top-level `profiles.services`** (`convex/schema.ts:136-141`). A `ServiceItem[]` catalog shaped
like `products`, distinct from `agentInfo.services` (which is just string tags). Zero editor exists for
it — every builder save hardcodes it to `[]` (`app/dashboard/builder/page.tsx:873`). All 10 non-empty
live profiles confirm this: 0/10 have a populated value. `StorefrontView.tsx:76-90` contains a
dedup-merge shim that exists purely because this dead field overlaps in meaning with `agentInfo.services`
— that shim can be deleted once this field is.

**DEAD: `featuredProperties` / `featuredProjects`** (`convex/schema.ts:127-128`). Every writer sets them
to `[]` unconditionally (`convex/profiles.ts:254-255`, `convex/users.ts:158-159`,
`app/dashboard/builder/page.tsx:870-871`); the read side (`app/p/[id]/ProfileView.tsx:76-77`) hardcodes
`properties: [], projects: []` instead of passing them through; the backing `properties` and `projects`
tables have **zero rows** in production; `convex/projects.ts`'s full CRUD API has no caller anywhere.
All 10 live profile rows show `[]`/`[]` with no exception. The functionality these fields were meant for
is fully covered by the alive `propertyListings`/`inlineProjects` fields instead.

**DEAD: `agentInfo.address`** (`convex/schema.ts:67`). No `<Input>` bound to it anywhere in the builder
(only forwarded if already present on a loaded profile) and no template in `components/templates/` ever
reads it. One live profile carries a real address string that is permanently unreachable and unrendered.

**Two independent, contradictory color systems.** `layoutConfig.colorPalette` themes the public profile
page; `digitalCard` themes the separate digital-business-card surface. They are edited as fully unrelated
state (no default derivation from one another — `DEFAULT_DIGITAL_CARD` is a fixed constant). The audit
found live accounts where the two surfaces render in literally opposite palettes (one warm-cream page next
to a black card) because nothing seeds the card's colors from the page's. Not a schema bug — both fields
are legitimately needed — but a UX gap worth knowing about before you "fix" a bug report that's actually
this.

**Two entry points, one write path.** A profile can be created from onboarding or from the builder,
but both now funnel through the same helper, `insertNewProfile` (`convex/profiles.ts:162`), so the row
has the same shape either way — `assignUniqueSlug` runs unconditionally, and onboarding passes
`digitalCard: DEFAULT_DIGITAL_CARD` (`convex/users.ts:187`). The builder's `createProfile` calls it;
onboarding's completion branch calls it at `convex/users.ts:156`, directly under a comment naming this
as the Task 12 fix.

This was NOT always true, and the history matters because stale notes about it are still in circulation.
Before Task 12, onboarding ran its own parallel `ctx.db.insert("profiles", …)` that silently diverged:
no slug (so the public link was stuck at `/p/<convexId>`) and no `digitalCard`. Worse, that profile
already counted against the free plan's `maxProfiles: 1`, so the very next thing the product did — send
the user to the builder — hit the limit and failed the user's first ever save. See `insertNewProfile`'s
doc comment (`convex/profiles.ts:138-152`) for the full account.

What onboarding still does NOT set, because it has no UI for them: `products`, `propertyListings`,
`inlineProjects`, `showStorefront`. Those stay undefined until the owner edits in the builder — which is
correct, not a gap.

An idempotent migration exists for rows created before the fix: `profiles:internalBackfillSlugs`
(`convex/profiles.ts:293-368`), run via `npx convex run profiles:internalBackfillSlugs '{}'`, repeating
with the returned cursor until done. It was already run against the live deployment during Task 12
(1 of 11 profiles backfilled), so it should be a no-op now — but it is safe to re-run.

---

## `properties` (`convex/schema.ts:162-184`)

Index: `by_owner(ownerId)`.

**Table has zero rows in production and no writer anywhere outside test files — there isn't even a
`convex/properties.ts` module.** Kept alive only by the (also dead) `featuredProperties` FK on `profiles`
and `leads.propertyId`. See the `profiles.featuredProperties` dead-field entry above for the full
consolidation reasoning. Fields, for completeness: `ownerId: Id<"users">`, `title: string`,
`description?: string`, `price: number`, `status: "for-sale"|"for-rent"|"sold"`,
`type: "lot-only"|"house-lot"|"townhouse"|"condo"|"commercial"`, `images: string[]`,
`floorArea?/lotArea?/floors?/bedrooms?/bathrooms?: number`, `location?/detailsUrl?/dateSold?: string`.

---

## `projects` (`convex/schema.ts:186-208`)

Index: `by_owner(ownerId)`.

**Table has zero rows in production; the full CRUD API (`convex/projects.ts`:
`createProject`/`updateProject`/`deleteProject`/`getProjects`) has no caller anywhere in `app/` or
`components/`** (confirmed by grep in the audit). The only place a `projects` array appears in the
builder is a state variable with no setter (`app/dashboard/builder/page.tsx:438`). Fields, for
completeness: `ownerId: Id<"users">`, `title: string`, `description?: string`,
`category: "graphic-design"|"web-design"|"photography"|"video"|"branding"|"case-study"|"development"|"ui-ux"|"real-estate"|"other"`,
`tags: string[]`, `images: string[]`, `externalUrl?/caseStudyUrl?: string`, `featured: boolean`,
`createdAt: number`.

---

## `leads` (`convex/schema.ts:210-220`)

Index: `by_owner(ownerId)`.

| Field | Type | Optional | Notes |
|---|---|---|---|
| `ownerId` | `Id<"users">` | no | |
| `propertyId` | `Id<"properties">` | yes | **DEAD FK** — see below |
| `propertyName` | `string` | yes | **DEAD** — same reason |
| `inquirerName` | `string` | no | |
| `inquirerContact` | `string` | no | |
| `message` | `string` | yes | |
| `status` | `"new" \| "contacted" \| "closed"` | no | |
| `lastContactedAt` | `number` | yes | |
| `createdAt` | `number` | no | |

**DEAD: `propertyId` / `propertyName`.** Accepted by `createLead` (`convex/leads.ts:18-56`) and displayed
by the leads dashboard (always falling back to `"General Inquiry"`), but **none** of the three real call
sites (`StorefrontView.tsx:128-133`, the offline-lead-capture flow, `ContactSection.tsx:38`) ever pass
either field — a direct consequence of `properties` (above) having zero rows and no way to select one.
Sampled 10 live leads: none carry either field.

---

## `notifications` (`convex/schema.ts:222-231`)

Indexes: `by_user(userId)`, `by_user_read(userId, read)`.

| Field | Type | Optional |
|---|---|---|
| `userId` | `Id<"users">` | no |
| `type` | `"new_lead" \| "system"` | no |
| `read` | `boolean` | no |
| `title` | `string` | no |
| `message` | `string` | no |
| `link` | `string` | yes |
| `data` | `any` | yes |
| `createdAt` | `number` | no |

---

## `auditLogs` (`convex/schema.ts:233-244`)

Indexes: `by_user(userId)`, `by_resource(resourceType, resourceId)`, `by_timestamp(timestamp)`.

| Field | Type | Optional |
|---|---|---|
| `userId` | `Id<"users">` | no |
| `action` | `string` | no |
| `resourceType` | `string` | no |
| `resourceId` | `string` | no |
| `changes` | `any` | yes |
| `ipAddress` | `string` | yes |
| `userAgent` | `string` | yes |
| `timestamp` | `number` | no |

---

## `admins` (`convex/schema.ts:246-254`)

Indexes: `by_user(userId)`, `by_active(revokedAt)`.

Fine-grained admin role table, separate from `users.role`. | Field | Type | Optional |
|---|---|---|
| `userId` | `Id<"users">` | no |
| `role` | `"superadmin" \| "moderator"` | no |
| `grantedBy` | `Id<"users">` | no |
| `grantedAt` | `number` | no |
| `revokedAt` | `number` | yes |
| `reason` | `string` | yes |

---

## `productCategories` (`convex/schema.ts:256-266`)

Indexes: `by_slug(slug)`, `by_active(isActive)`, `by_parent(parentId)`.

| Field | Type | Optional |
|---|---|---|
| `name` | `string` | no |
| `slug` | `string` | no |
| `description` | `string` | yes |
| `parentId` | `Id<"productCategories">` | yes — self-referencing, for nested categories |
| `image` | `string` | yes |
| `isActive` | `boolean` | no |
| `sortOrder` | `number` | no |

---

## `products` (`convex/schema.ts:268-298`)

Indexes: `by_slug(slug)`, `by_category(categoryId)`, `by_published(isPublished)`, `by_sku(sku)`.

Shop-side product catalog (distinct from the alive `profiles.products` per-profile storefront items —
these back the shared shop, not an individual agent's profile page).

| Field | Type | Optional |
|---|---|---|
| `name` | `string` | no |
| `slug` | `string` | no |
| `description` | `string` | yes |
| `categoryId` | `Id<"productCategories">` | yes |
| `basePrice` | `number` | no |
| `compareAtPrice` | `number` | yes |
| `costPrice` | `number` | yes |
| `sku` | `string` | no |
| `barcode` | `string` | yes |
| `inventory` | `number` | no |
| `lowStockThreshold` | `number` | no |
| `trackInventory` | `boolean` | no |
| `isPublished` | `boolean` | no |
| `isFeatured` | `boolean` | no |
| `tags` | `string[]` | no |
| `images` | `string[]` | no |
| `primaryImageIndex` | `number` | no |
| `weight` | `number` | yes |
| `dimensions` | `{length, width, height, unit: "cm"\|"in"}` | yes |
| `shippingRequired` | `boolean` | no |
| `metadata` | `any` | yes |

---

## `productVariations` (`convex/schema.ts:300-312`)

Indexes: `by_product(productId)`, `by_sku(sku)`.

| Field | Type | Optional |
|---|---|---|
| `productId` | `Id<"products">` | no |
| `name` | `string` | no |
| `sku` | `string` | no |
| `price` | `number` | no |
| `inventory` | `number` | no |
| `options` | `{optionName, optionValue}[]` | no |
| `image` | `string` | yes |

---

## `carts` (`convex/schema.ts:314-326`)

Indexes: `by_user(userId)`, `by_guest(guestId)`.

| Field | Type | Optional |
|---|---|---|
| `userId` | `Id<"users">` | yes |
| `guestId` | `string` | yes — set for guest checkout; `userId`/`guestId` are mutually intended (not schema-enforced) |
| `items` | `{productId: Id<"products">, variationId?: Id<"productVariations">, quantity: number, priceAtAdd: number}[]` | no |
| `createdAt` | `number` | no |
| `updatedAt` | `number` | no |

The guest-cart id is persisted client-side under the `GUEST_CART_ID_KEY` localStorage key — see
"Frozen legacy storage keys" below.

---

## `orders` (`convex/schema.ts:328-398`)

Indexes: `by_orderNumber(orderNumber)`, `by_user(userId)`, `by_status(status)`,
`by_paymentStatus(paymentStatus)`, `by_createdAt(createdAt)`, `by_paymentIntentId(paymentIntentId)`.

| Field | Type | Optional | Notes |
|---|---|---|---|
| `orderNumber` | `string` | no | Human-facing order reference |
| `userId` | `Id<"users">` | yes | Absent for guest orders |
| `guestEmail` | `string` | yes | |
| `guestOrderToken` | `string` | yes | Server-minted random secret, set only on guest orders at creation and returned to the client once — see field comment `convex/schema.ts:332-341` for the full ownership-proof rationale (guests have no Convex user id to check against, and `orderNumber` alone is predictable) |
| `status` | `"pending"\|"processing"\|"shipped"\|"delivered"\|"cancelled"\|"refunded"` | no | |
| `items` | `{productId, productName, variationId?, variationName?, quantity, unitPrice, total}[]` | no | |
| `subtotal` / `tax` / `shipping` / `total` | `number` | no | |
| `discount` | `number` | yes | |
| `appliedDiscountCode` | `string` | yes | |
| `currency` | `string` | no | |
| `paymentProvider` | `"payrex"\|"stripe"\|"paypal"` | no | `stripe`/`paypal` are in the type union but their webhook routes return `410 Gone` — see `docs/handoff/02-TECH-STACK.md`; PayRex is the only live provider |
| `paymentStatus` | `"pending"\|"paid"\|"failed"\|"refunded"` | no | |
| `paymentIntentId` | `string` | yes | |
| `payrexCheckoutId` | `string` | yes | |
| `paidAt` | `number` | yes | |
| `shippingAddress` | `{fullName, addressLine1, addressLine2?, city, state?, postalCode, country, phone}` | no | |
| `billingAddress` | same shape minus `phone` | yes | |
| `notes` | `string` | yes | |
| `createdAt` / `updatedAt` | `number` | no | |

---

## `discounts` (`convex/schema.ts:400-413`)

Indexes: `by_code(code)`, `by_active(isActive)`.

| Field | Type | Optional |
|---|---|---|
| `code` | `string` | no |
| `type` | `"percentage" \| "fixed"` | no |
| `value` | `number` | no |
| `minOrderValue` | `number` | yes |
| `maxDiscountAmount` | `number` | yes |
| `usageLimit` | `number` | yes |
| `usedCount` | `number` | no |
| `validFrom` | `number` | no |
| `validUntil` | `number` | yes |
| `isActive` | `boolean` | no |
| `applicableProducts` | `Id<"products">[]` | yes |

---

## `settings` (`convex/schema.ts:415-420`)

Index: `by_key(key)`. Generic key/value store.

| Field | Type | Optional |
|---|---|---|
| `key` | `string` | no |
| `value` | `any` | no |
| `updatedAt` | `number` | no |
| `updatedBy` | `Id<"users">` | yes |

---

## `rateLimits` (`convex/schema.ts:422-426`)

Index: `by_key(key)`. Backs `convex/rateLimit.ts`'s sliding-window limiter — see
`docs/handoff/02-TECH-STACK.md` Trap 5 for the atomicity gotcha around this table.

| Field | Type | Optional |
|---|---|---|
| `key` | `string` | no | Resource-scoped key, e.g. `activate:<userId>`, `lead:<ownerId>` — not IP-based, Convex mutations don't receive caller IP |
| `windowStart` | `number` | no |
| `count` | `number` | no |

---

## `teams` (`convex/schema.ts:430-438`) — SaaS layer, Phase 4

Index: `by_owner(ownerId)`.

| Field | Type | Optional |
|---|---|---|
| `name` | `string` | no |
| `ownerId` | `Id<"users">` | no |
| `seats` | `number` | no |
| `logoUrl` | `string` | yes |
| `accentColor` | `string` | yes |
| `companyName` | `string` | yes |
| `createdAt` | `number` | no |

---

## `teamInvites` (`convex/schema.ts:440-451`)

Indexes: `by_team(teamId)`, `by_email(email)`.

| Field | Type | Optional |
|---|---|---|
| `teamId` | `Id<"teams">` | no |
| `email` | `string` | no |
| `invitedBy` | `Id<"users">` | no |
| `status` | `"pending" \| "accepted" \| "revoked"` | no |
| `createdAt` | `number` | no |

---

## `subscriptionInvoices` (`convex/schema.ts:453-471`)

Indexes: `by_user(userId)`, `by_checkoutId(payrexCheckoutId)`, `by_status(status)`,
`by_paymentIntentId(paymentIntentId)`.

| Field | Type | Optional |
|---|---|---|
| `userId` | `Id<"users">` | no |
| `plan` | `"pro" \| "business"` | no |
| `amountCentavos` | `number` | no |
| `periodDays` | `number` | no |
| `payrexCheckoutId` | `string` | yes |
| `paymentIntentId` | `string` | yes |
| `status` | `"pending" \| "paid" \| "expired"` | no |
| `periodStart` / `periodEnd` | `number` | yes |
| `createdAt` | `number` | no |

---

## Frozen legacy values: `lib/storage-keys.ts`

Three of the four exported localStorage key constants deliberately retain their pre-rename literal
string value, and must never be changed even though the product itself was renamed away from
"tapfolio":

```
GUEST_CART_ID_KEY = "tapfolio_guest_cart_id"   // lib/storage-keys.ts:14
DISCOUNT_CODE_KEY = "tapfolio_discount_code"    // lib/storage-keys.ts:15
OFFLINE_LEADS_KEY = "tapfolio_offline_leads"    // lib/storage-keys.ts:16
```

Per the file's own header comment (`lib/storage-keys.ts:1-13`): changing any of these three values would
orphan whatever is already written under the old key in a real user's browser (an existing guest cart, an
applied discount code, or queued offline leads) — a client-side migration would be required first, and
none exists. `lib/brand.test.ts`'s `INFRA_EXCEPTIONS` allowlist exists specifically to let these three
`export const` lines keep the retired brand-name literal without failing the repo's brand-consistency
test. A fourth key, `LEAD_VISITOR_ID_KEY = "lead_visitor_id"` (`lib/storage-keys.ts:21`), was added later
and deliberately does **not** carry the old brand prefix — it's a genuinely new key with no pre-rename
history to preserve.

## Cross-reference

Full field-level dead-data analysis (writers, readers, and live-row evidence for every finding above) is
in `.superpowers/sdd/audit-dataflow.md`. A Mermaid ER diagram of all 20 tables and their real
relationships is in `docs/handoff/04-ERD.md`.
