# Connecta rename + card skins — design

**Date:** 2026-08-31
**Status:** Approved, not started
**Related:** `docs/rename-runbook.md` (prior renames), the Convex→Supabase cutover decision record

---

## Context

Three migrations are now in flight at once. They are separate projects with separate
risks, and this document covers the two new ones.

| #   | Project                                    | State                                         |
| --- | ------------------------------------------ | --------------------------------------------- |
| 1   | SigmaTap → **Connecta** rename (code half) | This document, ships first                    |
| 2   | Convex + Clerk → **Supabase**              | Decided separately, 13 decisions, not started |
| 3   | Four **card skins**                        | This document, ships last                     |

### Sequencing, and why

**Rename first.** `lib/brand.ts` is a single source of truth with a guard test
enforcing it, so the rename is cheap _today_ and expensive after the backend
migration rewrites 5,240 lines of server code and 229 client call sites. Renaming
before those exist means the new code is born as Connecta.

**Skins last — but their schema lands during the migration.** See
[Correction to the migration plan](#correction-to-the-migration-plan).

**Do not bundle the rename into the migration branch.** A rename touching every
user-facing string, mixed into a branch already rewriting 229 call sites, makes a
failing test ambiguous between the two, and forfeits the ability to ship the rename
if the migration stalls.

---

## What unblocked this: the 2026-08-31 purge

The previous two renames had to freeze two sets of literals because real data
existed behind them. That constraint is now gone, and this section records the
evidence so a future reader does not re-freeze them out of caution.

A snapshot export before the purge showed the deployment held 15 users, 15 profiles,
12 leads, and **exactly one card** — a personal test tag, `uuid 43:45:08:03`, tapped
four times. Zero orders. Zero subscription invoices.

`maintenance:internalPurgeTestAccounts` was run against all 15 accounts. **14 were
purged**, removing 15 profiles, 8 leads, 14 notifications and 5 user-owned carts —
including every third-party sign-up (`@ncf.edu.ph`, `@bicol-u.edu.ph` addresses).
One account was refused by design: `tapfolio.dev@gmail.com`, which holds the
superadmin grant.

The single card was **returned to `inventory`**, not deleted — the function refuses
to hard-delete non-inventory cards, because doing so orphans a physical NFC tag.

**Consequence:** there is no live population behind either frozen literal. No real
browser holds a meaningful `tapfolio_*` localStorage value, and the only NFC tag in
existence is in the founder's hand and is rewritable.

---

## Project A — SigmaTap → Connecta (code half)

### A1. Brand constant

`lib/brand.ts` is the single source of truth and stays that way.

- `SIGMATAP` → `CONNECTA`, `buildSigmaTap()` → `buildConnecta()`
- `name`: `"Connecta"`
- `tagline`: `"Every tap counts."` → `"tap.connect.grow."` — lowercase, period-separated, no spaces; that typographic form is part of the mark, not incidental styling
- `FALLBACK_DOMAIN`: `sigmatap.example` → `connecta.example`
- The naming rationale in the file header is rewritten. The current text justifies the
  Greek sigma (Σ, "sum of") paired with the NFC tap. Connecta has no sigma, so that
  paragraph is replaced rather than edited.

### A2. Identity assets

- **Wordmark: live text in Fraunces.** Confirmed already loaded via `next/font/google`
  in `lib/fonts.ts` as `--font-display`. No asset, no new dependency, no licensing
  question. It stays themeable and scalable.
- **Lettermark: an exported SVG.** `components/brand/SigmaTapMark.tsx` currently inlines
  a hand-authored Greek sigma zigzag
  (`M16 10 H50 V18 H32 L44 30 V34 L32 46 H50 V54 H16 V46 L30 32 L16 18 Z`). A
  high-contrast serif **C** is not hand-authorable as a clean path. Export from Figma to
  `public/brand/connecta-mark.svg`, then inline it into `ConnectaMark.tsx` using the same
  `currentColor` pattern, so it inherits colour from context and issues no network request.
  Keep the existing rule that the public SVG is the source of truth and the component is
  only its delivery mechanism.
- **Pattern band:** the repeating "C" motif on the card backs enters the repo only if it
  appears in the app. If it is print-only, it stays in Figma.

### A3. CSS tokens

Seven tokens in `app/globals.css` rename, values unchanged:

```
--sigmatap-ink        → --connecta-ink
--sigmatap-ink-soft   → --connecta-ink-soft
--sigmatap-paper      → --connecta-paper
--sigmatap-surface    → --connecta-surface
--sigmatap-line       → --connecta-line
--sigmatap-seal       → --connecta-brand
--sigmatap-seal-hover → --connecta-brand-hover
```

`seal` becomes `brand` rather than carrying over. The name encoded a visual form — "the
sigma struck into a seal disc" — and that form is being replaced by a letterform. After
three renames, token names should not encode a shape that can change a fourth time.
`ink`, `paper`, `surface` and `line` are already form-independent and carry over as-is.

The brand token layer is **kept**, not collapsed into the shadcn semantic layer. They are
genuinely separate concerns and the design system documents them that way.

### A4. Unfreeze the frozen literals

Both freezes are obsolete (see [the purge](#what-unblocked-this-the-2026-08-31-purge)).

- `lib/storage-keys.ts`: `tapfolio_guest_cart_id`, `tapfolio_discount_code`,
  `tapfolio_offline_leads` → `connecta_*`. A plain rename across 4 call sites
  (`CartContext`, `shop/cart`, `shop/checkout`, offline leads). **No dual-read
  migration** — there is nothing to preserve. `LEAD_VISITOR_ID_KEY` already carries no
  brand prefix and is untouched.
- `components/dashboard/QrClaimScanner`: drop `herald-ph.vercel.app` and
  `tapfolio-beta.vercel.app` from the accepted-host list.
- `lib/brand.test.ts`: delete `INFRA_EXCEPTIONS` entirely.

### A5. Guard test

`STALE_BRAND` extends to ban `tapfolio`, `herald` **and** `sigmatap`, with **zero
allowlist entries**. This is stronger than any previous rename left behind, and it is
only possible because A4 removes every legitimate exception.

The companion test that fails the build when a hardcoded brand-name literal appears in
`app/**` or `components/**` instead of going through the constant is retargeted from
`SigmaTap` to `Connecta`.

### A6. Files and metadata

Six files carry the name and are renamed: `components/brand/SigmaTapMark.tsx`,
`public/brand/sigmatap-mark.svg`, `public/brand/sigmatap-icon.svg`, the two
`marketing/brand/sigmatap-*.svg`, and `.superpowers/sdd/sigmatap-rename.md`.

Raster assets regenerate from the new mark via `scripts/generate-brand-assets.mjs`:
`app/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`,
`public/apple-touch-icon.png`, `public/og-fallback.png`. Plus `package.json` name,
`public/manifest.json`, `app/layout.tsx` metadata, and the docs.

Scope: **63 files** mention the name — app (23), docs (13), lib (7), components (6),
convex (6), marketing (5), public (2), scripts (1).

### A7. Deferred — the infrastructure half

Blocked on purchasing a domain, which has not happened. Covers the Vercel project, the
custom domain, `NEXT_PUBLIC_APP_URL`, `PRODUCTION_DOMAIN` in the factory page, and the
Convex/Clerk dashboard labels. Follow the sequence in `docs/rename-runbook.md`.

**Discrepancy to resolve first:** `.vercel/project.json` reads
`"projectName": "herald"`, while the runbook records the Herald→SigmaTap infrastructure
rename as completed. Either the local link is stale or the rename never happened. Check
the dashboard before planning the domain move.

**Ordering constraint:** rewrite the physical test tag **before** retiring the legacy
host aliases, or the only end-to-end proof of the tap path stops resolving.

---

## Project B — Card skins

Four skins, designed in Figma against the existing brand palette. The brand red
survives the rename unchanged.

| Skin       | Intent                                 |
| ---------- | -------------------------------------- |
| `charcoal` | Default assigned at signup             |
| `scarlet`  | Prominent brand-forward front          |
| `crimson`  | Brand identity with a minimalist split |
| `gradient` | Subtle, sophisticated                  |

### B1. Representation

A `skin` enum plus a registry module mirroring the existing
`components/templates/registry.ts` pattern — one place defining each skin's colours,
gradient stops and treatment, consumed by both the on-screen card and the print spec.

### B2. The freeform designer is replaced, not extended

`profiles.digitalCard` currently holds arbitrary `backgroundColor`, `textColor`,
`cardBackgroundType`, `cardGradientStart`/`End`, a `theme` of
`light|dark|glass|carbon`, and `positions{header,qr,bio,contacts}` with
`{x,y,width,scale}` drag-editing. It collapses to `{ skin }`.

Rationale: the product's promise is _look professional the instant someone taps_.
Arbitrary colours and free-dragged elements let users produce cards that fail that
promise. Four art-directed skins guarantee the outcome.

This deletes the colour pickers, gradient controls, position dragging and per-theme
default logic — the largest removable chunk of `app/dashboard/builder/page.tsx`, which
is currently **2,284 lines**. `digitalCard` spans **3,030 LOC** across five files.

**Accepted trade-off:** custom colours are a plausible paid-tier feature and this
forecloses it for now. The judgement is that custom colours can be rebuilt in about a
week when a paying customer asks, whereas a designer that lets people make bad cards is
hard to un-ship.

### B3. Which skin shows where

- **`profiles.digitalCard.skin` is the source of truth** for what renders on screen.
  Defaults to `charcoal` at signup.
- **`cards.skin`** records which skin was physically printed on a given card.
- **At claim time the card's skin is copied to the profile once**, as a default the user
  can then change. No ongoing sync.

`cards.skin` cannot be the source of truth: free-tier and digital-only users own no
card, so the skin would have nowhere to live. Full independence was rejected because it
wastes the best moment in the product — claiming a physical Scarlet card and finding
your screen card is Charcoal presents two objects that should feel like one.

### B4. Physical fulfillment

**Front carries the printed skin. Back is generic — QR and wordmark only.**

Contact details are **not** printed. The product's pitch is _your details change, your
card doesn't_; printing a phone number rebuilds the paper business card it replaces, and
makes a card wrong the day someone changes jobs. The QR resolves to a live profile that
updates forever — that is the personalisation.

Consequences, all favourable:

- Four skins become **four pre-printable SKUs**, batched cheaply and held in inventory.
- `cards`, `activationCode`, `status: inventory|active|lost` and the factory page are
  **unchanged**. The existing pre-mint-then-claim flow works untouched.
- Skins become a `products` attribute plus a `cards.skin` record of what shipped.

If personalised print is wanted later, ship it as a Business-tier add-on with its own
fulfillment path — not by rebuilding inventory around it before launch.

### B5. Explicitly untouched

`layoutConfig.themeId` — the editorial / kinetic / architectural public-profile
templates — is a different concept at a different layer and does not change. The product
has three theming systems; this work collapses one of them (`digitalCard.theme`) and
leaves the other two alone.

---

## Correction to the migration plan

The Supabase decision record has `digitalCard` migrating as a `jsonb` blob. Given B2
that is wrong, and the fix belongs in the migration even though skins ship last.

**Add a fifth carve-out:** `profiles` gets a **`skin` enum column**, and `digitalCard`
does not arrive as a freeform blob. Porting ~15 fields plus nested
`positions{x,y,width,scale}` and then deleting them is wasted work in both directions.

With 0 profiles remaining after the purge there is **no backfill** and no
`light|dark|glass|carbon` values to translate. The freeform designer never reaches
Postgres at all — B2's deletion happens by omission during the migration, not as a
later removal. The rest of Project B (SKUs, `cards.skin`, the claim-copy) still ships
third.

---

## Open items

- **The C lettermark must be exported from Figma by hand.** The `CARD SKINS` section
  returns as a leaf with no traversable children over MCP, so vectors and font metadata
  cannot be pulled programmatically. Export `connecta-mark.svg`, or supply a reachable
  node id.
- **The Figma file goes stale when A3 lands.** It is titled _"SigmaTap — Design
  System - Data Model - ERD"_, its Brand frame reads _"SigmaTap identity — the sigma
  struck into a seal disc"_, and its swatches are annotated as mirroring
  `app/globals.css`. Renaming tokens without updating it leaves two drifting sources of
  truth.
- **Whether the pattern band appears in-app** (A2) is unresolved and decides whether it
  becomes a repo asset.

## Validation

- The guard test passing with zero allowlist entries is the completion signal for A4/A5.
- The one physical tag, re-registered through the factory page after the Supabase
  cutover, is the end-to-end proof that `/t/<uuid>` still resolves. Re-tap it.
