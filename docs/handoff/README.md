# SigmaTap — Handoff Documentation

_As of commit `4116d50` on `main` (this package was written on
`docs/handoff-package`, branched from that commit)._

Start here. This package exists so a new developer becomes productive
without archaeology — every claim in every doc below is derived from source
and cited `file:line`, not reconstructed from memory or copied between
docs. If a doc can't verify something, it says `UNVERIFIED:` instead of
guessing. Treat that convention as load-bearing: it's the thing that keeps
this package trustworthy after the code moves on.

## What SigmaTap is

SigmaTap (`package.json:2`) is a two-sided product for the Philippine
market: a **front store** selling physical NFC business cards
(`app/shop/**`), and a **digital-portfolio SaaS** where buyers build a
public profile page and link it to their card, so tapping the card on any
phone opens that profile. The core value loop is **tap card → public
profile → lead captured**. Three plan tiers (free/pro/business) gate
profile count, active cards, templates, lead visibility, and team seats —
enforced server-side in `convex/plans.ts`, not just in the UI. Live payment
processing is intentionally disabled right now (`PAYMENTS_ENABLED = false`
in `lib/payments.ts:18`) pending a gateway decision — see `07-ROADMAP.md`.

## The seven docs

| Doc | Answers |
|---|---|
| [`01-PRD.md`](./01-PRD.md) | What SigmaTap is, who it serves (the `profileType` personas), the plan tiers and exactly what each gates, the core value loop, and explicit non-goals |
| [`02-TECH-STACK.md`](./02-TECH-STACK.md) | Exact dependency versions, what each package owns, the commands that work, and five "traps that cost real time on this codebase" (Convex deploys separately from Vercel, the Clerk JWT template, prod pointing at a dev Convex deployment, `Error` vs `ConvexError` redaction, mutation atomicity) |
| [`03-DATABASE-SCHEMA.md`](./03-DATABASE-SCHEMA.md) | Every field/type/index in all 20 tables of `convex/schema.ts`, plus which fields are confirmed **dead** (don't build on them) and the frozen legacy `localStorage` key literals in `lib/storage-keys.ts` |
| [`04-ERD.md`](./04-ERD.md) | A Mermaid `erDiagram` of all 20 tables and their real (and dead) foreign-key relationships |
| [`05-USER-FLOWS.md`](./05-USER-FLOWS.md) | Six core flows traced through actual code (signup/admin split, onboarding, builder save, NFC card lifecycle, lead capture + offline queue, shop checkout) plus a sitemap of all 39 routes |
| [`06-DESIGN-SYSTEM.md`](./06-DESIGN-SYSTEM.md) | The colour system (oklch, light/dark/system theming), typography (6 font families, per-template mechanism), spacing, the `--r-*`/`--e-*` scales, the component inventory, and three hard-won layout rules previously-shipped bugs taught this codebase |
| [`07-ROADMAP.md`](./07-ROADMAP.md) | Honest current state: what shipped in the 21-task production-audit wave, what's explicitly deferred (the payment gateway), carried-but-unfixed findings, and outstanding actions only a human/dashboard can do |

Companion Figma import artifacts live under `docs/handoff/figma/` — see
[`figma/README.md`](./figma/README.md) for how to pull them into an actual
Figma canvas.

## First day: 30 minutes, start to running

1. **Clone and install.**
   ```bash
   git clone <repo-url>
   cd Tapfolio
   npm install
   ```
2. **Env vars.** Copy `.env.example` to `.env.local` and fill in the
   Next.js/Vercel-side vars it documents (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
   `CLERK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`). `NEXT_PUBLIC_CONVEX_URL` and
   `CONVEX_DEPLOYMENT` get filled in automatically by step 3. `.env.example`
   itself documents which vars belong to the Next.js runtime versus the
   separate Convex runtime — read its comments, they're not boilerplate.
3. **Start Convex** (separate deploy target — see Trap 1 in
   `02-TECH-STACK.md`, this is the single most common way to waste an
   afternoon on this codebase):
   ```bash
   npx convex dev
   ```
   Leave this running in watch mode. It pushes `convex/*.ts` to your dev
   deployment on every save and writes `NEXT_PUBLIC_CONVEX_URL` /
   `CONVEX_DEPLOYMENT` into `.env.local` for you on first run.
4. **Start the app**, in a second terminal:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.
5. **Note:** authenticated Convex calls need a Clerk JWT Template named
   exactly `convex` — a one-time manual dashboard step with no CLI/API
   equivalent (Trap 2 in `02-TECH-STACK.md`). If sign-in works but every
   Convex call silently fails, this is almost certainly why.

### The first three files to open

To understand the shape of the codebase quickly, in this order:

1. **`convex/schema.ts`** — the data model. Everything else hangs off these
   20 tables; `03-DATABASE-SCHEMA.md` is the annotated tour of this file.
2. **`app/dashboard/builder/page.tsx`** — the single largest, most central
   piece of consumer-facing logic (profile creation/edit/save, plan-gate
   enforcement, the entry-redirect guard). Traced end-to-end in
   `05-USER-FLOWS.md` §3.
3. **`components/templates/ProfileRenderer.tsx`** — the single entry point
   for rendering a public profile across all three templates; explains how
   `layoutConfig`/`agentInfo`/theme data become the page a visitor actually
   sees. `06-DESIGN-SYSTEM.md` covers the composition system this file
   consumes.

## Commands that actually matter

```bash
# Frontend
npm run dev            # next dev — local dev server
npm run build           # next build — production build (what Vercel runs)
npm run start            # next start — serve a production build locally
npm run lint             # eslint (eslint.config.mjs)
npm run test              # vitest run — one-shot, both test projects
npm run test:watch        # vitest — watch mode
npx tsc --noEmit           # typecheck only — no package.json alias exists for this

# Convex (separate deploy target)
npx convex dev            # watch mode — pushes convex/ on every save
npx convex dev --once      # one-shot push, then exit — what CI/scripted runs use
npx convex deploy           # push to the PRODUCTION Convex deployment (schema migrations included)
npx convex env list                        # see which Convex-runtime env vars are set (names only)
npx convex env set <NAME> <VALUE>          # set a Convex-runtime env var on dev
npx convex env set <NAME> <VALUE> --prod   # same, on prod
```

Before pushing any change, the four gates that must stay green are
`npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npm run build` — see
`02-TECH-STACK.md` for the full command reference and the traps above for
why a green build can still hide a broken Convex call.

## When something is broken, check this first: `GET /api/health`

`app/api/health/route.ts` is a public, unauthenticated diagnostic endpoint —
hit it (locally: `http://localhost:3000/api/health`) before debugging
anything deeper. It reports:

- `convex: boolean` — whether the configured Convex deployment is reachable
  at all (drives the HTTP status: `200` when reachable, `503` when not).
- `env: { ... }` — **boolean presence**, never the value, of each required
  Next.js/Vercel-side var (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CONVEX_URL`).
- `payments: { ... } | null` — same boolean-presence treatment for the
  Convex-runtime secrets (`PAYREX_SECRET_KEY`, `PAYREX_WEBHOOK_SECRET`,
  `RESEND_API_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`,
  `NEXT_PUBLIC_APP_URL` again on the Convex side).
- `status: "healthy" | "degraded" | "unhealthy"` — `degraded` means Convex
  is reachable but some var above is unset; this is expected right now.

**Several of these are currently unset — that's a known, documented state,
not a signal that your local setup is broken.** As of the last verified
`npx convex env list` (see `07-ROADMAP.md` §5): `PAYREX_SECRET_KEY`,
`PAYREX_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`, and
`CLERK_WEBHOOK_SIGNING_SECRET` are missing on the Convex side, and the
payment gateway itself is undecided — see `07-ROADMAP.md` for the full
list of outstanding user actions (credential rotation, which vars are set
where, the Vercel WAF rule for this endpoint) before assuming any of this
needs fixing.

---

## Things this project does NOT have

Called out because their absence is easy to mistake for "I haven't found it yet."

**No CI pipeline.** There is no `.github/workflows/`. The four gates below are enforced by
convention and review only — nothing blocks a push that breaks them. Run them yourself before
you push:

```bash
npx vitest run      # 366 tests / 47 files
npx tsc --noEmit
npx eslint .        # 0 errors expected; ~31 pre-existing warnings in convex/ are accepted
npm run build
```

The only automated check is Vercel's own build on push to `main`, which will fail the deploy on a
type or build error but does NOT run the test suite.

**No error tracking or observability tool.** No Sentry, no LogRocket, no APM. What you have is
`GET /api/health` (boolean env presence + Convex reachability), Vercel's function logs, and the
Convex dashboard's logs. A user-facing exception in production reaches you only if someone reports
it. Adding error tracking is an open item in `07-ROADMAP.md`.

**No automated access provisioning.** Three dashboards gate real work, and access is granted by
hand by the project owner:

| Dashboard | Needed for |
| --- | --- |
| Convex | env vars, live data, function logs, deploy keys |
| Clerk | the `convex` JWT template, session settings, user records |
| Vercel | env vars, deployments, domains, firewall rules |

Several documented steps (creating the Clerk JWT template, setting Convex env vars, the WAF rule
for `/api/health`) can ONLY be done in those dashboards — there is no API or CLI path. If you have
not been added to them, you are blocked on the owner, not on the code.
