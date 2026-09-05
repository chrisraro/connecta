# SigmaTap — Product Requirements (as-built)

_As of commit `4116d50` on `main` (branch `docs/handoff-package` is based on it)._

This document describes what SigmaTap **is**, derived from the code that
exists — not from aspiration. Every claim below is either cited to a
`file:line` or marked `UNVERIFIED:`.

## 1. What SigmaTap is

SigmaTap (`package.json:2`, `name: "sigmatap"`) is a two-sided product for
the Philippine market:

1. **A front store** that sells physical NFC business cards, run as a normal
   e-commerce storefront (`app/shop/**`: `app/shop/page.tsx`,
   `app/shop/cart/page.tsx`, `app/shop/checkout/page.tsx`,
   `app/shop/product/[slug]/page.tsx`, `app/shop/order/[orderNumber]/page.tsx`).
2. **A digital-portfolio SaaS**: buyers create an account, build a public
   profile page, and link it to their physical card so that tapping the card
   on any phone opens that profile (`app/dashboard/builder/page.tsx`,
   `app/[slug]/page.tsx`, `app/p/[id]/page.tsx`, `app/t/[uuid]/page.tsx`).

The landing page states the market explicitly: "Ships nationwide PH"
(`app/page.tsx:167`), prices are quoted in ₱ (`app/page.tsx:261,271,282`),
and plan prices are stored in **PHP centavos** server-side
(`convex/plans.ts:8`, `convex/plans.ts:17`). The intended payment gateway is
PayRex, covering "GCash, Maya, Card, QR Ph" (`app/page.tsx:291`) — see
`07-ROADMAP.md` for why live payment is currently disabled regardless of
gateway choice.

The one-line pitch on the landing page: "Your business card, reinvented."
"Tap a premium NFC card on any phone to share a stunning profile and capture
leads instantly. No app required for the people you meet." (`app/page.tsx:106-126`).

## 2. Who it serves — personas

The schema encodes exactly three profile personas via `profileType`
(`convex/schema.ts:58`, `types/profile.ts:1`):

- **`individual`** — a solo professional. The builder hides the Products and
  Properties blocks for this persona (`lib/profileSections.ts:20-21`,
  `getBlocksForProfileType`).
- **`company`** — hides Education, TechStack, Experience, and Properties
  blocks (`lib/profileSections.ts:22-28`).
- **`business`** — hides Education, TechStack, and Experience, but (unlike
  `company`) keeps Properties (`lib/profileSections.ts:29-30`). `business` is
  also the only plan tier with team/seat features (see §3).

`profileType` is stored per-profile (`convex/schema.ts:58`); a near-identical
field `profileCategory` is also captured during onboarding and stored on the
user record (`convex/schema.ts:16`, inside `onboardingData`) before a real
profile exists.

There is a separate, orthogonal identity: **admin vs. regular user**, stored
as `users.role` (`v.union(v.literal("agent"), v.literal("admin"))`,
`convex/schema.ts:9`). Admins get a distinct `/admin/**` area (see §4) for
running the NFC-card factory, shop back-office, and platform moderation —
this is an operator role, not a customer-facing persona.

## 3. Plan tiers — derived from `convex/plans.ts`

Three tiers, `PlanId = "free" | "pro" | "business"` (`convex/plans.ts:12`).
Table below is copied field-for-field from `PLAN_LIMITS`
(`convex/plans.ts:48-109`); this is the server-authoritative source (a thin
frontend copy exists at `lib/plans.ts` "to keep the two files in sync" per
the header comment at `convex/plans.ts:4-6` — not independently verified
byte-for-byte in this task, but it is documented as required to match).

|                                | Free                                                                              | Pro                         | Business                      |
| ------------------------------ | --------------------------------------------------------------------------------- | --------------------------- | ----------------------------- |
| Price                          | ₱0                                                                                | ₱299.00/mo (29900 centavos) | ₱999.00/mo (99900 centavos)   |
| Max profiles                   | 1                                                                                 | unlimited (`null`)          | unlimited (`null`)            |
| Max active cards               | 1                                                                                 | unlimited (`null`)          | unlimited (`null`)            |
| Allowed templates              | `["editorial", "architectural"]` only (`FREE_TEMPLATE_IDS`, `convex/plans.ts:46`) | all (`null`)                | all (`null`)                  |
| Lead view cap                  | 100                                                                               | unlimited (`null`)          | unlimited (`null`)            |
| "Powered by SigmaTap" branding | shown                                                                             | removed                     | removed                       |
| Lead CSV export                | no                                                                                | yes                         | yes                           |
| Team workspace                 | no                                                                                | no                          | yes, 5 seats (`teamSeats: 5`) |

The premium "kinetic" (neon) template is gated to paid plans — the free tier
is limited to the two "basic" templates by design (comment at
`convex/plans.ts:43-45`). Billing is a **prepaid 30-day period** with a
3-day grace window after expiry (`PLAN_PERIOD_DAYS = 30`,
`PLAN_GRACE_DAYS = 3`, `convex/plans.ts:40-41`); enforcement lives in
`convex/billing.ts` (not read in full for this task — see `02-TECH-STACK.md`
for the daily-cron downgrade mechanism and its known scaling risk).

Plan limits are enforced server-side independent of any UI gate: e.g.
profile-creation and card-activation throw a `ConvexError` with code
`PLAN_LIMIT` when a free-tier cap is hit, verified in the audit wave
(`.superpowers/sdd/progress.md:66-67`, Task 11 review). The UI layer renders
locked-but-visible upgrade CTAs via an `UpgradeGate` component rather than
hiding features outright (`.superpowers/sdd/progress.md:66`).

## 4. Feature surface — derived from routes + Convex functions that exist

39 page routes exist under `app/` (verified by listing every `page.tsx` /
`route.ts` under `app/`: 42 files total, minus 3 API route handlers —
`app/api/health/route.ts` and two deprecated 410-Gone stubs at
`app/api/webhooks/{paypal,stripe}/route.ts`, see §6 — leaves 39 `page.tsx`
routes). Grouped by area:

**Public / marketing**

- `/` — landing page (`app/page.tsx`)
- `/shop`, `/shop/product/[slug]`, `/shop/cart`, `/shop/checkout`,
  `/shop/order/[orderNumber]` — storefront
- `/p/[id]` — public profile by internal id; `/[slug]` — public profile by
  vanity slug
- `/t/[uuid]` — NFC tap landing page (card claim/activation entry point)
- `/privacy`, `/terms` — legal pages
- `/marketing-preview/[templateId]` — template preview for marketing use

**Auth**

- `/auth`, `/auth/callback` (Clerk-hosted flow entry + post-login redirect)
- `/sign-in`, `/sign-up` (Clerk catch-all routes)

**Dashboard (consumer)**

- `/dashboard`, `/dashboard/onboarding`, `/dashboard/builder`,
  `/dashboard/profiles`, `/dashboard/cards`, `/dashboard/leads`,
  `/dashboard/billing`, `/dashboard/team`, `/dashboard/settings`,
  `/dashboard/auth-check`

**Admin**

- `/admin`, `/admin/factory` (NFC card registration/writing),
  `/admin/analytics`, `/admin/audit`, `/admin/settings`, `/admin/users`,
  `/admin/shop/{products,products/new,products/edit/[id],categories,
discounts,inventory,orders}`

The Convex backend (`convex/*.ts` — 25 function modules, excluding `schema.ts`; 26 files in total) mirrors
this: `cards.ts` (NFC lifecycle), `profiles.ts`, `leads.ts`, `billing.ts`,
`shop.ts`, `checkout.ts`, `payrex.ts`, `teams.ts`, `users.ts`, `images.ts`,
`admin.ts`/`adminShop.ts`, `audit.ts`, `notifications.ts`, `email.ts`,
`health.ts`, `settings.ts`, `rateLimit.ts`, `authz.ts`, `crons.ts`,
`maintenance.ts`, `projects.ts` — file list from `convex/` directory listing.

## 5. Core value loop

Traced through the routes and Convex functions above: **tap card → public
profile → lead captured.**

1. A physical card is registered in inventory and its NFC tag written by an
   admin at `/admin/factory` (`app/admin/factory/page.tsx`), backed by
   `convex/cards.ts`. Each card has a `uuid`, a secret `activationCode`, and
   a `status` of `inventory | active | lost` (`convex/schema.ts:43-52`).
2. The printed card (and its QR fallback) points to `/t/<uuid>`
   (`app/t/[uuid]/page.tsx`). Scanning/tapping it routes into a claim flow —
   sign in and claim, or sign up first — that ends with the card linked to a
   profile (`cards.linkedProfileId`, `convex/schema.ts:48`).
3. The linked profile renders publicly at `/p/[id]` or the vanity `/[slug]`
   once the owner has built it in `/dashboard/builder`.
4. A visitor on the public profile submits the contact/lead form; the
   submission is written to the `leads` table (`convex/schema.ts:210`, via
   `convex/leads.ts`) and surfaces in the owner's `/dashboard/leads` inbox.
   `tapCount` on the card (`convex/schema.ts:49`) tracks engagement,
   surfaced as analytics.

This loop, and specifically the first-run path (signup → onboarding wizard →
first profile → builder), was the subject of dedicated fixes in the
production-audit wave — see `07-ROADMAP.md`.

## 6. Explicit non-goals (as of this commit)

- **Live payment processing.** `lib/payments.ts:18` —
  `export const PAYMENTS_ENABLED = false;` — hard-disabled in code, not a
  config toggle. The checkout and Pro-upgrade flows render a payment
  placeholder dialog instead of charging (`components/billing/
PaymentPlaceholderDialog.tsx`). No payment gateway is contractually
  committed; PayRex is the code's working assumption
  (`convex/payrex.ts` exists and is wired for it) but "the team has NOT
  committed to PayRex (or any gateway); no keys exist and none are coming
  soon" (`docs/superpowers/plans/production-audit-fixes.md:70-71`). See
  `07-ROADMAP.md` for the deferred PayRex-specific work.
- **Stripe and PayPal are explicitly removed**, not merely unused: both
  webhook routes now return HTTP 410 Gone with a comment pointing to PayRex
  as the replacement (`app/api/webhooks/paypal/route.ts`,
  `app/api/webhooks/stripe/route.ts`).
- **AI-assisted profile/content generation is not a current feature.** A
  `credits` field ("Token balance for AI generation" per its own comment)
  exists on the `users` table only as deprecated orphan data from an earlier
  schema iteration, unread and unwritten by any current code
  (`convex/schema.ts:28-39`).
- **No properties/real-estate listings or projects catalog are live data.**
  The `properties` and `projects` tables and `convex/projects.ts` exist in
  schema/code but the dataflow audit found 0 rows and 0 callers for them
  (`.superpowers/sdd/progress.md:32`, dataflow audit). `profiles.services`
  (a catalog sub-field) is similarly dead per the same audit line.
- **Individual profiles cannot list Products or Properties** — this is a
  current code behavior (`lib/profileSections.ts:20-21`), but it is flagged
  in the audit trail as an open **product decision**, not a settled
  requirement: "PRODUCT QUESTION for user: profileType 'individual' excludes
  the Products block from the builder Sections panel
  (`lib/profileSections.ts:20-21`) — individual users cannot add products at
  all. Possibly intentional, possibly not."
  (`.superpowers/sdd/progress.md:63`). Unresolved as of this commit — see
  `07-ROADMAP.md`.
- **Shipping is nationwide Philippines only** — no claim of international
  shipping anywhere in the marketing copy or code reviewed
  (`app/page.tsx:167`, "Ships nationwide PH").
- UNVERIFIED: whether a native mobile app exists or is planned. No mobile
  app code, App/Play Store config, or React Native scaffolding was found
  under the repo root during this task's file listing; this is an absence
  check, not an exhaustive search.
