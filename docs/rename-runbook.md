# Tapfolio → Herald → SigmaTap: what's done, and what only you can do

The product has been renamed twice:

1. **Tapfolio → Herald**, because **tapfolio.me is a live company** (Indian founders, ~338 indexed pages) already operating under that name, with a pricing model that undercuts the original plan.
2. **Herald → SigmaTap**, this rename's own subject. The Herald name and mark are retired; `SigmaTap` (Greek sigma, "sum of" + the NFC tap) is the current brand. `lib/brand.ts` — the single source of truth for the name/tagline/domain — made this second pass cheap: one constant to change, plus a guard test that catches any hardcoded string that bypassed it.

This file records exactly what has been migrated, what is deliberately frozen, and the steps that require a human with dashboard access. Delete it once the remaining steps are done.

---

## Done automatically

| Surface | State |
|---|---|
| All user-facing copy | SigmaTap |
| `lib/brand.ts` | `SIGMATAP` constant (was `HERALD`), `buildSigmaTap()` (was `buildHerald()`) |
| Tagline | "Every tap counts." (was "Announced properly.", tied to the herald metaphor) |
| `package.json` name | `sigmatap` (build banner reads `sigmatap@0.1.0`) |
| README, `DEVELOPMENT_SETUP.md`, `PRODUCT.md`, `PRODUCTION_UPGRADE_NOTES.md` | rebranded |
| `marketing/README.md`, `marketing/brand/brand-sheet.html`, `marketing/*.mjs` demo scripts | rebranded |
| Brand mark | `components/brand/SigmaTapMark.tsx` (was `HeraldMark.tsx`) — a solid Greek sigma, deliberately with **no radiating NFC arcs** (see the design-rationale comment in `public/brand/sigmatap-mark.svg` for why that variant was rejected) |
| Brand SVGs | `public/brand/sigmatap-mark.svg`, `public/brand/sigmatap-icon.svg` (the old `herald-*.svg` files are deleted) |
| Raster assets | `app/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/og-fallback.png` — all regenerated from the new seal SVG via `scripts/generate-brand-assets.mjs` |
| `public/manifest.json`, `app/layout.tsx` metadata | SigmaTap name/icons |
| CSS identity tokens in `app/globals.css` | `--sigmatap-seal` / `-hover` / `-ink` / `-ink-soft` / `-paper` / `-surface` / `-line` (renamed from `--herald-*`; values unchanged) |

A guard test (`lib/brand.test.ts`) scans `.ts/.tsx/.css/.md/.json` for **any** of the three retired brand names (`tapfolio`, `herald`, `sigmatap`) and fails the build if any of them reappears. Its allowlist is empty — both literal freezes that used to justify entries there have been lifted; see below. A second test fails the build the day a new hardcoded `Connecta` string literal (case-sensitive, word-bounded: `\bConnecta\b`) appears in `app/**`, `components/**`, `convex/**`, or `lib/**` instead of going through the `CONNECTA` constant — the same mechanism that made each rename a one-line edit in `lib/brand.ts` instead of a repo-wide sweep.

---

## Previously frozen literals — both freezes lifted (2026-08-31)

Two references to the **original** Tapfolio name survived on purpose through the first two renames (Tapfolio → Herald and Herald → SigmaTap), because rewriting them risked breaking real, already-shipped state rather than just relabeling text. `lib/brand.test.ts` allowlisted each by exact line for as long as that risk was real.

**Both freezes have since been lifted, as part of the Connecta rename:**

### 1. localStorage keys — `lib/storage-keys.ts`

The three keys were renamed from

```
tapfolio_guest_cart_id
tapfolio_discount_code
tapfolio_offline_leads
```

to `connecta_guest_cart_id`, `connecta_discount_code`, `connecta_offline_leads`. These strings used to live in real users' browsers, so renaming them would have silently orphaned every in-flight guest cart and every unsynced offline lead. A data purge on **2026-08-31** removed every account but one, leaving no live population behind these keys — the byte-identical constraint that justified the freeze no longer holds, so the rename went ahead as a plain find-and-replace.

If a similar situation arises again in the future (a live population depending on an old client-storage key), the correct fix is a dual-read migration (read new key, fall back to old, write new, delete old) — not a blind rename, and not a new allowlist entry.

### 2. The NFC host — `app/admin/factory/page.tsx`

The hardcoded `PRODUCTION_DOMAIN` constant (`https://tapfolio-beta.vercel.app`) was **deleted outright**, not renamed. It doesn't exist any more. The host physically written onto NFC tags and printed QR codes is now derived at read time from `NEXT_PUBLIC_APP_URL` via `resolveNfcHost()` (`lib/nfcHost.ts`), with no fallback — the page refuses to write tags or print labels when the env var is unset, rather than guessing a host. This was actually already in motion before the purge — see "The NFC host, and why the 'frozen' literal was the bug" below for the full story of why a frozen literal was the wrong shape for this value in the first place, independent of any purge.

`lib/brand.test.ts`'s allowlist is now **empty** for both guard tests. Keep it that way: a new entry there means a retired brand name (`tapfolio`, `herald`, or `sigmatap`) is shipping to users again.

---

## What you need to do

### 1. Vercel — READ THIS BEFORE RENAMING ANYTHING

**Renaming the Vercel project changes its `.vercel.app` URL, which will brick every NFC card already shipped.** The cards encode `tapfolio-beta.vercel.app/t/<uuid>`; NFC tags are write-once in practice for a shipped product, so a customer's card cannot be re-pointed.

Safe sequence:

1. **Buy and attach a real custom domain first** (a `.ph` domain is planned but **not purchased yet** — `lib/brand.ts` does not hardcode one; it derives `CONNECTA.domain` from `NEXT_PUBLIC_APP_URL`, falling back to the honestly-inert `connecta.example` when unset). Cards should never have pointed at a `.vercel.app` URL — that was the original mistake.
2. Add it as a Vercel domain and make it primary.
3. **Keep `tapfolio-beta.vercel.app` alive permanently** as a redirect to the new domain. Do not delete it, do not rename the project out from under it, do not let it lapse. It is now legacy infrastructure serving physical hardware.
4. Only then update `NEXT_PUBLIC_APP_URL` on Vercel to the new domain and redeploy, so *newly written* cards use it. There is no separate `PRODUCTION_DOMAIN` constant to update any more — the NFC host is derived from `NEXT_PUBLIC_APP_URL` at read time via `resolveNfcHost()` (`lib/nfcHost.ts`); see "Previously frozen literals" above. Old cards keep working via the redirect.
5. Renaming the Vercel *project label* itself is cosmetic and safe **only after** a custom domain is primary.

Also update on Vercel: `NEXT_PUBLIC_APP_URL` (this drives `metadataBase`, OG image URLs, the NFC host, and `CONNECTA.supportEmail` — see `lib/brand.ts`).

### 2. Convex

The project label in the dashboard is cosmetic — rename freely at Settings → General.

**The deployment URL cannot be changed.** `nautical-tortoise-962.convex.cloud` is auto-generated and is baked into `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_DEPLOYMENT`. Leave it. It is never shown to users.

The CLI has no rename command (`npx convex project` only supports `create`), so this is dashboard-only.

### 3. Clerk

The application name in the dashboard is cosmetic — rename at Settings.

The instance domain `sunny-skunk-50.clerk.accounts.dev` is auto-generated for **development** instances and cannot be renamed. You do not want to rename it — you want to stop using it:

- Create a **production** Clerk instance with a custom domain.
- Update `convex/auth.config.ts`'s `domain`, the `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` env vars, and the CSP `script-src`/`connect-src`/`frame-src` entries in `next.config.ts` (they currently hardcode `*.clerk.accounts.dev`).
- Recreate the `convex` JWT template on the new instance (claims `{"aud": "convex"}`), or Convex auth breaks exactly as it did before.

**Session token customization is now optional.** This previously read "until then
`/admin` redirects everyone", which was accurate against the old middleware: it
compared `sessionClaims.metadata.role` against `"admin"`/`"superadmin"` with no
guard, and since the claim was never configured the comparison was `undefined`
for every account — including the superadmin — so the gate redirected everyone
unconditionally. That is fixed: middleware now only enforces the claim when it
is actually present (`claimConfigured`), and the `/admin` shell gates on
`admin.checkAdminStatus`, which reads the `admins` table. Adding
`{ "metadata": "{{user.public_metadata}}" }` at Sessions → Customize session
token is still worthwhile — it rejects non-admins at the edge before the shell
renders — but it is defense-in-depth, not a prerequisite.

### 4. The local folder name

The working directory is still `…/TapFolio/Tapfolio`. Renaming it is safe — nothing reads the folder name — but it invalidates editor workspaces, terminal history, and any absolute paths in local tooling. Do it when convenient, from outside the folder, with the dev server stopped.

---

## Not a rename, but part of the same decision

No domain is registered for this product yet — it currently runs on a `*.vercel.app` deployment. `lib/brand.ts` derives `CONNECTA.domain` and `CONNECTA.supportEmail` from `NEXT_PUBLIC_APP_URL` / `SUPPORT_EMAIL` rather than hardcoding a domain, so nothing breaks and no unowned domain is presented as live in customer-facing output (order-confirmation emails, OG image footers) before one is registered. When a real domain (`.ph` or otherwise) is purchased: set `NEXT_PUBLIC_APP_URL` to it, verify it as a Resend sending domain (or transactional email stays in sandbox mode and reaches nobody — see the `TODO(ops)` comment in `convex/email.ts`), and follow the Vercel sequence above before pointing new NFC cards at it.


---

## Third rename: Herald → SigmaTap (completed)

Unlike the first two passes, this one moved the actual infrastructure rather
than only the strings.

| Thing | Before | After |
|---|---|---|
| GitHub repo | `chrisraro/herald` | `chrisraro/sigmatap` |
| Vercel project | `herald` | `sigmatap` |
| Production URL | `herald-ph.vercel.app` | `sigmatap.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `herald-ph.vercel.app` | `sigmatap.vercel.app` (Vercel **and** Convex) |

### Domain aliases — do not remove these

Three hostnames now resolve to the same production deployment:

- `sigmatap.vercel.app` — canonical.
- `herald-ph.vercel.app` — kept so links shared during the Herald window still work.
- `tapfolio-beta.vercel.app` — **re-aliased deliberately.** See below.

### The NFC host, and why the "frozen" literal was the bug

`app/admin/factory/page.tsx` hard-coded the host that gets encoded onto
physical NFC tags and into the printed QR code. It was deliberately excluded
from both earlier renames, and `lib/brand.test.ts` allowlisted the exact line,
on the reasoning that the deployment had not moved and rewriting the string
would point every shipped card at a dead URL.

That reasoning expired without anyone noticing. By this rename the host was
returning **404** and was not even an alias on the Vercel project — so the
"safe" frozen value *was* the dead URL it existed to prevent, and every tag
written in that window pointed nowhere. The guard was faithfully protecting
the rot.

Two changes:

1. The host is now derived from `NEXT_PUBLIC_APP_URL`, so it tracks the
   deployment and cannot drift out of sync with a rename again. The factory
   page needs **no** brand-guard exception any more.
2. The retired host was re-aliased to the live deployment, so cards written
   while it was dead now resolve. **Keep that alias for as long as any of
   those cards are in circulation** — removing it re-breaks physical
   merchandise that is already in customers' hands.

The lesson worth carrying: an allowlist entry justified by a fact about the
world ("this host is live") needs re-checking against the world, not just
inherited. Prefer deriving the value so the question cannot arise.

### Still not renamed, at the time of this section

- The local working directory is still `…/TapFolio/Tapfolio` (harmless).
- `lib/storage-keys.ts` literals remained frozen through this rename — that
  justification was still valid at the time, because those keys existed in
  real users' browsers and renaming them would have orphaned in-flight carts
  and unsynced offline leads. Unlike the NFC host, this one did not depend on
  a fact that could silently expire.

  **Update, Connecta rename:** a data purge on 2026-08-31 removed every
  account but one, leaving no live population behind the old keys. The
  freeze was lifted and the keys were renamed to `connecta_*` — see
  "Previously frozen literals — both freezes lifted (2026-08-31)" above.

---

## Name history

Tapfolio → Herald → SigmaTap → Connecta. The first change was forced by a
live, unrelated company operating as tapfolio.me. The second retired the
medieval-herald metaphor. The third is the current name; the tagline moved
from "Every tap counts." to "tap.connect.grow.".
