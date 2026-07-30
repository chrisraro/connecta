# Tapfolio → Herald: what's done, and what only you can do

The product was renamed because **tapfolio.me is a live company** (Indian founders, ~338 indexed pages) already operating under that name, with a pricing model that undercuts the original plan.

This file records exactly what has been migrated, what is deliberately frozen, and the steps that require a human with dashboard access. Delete it once the remaining steps are done.

---

## Done automatically

| Surface | State |
|---|---|
| All user-facing copy | Herald |
| `package.json` name | `herald` (build banner reads `herald@0.1.0`) |
| README | rewritten, accurate, Herald |
| `DEVELOPMENT_SETUP.md`, `PRODUCT.md`, `PRODUCTION_UPGRADE_NOTES.md` | rebranded + factual corrections |
| `PROJECT_CONTEXT.md` | **deleted** — described a fictional WooCommerce architecture that never existed |
| GitHub repo name | `chrisraro/Tapfolio` → **`chrisraro/herald`** |
| GitHub description | replaced (the old one claimed "Real Estate professionals", "AI-generated portfolios", "Next.js 15", "Google Gemini 3" — none true) |
| Local git remote | updated to the new URL |
| Brand mark, favicon, app icons, manifest, OG image | created from scratch — there were none |

A guard test (`lib/brand.test.ts`) now scans `.ts/.tsx/.css/.md/.json` for the old name and fails the build if it reappears. It previously only scanned `.ts/.tsx/.css`, which is why the first rename pass looked complete while `package.json` and every `.md` still carried the old name.

---

## Deliberately NOT renamed — do not "finish" these

Two references to the old name survive on purpose. Both are load-bearing. `lib/brand.test.ts` allowlists them by exact line.

### 1. localStorage keys — `lib/storage-keys.ts`

```
tapfolio_guest_cart_id
tapfolio_discount_code
tapfolio_offline_leads
```

These strings live in **real users' browsers right now**. Renaming them orphans every in-flight guest cart and every unsynced offline lead — silently, with no error. The constant names were updated; the string values must stay byte-identical.

If you ever genuinely need to migrate them, it's a dual-read migration (read new key, fall back to old, write new, delete old), not a find-and-replace.

### 2. `PRODUCTION_DOMAIN` — `app/admin/factory/page.tsx`

```
https://tapfolio-beta.vercel.app
```

This URL is **physically written onto NFC tags** by the card factory page. Every card already in a customer's wallet points at it. See the Vercel section below — this is the highest-risk item in the whole migration.

---

## What you need to do

### 1. Vercel — READ THIS BEFORE RENAMING ANYTHING

**Renaming the Vercel project changes its `.vercel.app` URL, which will brick every NFC card already shipped.** The cards encode `tapfolio-beta.vercel.app/t/<uuid>`; NFC tags are write-once in practice for a shipped product, so a customer's card cannot be re-pointed.

Safe sequence:

1. **Buy and attach a real custom domain first** (e.g. `herald.ph`). Cards should never have pointed at a `.vercel.app` URL — that was the original mistake.
2. Add it as a Vercel domain and make it primary.
3. **Keep `tapfolio-beta.vercel.app` alive permanently** as a redirect to the new domain. Do not delete it, do not rename the project out from under it, do not let it lapse. It is now legacy infrastructure serving physical hardware.
4. Only then update `PRODUCTION_DOMAIN` in `app/admin/factory/page.tsx`, so *newly written* cards use the new domain. Old cards keep working via the redirect.
5. Renaming the Vercel *project label* itself is cosmetic and safe **only after** a custom domain is primary.

Also update on Vercel: `NEXT_PUBLIC_APP_URL` (this drives `metadataBase`, OG image URLs, and `HERALD.supportEmail` — see `lib/brand.ts`).

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

**Still outstanding on the current instance:** the session token needs customizing so the `/admin` role gate works —
Sessions → Customize session token → `{ "metadata": "{{user.public_metadata}}" }`.
Until then `/admin` redirects everyone. It fails closed, so this is safe, not urgent.

### 4. The local folder name

The working directory is still `…/TapFolio/Tapfolio`. Renaming it is safe — nothing reads the folder name — but it invalidates editor workspaces, terminal history, and any absolute paths in local tooling. Do it when convenient, from outside the folder, with the dev server stopped.

---

## Not a rename, but part of the same decision

The domain `herald.ph` is referenced as the default in `lib/brand.ts` and appears in customer-facing output (order-confirmation emails, OG image footers). It is env-derived (`NEXT_PUBLIC_APP_URL` / `SUPPORT_EMAIL`) rather than hardcoded, so nothing breaks if it isn't registered yet — but **register it before launch**, and verify it as a Resend sending domain, or transactional email stays in sandbox mode and reaches nobody.
