# TapFolio — Production Upgrade Notes (June 2026)

This document summarizes the full production overhaul completed across four phases, and everything you must do before going live.

---

## ⚠️ DO THIS FIRST — Security

1. **Rotate your exposed keys.** `.env.local` contains real secrets (Clerk secret key, Resend API key) that were present in the working folder. Rotate them in the Clerk and Resend dashboards, then update `.env.local`. Never commit this file (`.gitignore` already covers it). See `.env.example` for the full list of required variables.
2. **Run `npx convex dev` once** before anything else. `convex/_generated/api.d.ts` was hand-maintained offline; real codegen will regenerate it cleanly.

---

## What changed (by phase)

### Phase 1 — Stabilization, security, PayRex payments
- **Payments rebuilt on PayRex** (GCash, Maya, Card, QR Ph; currency PHP/centavos):
  - `convex/payrex.ts` — creates PayRex hosted Checkout Sessions via REST (no SDK).
  - `convex/http.ts` — webhook at `https://<your-deployment>.convex.site/webhooks/payrex` with HMAC-SHA256 signature verification (constant-time compare).
  - Checkout page: single "Pay securely with PayRex" flow.
  - Old Stripe/PayPal webhook routes return HTTP 410; deps removed from `package.json` (run `npm install` to prune).
- **Security hardening** — `convex/authz.ts` (`requireUser`, `requireUserMatching`, `requireAdmin`). Every Convex function now derives identity from the verified Clerk JWT instead of trusting client-passed IDs. Functions that previously had **no auth at all** (projects update/delete, notifications markAsRead) are fixed.
- **Order flow fixes**: race-free order numbers, discount usage counted only on successful payment, inventory decremented on payment confirmation, order emails sent after payment (not before).

### Phase 2 — Admin back office
- New `settings` table + admin-editable shop settings (tax %, flat shipping, free-shipping threshold) — server and storefront now share one source of truth.
- Orders admin: filters, search, detail view (incl. PayRex IDs), status transitions, CSV export, mark-refunded (restores inventory; actual refund is done in the PayRex dashboard).
- Product variations CRUD, real analytics (revenue, top products, 30-day chart), real dashboard stats, full audit logging on every admin mutation, user suspend + superadmin-only grant/revoke with self-protection guards.

### Phase 3 — UI/UX
- Landing page rebuilt as a full marketing site (hero, how-it-works, features, template showcase, pricing, testimonials, footer).
- Dashboard: stat cards, quick actions, recent leads, skeletons, empty states. Leads: search, CSV export, status chips, click-to-call/email.
- Shop: trust strip, PHP formatting everywhere, account link, polished states.
- Global: focus rings, reduced-motion support, `app/not-found.tsx`, `app/error.tsx`, reusable `Skeleton` + `EmptyState` components. Accessibility pass (labels, aria, contrast).

### Phase 4 — SaaS layer (B2C + B2B)
- **Plans**: Free (1 profile, 1 card, 2 templates, 100 visible leads, TapFolio branding) / **Pro ₱299/mo** (unlimited, all templates, no branding, CSV export) / **Business ₱999/mo** (Pro + 5-seat team workspace, shared branding, team lead pool). Prices admin-editable in Settings.
- **Billing**: prepaid 30-day periods via PayRex checkout; renewal extends from current expiry; 3-day grace, then daily Convex cron auto-downgrades. Billing page with plan grid + invoice history.
- **Teams (B2B)**: `/dashboard/team` — invite by email (auto-joins existing users on login), seat management, team branding, owner-only aggregated lead pool.
- All limits enforced **server-side** in Convex; leads are always captured (viewing older ones is what's gated on Free).

---

## Go-live checklist

1. Rotate keys (above), fill `.env.local` per `.env.example`.
2. In the **Convex dashboard**, set env vars: `RESEND_API_KEY`, `PAYREX_SECRET_KEY`, `PAYREX_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.
3. `npm install` (prunes Stripe/PayPal), then `npx convex dev` (codegen + push schema/functions; verify the `downgrade-expired-plans` cron registers).
4. `npm run build` locally — the sandbox here could not run the full Next build (45s process cap); TypeScript checks pass with zero errors, but run the build once on your machine before deploying.
5. **Register the PayRex webhook** (one-time, via API since their dashboard doesn't support it yet):
   `POST https://api.payrexhq.com/webhooks` with your secret key, `url = https://<your-convex-deployment>.convex.site/webhooks/payrex`, `events = ["payment_intent.succeeded"]`. Save the returned webhook secret as `PAYREX_WEBHOOK_SECRET` in Convex.
6. Set up Resend with your real domain (currently on the testing domain).
7. Test end-to-end in PayRex test mode: shop order → pay with test GCash → order flips to paid/processing, inventory decrements, email sends. Then: Billing → upgrade to Pro → plan activates.
8. Re-price products in `/admin/shop/products` in ₱ (centavos stored) — old USD-era prices need review.

## Housekeeping
Inert leftover files you may delete manually (the sandbox couldn't): `*.tmp`, `*.new`, `*.build`, `SENTINEL_TEST.txt` (all zero-byte). Per your preference, nothing was deleted automatically.

## Known deferred items
- White-label accent color on member profiles: data is exposed (`teamBranding`) but templates don't render it yet.
- Tax remains default 0% — set your rate in Admin → Settings if you need VAT.
- `cards.getCardByUuid` does an O(n) fallback scan for case-insensitive matches — fine at current scale.
- Money refunds are manual in the PayRex dashboard (the app records them and restores stock).
