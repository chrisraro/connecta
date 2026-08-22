# Tech Stack

As of commit `4116d50` on `main` (2026-08-21). All versions below are copied
verbatim from `package.json:1-70` — do not round them.

## Runtime shape

Two separate runtimes ship from this one repo, and they deploy independently:

1. **Next.js app** (`app/`, `components/`, `lib/`) — deploys to Vercel on push/merge via the normal
   Vercel build (`next build`).
2. **Convex backend** (`convex/*.ts` — 26 files, i.e. 25 function modules plus `schema.ts`) — a separate serverless deployment, pushed with the
   Convex CLI, **not** by the Vercel build. See "Trap 1" below — this is the single most common way to
   waste an afternoon on this codebase.

## Frontend

| Package | Version | Owns |
|---|---|---|
| `next` | `16.2.12` | App Router, routing, SSR, `next.config.ts` (`next.config.ts:1-55`) |
| `react` / `react-dom` | `19.2.3` | UI runtime |
| `babel-plugin-react-compiler` | `1.0.0` | React Compiler, turned on via `reactCompiler: true` (`next.config.ts:4`) |
| `@clerk/nextjs` | `^6.39.2` | Auth UI + middleware (`middleware.ts`) |
| `convex` | `^1.31.6` | Client SDK (`useQuery`/`useMutation`) and the `convex` CLI (`npx convex ...`) — one package, two jobs |
| `tailwindcss` | `^4` (via `@tailwindcss/postcss` `^4`) | Styling; tokens in `app/globals.css` |
| `next-themes` | `^0.4.6` | Light/dark/system theme (`components/ThemeProvider.tsx`, `components/ui/theme-toggle.tsx`, `components/ui/toaster.tsx`) |
| `radix-ui` (aggregator) + individual `@radix-ui/react-*` (`checkbox` `^1.3.3`, `dialog` `^1.1.15`, `dropdown-menu` `^2.1.16`, `label` `^2.1.8`, `select` `^2.2.6`, `slot` `^1.2.4`, `switch` `^1.2.6`, `tabs` `^1.1.13`) | mixed | Unstyled primitives under `components/ui/**` (e.g. `components/ui/button.tsx` imports from the `radix-ui` aggregator) |
| `class-variance-authority` | `^0.7.1` | Variant styling for `components/ui/*` (e.g. `alert.tsx`, `badge.tsx`, `button.tsx`) |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^3.4.0` | `lib/utils.ts`'s `cn()` class-merge helper |
| `lucide-react` | `^0.563.0` | Icon set (`components.json` declares `"iconLibrary": "lucide"`) |
| `sonner` | `^2.0.8` | Toasts (used across `app/admin/factory`, `app/dashboard/billing`, `app/dashboard/builder`, etc.) |
| `react-hook-form` | `^7.71.1` | Form state, wired into the shadcn `components/ui/form.tsx` primitive |
| `@dnd-kit/core` `^6.3.1`, `@dnd-kit/sortable` `^10.0.0`, `@dnd-kit/utilities` `^3.2.2` | Drag-and-drop reordering in the profile builder (`app/dashboard/builder/page.tsx`) |
| `html-to-image` | `^1.11.13` | Renders the digital business card to a PNG for download/share (`app/dashboard/builder/page.tsx`, `components/ui/DigitalCardModal.tsx`) |
| `qrcode.react` | `^4.2.0` | Generates the QR code shown on cards/factory pages (`app/admin/factory/page.tsx`, `components/profile-builder/AccessCard.tsx`, `components/ui/digital-business-card.tsx`) |
| `jsqr` | `^1.4.0` | Decodes a QR code from camera frames for claim-by-scan (`components/dashboard/QrClaimScanner.tsx`) |
| `sanitize-html` | `^2.17.3` | XSS-safe HTML sanitization of user-generated bio/about text (`lib/sanitize.ts`) |

**Installed but not actually used anywhere in `app/`, `components/`, `lib/`, or `convex/`** (verified by
grepping every import path across those directories — zero hits beyond the line cited):
- `isomorphic-dompurify` (`^3.9.0`) — no import found anywhere.
- `zod` (`^4.3.6`) and `@hookform/resolvers` (`^5.2.2`) — no `zodResolver`/`z.` usage found; forms in this
  codebase validate manually, not via a zod schema.
- `vcards-js` (`^2.10.0`) — the only reference in the whole repo is its own ambient type stub
  (`types/vcards-js.d.ts:1`, `declare module 'vcards-js'`). The actual vCard export
  (`lib/vcard.ts:1-4`) builds the `BEGIN:VCARD...` string by hand — the comment there literally says
  "Manually construct vCard 3.0 string." The npm package is dead weight.

VERIFIED DEAD (controller check, 2026-08-22): a repo-wide search for each literal package name —
excluding `node_modules/`, `.next/`, `.git/`, `package.json` and `package-lock.json` — returns **zero**
hits in `app/`, `components/`, `lib/`, `convex/` or `hooks/`. The only remaining matches are inside
scratch review artifacts under `.superpowers/` and this document itself. A dynamic
`import("vcards-js")` would still contain the literal package name and would have matched, so the
dynamic-import escape hatch is ruled out.

Two of them are superseded rather than merely unused, which is why they linger:
- `isomorphic-dompurify` → the codebase sanitizes via `sanitize-html` (`lib/sanitize.ts:1`).
- `vcards-js` → the vCard is hand-built as a vCard 3.0 string (`lib/vcard.ts:3-4`).

Removing all four is safe and reduces both bundle weight and supply-chain surface. Deliberately NOT
done as part of this documentation pass — it is a `package.json` change, and this pass is docs-only.

## Backend / data

| Package | Version | Owns |
|---|---|---|
| `convex` | `^1.31.6` | Database, server functions (`query`/`mutation`/`action`), scheduling (`convex/crons.ts`), file storage |
| `resend` | `^6.12.0` | Transactional email, `convex/email.ts` only (lead notifications, order confirmations) |

Schema: `convex/schema.ts` — 20 tables, see `docs/handoff/03-DATABASE-SCHEMA.md`.

Auth wiring: `convex/auth.config.ts:1-10` — one provider, `domain: "https://sunny-skunk-50.clerk.accounts.dev"`,
`applicationID: "convex"`. That `applicationID` string has to match a Clerk **JWT Template named `convex`**
exactly — see Trap 2 below.

## Testing / linting / types

| Package | Version | Owns |
|---|---|---|
| `vitest` | `^4.1.9` (`@vitest/ui` same) | Test runner |
| `convex-test` | `^0.0.54` | In-memory Convex backend for testing `convex/*.ts` mutations/queries against a fake `ctx.db` |
| `jsdom` | `^29.1.1` | DOM environment for `*.test.tsx` component tests |
| `@edge-runtime/vm` | `^5.0.0` | Backs the `edge-runtime` Vitest environment (see below) |
| `@testing-library/react` `^16.3.2`, `@testing-library/jest-dom` `^6.9.1`, `@testing-library/user-event` `^14.6.1` | Component test helpers |
| `eslint` | `^9` | Linting, flat config (`eslint.config.mjs:1-19`) built from `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` |
| `eslint-config-next` | `16.1.6` | Next-specific lint rules — note this is one minor behind the `next` runtime version (`16.2.12`); not a bug, just worth knowing it can lag |
| `typescript` | `^5` | Type checking (`npx tsc --noEmit`) |

`vitest.config.ts:1-36` runs **two** Vitest projects in one pass:
- `server`: `environment: "edge-runtime"`, everything except `*.test.tsx` (covers `convex/*.test.ts` and
  `lib/*.test.ts`).
- `client`: `environment: "jsdom"`, only `*.test.tsx` (component tests).

The file comment at `vitest.config.ts:4-7` explains why: Vitest 4 removed `environmentMatchGlobs` in
favor of `test.projects`, and this config reproduces the old split behavior.

## Commands that actually work

```bash
# Frontend
npm run dev          # next dev — local dev server
npm run build         # next build — production build (Vercel runs this)
npm run start          # next start — serve a production build locally
npm run lint           # eslint (eslint.config.mjs)
npm run test           # vitest run — one-shot, both projects
npm run test:watch     # vitest — watch mode
npx tsc --noEmit       # typecheck only, no script alias exists for this

# Convex (separate deploy target — see Trap 1)
npx convex dev          # interactive dev loop, watches convex/ and pushes on save
npx convex dev --once   # one-shot push to the dev deployment, then exit — what CI/scripted runs use
npx convex deploy       # push to the PRODUCTION Convex deployment (schema migrations included)
npx convex env list                       # see which env vars are set (names only)
npx convex env set <NAME> <VALUE>         # set a Convex-runtime env var on dev
npx convex env set <NAME> <VALUE> --prod  # same, on prod
npx convex run <module>:<function> '{}'   # invoke a function directly (used for one-off migrations)
```

There is no `package.json` script for `tsc` or for any Convex command — all Convex commands above are
run directly via `npx`, confirmed by repeated use in `.superpowers/sdd/task-*-report.md` (e.g.
`.superpowers/sdd/task-5-report.md:37`, `.superpowers/sdd/progress.md:8`).

## Traps that cost real time on this codebase

1. **Convex deploys separately from Vercel, and it's easy to test stale code without noticing.**
   Convex functions live at root `/convex` and only reach the dev deployment when someone runs
   `npx convex dev` (watch mode) or `npx convex dev --once` (one-shot). The Vercel build (`next build`)
   never touches them. If you edit a `convex/*.ts` file and immediately test in the browser without
   pushing first, you are exercising the *previously deployed* function — this produced a real false
   conclusion during the production audit (`.superpowers/sdd/task-3-report.md:86-91`: a slug field and
   `createProfile` change were committed but never pushed, so the running app kept calling the old
   function and slugs silently never appeared). Always `npx convex dev --once` (or have `npx convex dev`
   running in watch mode) before browser-testing anything that touches `convex/`.

2. **The Clerk JWT template named `convex` is a manual, one-time dashboard step with no API.**
   `convex/auth.config.ts:6` hardcodes `applicationID: "convex"` — Convex validates incoming auth tokens
   against a Clerk JWT Template with that exact name. There is no CLI or API call that creates it; it must
   be created by hand in the Clerk dashboard (Configure → JWT Templates → New template → Convex). Its
   absence doesn't error loudly — every authenticated Convex call just fails, and the user reads as
   silently signed out. This bit the audit directly: `.superpowers/sdd/progress.md:8-12` records the
   template going missing and being recreated (`jtmp_3HE8jUsWDtGZiMKA5nqrCpFisld`) as a fix. If a fresh
   Clerk project is ever wired up, this step has to be repeated first.

3. **Production currently points at a DEV Convex deployment**, confirmed repeatedly in
   `.superpowers/sdd/progress.md` (lines 32, 34, 95: "prod points at the dev deployment") and in
   `.superpowers/sdd/audit-dataflow.md:6-7` (the separate `--prod` Convex deployment has **zero documents
   in every table**; `dev:nautical-tortoise-962` — named in `.env.local:2`, not a secret, just an
   identifier — is the one actually serving real users). This matters for two reasons: (a) any
   "production readiness" bug that only manifests under real prod redaction (see Trap 4) is invisible
   today, and (b) the deployment holding real user data is nominally a dev deployment with whatever
   weaker guarantees that implies. UNVERIFIED: whether this is an intentional interim state or an
   oversight — no doc in `.superpowers/sdd/` states an intended timeline to cut over to a real `--prod`
   deployment.

4. **Plain `Error` messages are redacted to the literal string `"Server Error"` on a real production
   Convex deployment.** `lib/errors.ts:9-19` documents the exact shape: a plain `Error` thrown from a
   mutation/action normally arrives on the client wrapped in a transport envelope that still contains the
   original message, but on production that detail is stripped entirely, leaving nothing to unwrap.
   `ConvexError` is the one channel that survives redaction intact — its `.data` payload crosses the
   client/server boundary unmodified (`lib/errors.ts:20-25`). Practical rule: **anything the UI needs to
   branch on, or show verbatim to a user, must be thrown as `new ConvexError({ code, message })`, never a
   plain `throw new Error(...)`.** Because prod today points at the dev deployment (Trap 3), code that
   still throws plain `Error` for user-facing branching *looks* like it works in every manual test — the
   redaction only bites on a real production deployment. `.superpowers/sdd/progress.md:34` records exactly
   this: a duplicate-detection check that regex-matched on error message text was "dead against a true
   prod Convex deployment... works today only because prod points at the dev deployment."

5. **Convex mutations are atomic, so a rate-limit write followed by a throw in the same mutation rolls
   back together — silently defeating the rate limit.** `convex/rateLimit.ts:38-51`'s inline comment spells
   out the consequence directly: if a single mutation calls `checkRateLimit` and then throws (e.g. "wrong
   activation code"), the rate-limit counter write is *part of that same transaction* and rolls back with
   the throw, so repeated bad attempts never actually accumulate toward the limit. The fix used in this
   codebase is to split the check into its own `internalMutation` (e.g.
   `recordActivationAttempt`/`recordClaimAttempt`, `convex/cards.ts:41-64`) invoked via a separate
   `ctx.runMutation` call from a non-transactional `action`, so the rate-limit write commits independently
   of whatever the main mutation does afterward. If you add a new rate-limited mutation, follow this
   split-mutation pattern — don't call `checkRateLimit` inline in a mutation that can also throw for a
   business reason.

## Environment variables (names only — see `.env.example` for the authoritative annotated list)

Next.js/Vercel runtime (`.env.local` for dev, Vercel project settings for deploys):
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPPORT_EMAIL` (optional),
`NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`.

Convex runtime (set via `npx convex env set`, **not** readable from Vercel or `.env.local` — `.env.example`
says this explicitly and in caps because it's a real footgun): `RESEND_API_KEY`, `PAYREX_SECRET_KEY`,
`PAYREX_WEBHOOK_SECRET`.

Which of these are actually set in either deployment today is a Task 1/7 (roadmap) concern — this doc only
confirms the names and where each is read from.
