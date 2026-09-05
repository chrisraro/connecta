# Handoff / Onboarding Documentation Package

Goal: a new developer becomes productive without archaeology, and the design
artifacts can be pulled into a real Figma canvas.

## Global Constraints — READ FIRST

**ACCURACY IS THE WHOLE POINT.** This repo has been burned three times by
documentation describing things that did not exist: a deleted
`PROJECT_CONTEXT.md` describing a fictional WooCommerce architecture, a
`DEVELOPMENT_SETUP.md` citing an `/admin/auth` route that was never built,
and a README claiming Next.js 15 on a Next 16 codebase. A doc that lies is
worse than no doc, because it gets trusted.

For EVERY factual claim:

- Derive it from source. Read the file. Do not reconstruct from memory, and
  do not copy from other docs (they may themselves be stale).
- Cite `file:line` for anything a reader might doubt or need to change.
- If you cannot verify something, write `UNVERIFIED:` and state what you
  checked. Never smooth over a gap with a plausible sentence.
- Use "as of commit <sha>" framing for anything time-sensitive.

Other constraints:

- Never print secret VALUES. Env vars by NAME only. Several are unset — say
  which, because that is load-bearing for onboarding.
- Do NOT modify application code, schema, or config. Write only under
  `docs/handoff/**` (plus your own report).
- Mermaid source goes IN the markdown (GitHub renders it). SVG exports go in
  `docs/handoff/figma/` for Figma import.
- Baseline must stay green: `npx vitest run`, `npx tsc --noEmit`,
  `npx eslint .`, `npm run build`. Docs should not affect these, but confirm.
- Commit per task with a `docs:` prefix.

## Figma reality check — applies to Tasks 2 through 5

`.fig` is a proprietary binary format; it cannot be generated, and Figma's
REST API cannot create files. Do NOT claim otherwise anywhere in the docs.
Three paths DO work, and are what we target:

1. **SVG** — drag/drop straight onto a Figma canvas; arrives as editable
   vectors with real text nodes. Best for ERD, flows, sitemap.
2. **W3C Design Tokens (DTCG) JSON** — imported by the Tokens Studio plugin.
   Best for colours, type, spacing, radii, shadows.
3. **HTML via the html.to.design plugin** — imports a rendered page as Figma
   layers. Best for a component/design-system board.

Every artifact ships with the exact steps to import it.

## Task 1 — PRD + Roadmap

Files: `docs/handoff/01-PRD.md`, `docs/handoff/07-ROADMAP.md`

`01-PRD.md`: what SigmaTap is; who it serves (Philippine market); the two
halves (front store selling physical NFC cards + digital portfolio SaaS);
the personas implied by `profileType` (individual/company/business); the
plan tiers and exactly what each gates — derive from `convex/plans.ts`, do
not guess; the core value loop (tap card → public profile → lead captured);
and explicit non-goals. Derive features from the ROUTES and CONVEX FUNCTIONS
that exist, not from aspiration.

`07-ROADMAP.md`: honest current state, evidenced by `git log` and
`.superpowers/sdd/progress.md`. Must cover: what shipped in the 21-task
production-audit wave (three phases); what is explicitly DEFERRED and why
(payment gateway undecided — PayRex not committed, no keys; see the
`Task 3-DEFERRED` section of
`docs/superpowers/plans/production-audit-fixes.md`); the carried findings
from the whole-branch review; and the outstanding USER actions (rotate
`CLERK_SECRET_KEY` and `RESEND_API_KEY` — both leaked into a transcript;
set the four missing Convex env vars; add a Vercel WAF rule for
`/api/health`; decide the individual-excludes-Products question). Determine
which env vars are actually set via `npx convex env list` or the
`/api/health` endpoint — report NAMES only.

## Task 2 — Tech Stack + Database Schema + ERD

Files: `docs/handoff/02-TECH-STACK.md`, `docs/handoff/03-DATABASE-SCHEMA.md`,
`docs/handoff/04-ERD.md`, `docs/handoff/figma/erd.svg`

`02-TECH-STACK.md`: exact versions from `package.json` (Next, React, Convex,
Clerk, Tailwind, vitest, sonner...). What each piece owns, plus the
non-obvious things a newcomer will trip over:

- Convex functions live at ROOT `/convex` and deploy separately via
  `npx convex dev --once` — NOT with the Vercel build. Testing a browser
  change before pushing Convex means testing stale code; this cost a false
  conclusion during the audit.
- Clerk needs a JWT template named `convex` (`convex/auth.config.ts`), which
  is a MANUAL dashboard step with no API. Its absence silently breaks every
  authenticated Convex call.
- Production currently points at a DEV Convex deployment.
- Plain `Error` messages are REDACTED to "Server Error" on a real production
  deployment, so anything the UI branches on must be `ConvexError` with
  structured `data`.
- Convex mutations are atomic: a rate-limit write followed by a throw in the
  same mutation rolls back together.
  Include the test/lint/build/deploy commands that actually work.

`03-DATABASE-SCHEMA.md`: every table in `convex/schema.ts` — fields, types,
optionality, indexes, and what each is FOR. Flag the known-dead fields the
dataflow audit found (`.superpowers/sdd/audit-dataflow.md`) so nobody builds
on them, and the deliberately frozen legacy values in `lib/storage-keys.ts`.

`04-ERD.md`: a Mermaid `erDiagram` covering all 20 tables with real
relationships and cardinality, derived from `v.id("...")` references. Export
the same diagram to `docs/handoff/figma/erd.svg` using
`npx -y @mermaid-js/mermaid-cli -i in.mmd -o out.svg`. If that fails in this
environment, hand-author clean SVG instead and SAY SO — do not ship a broken
or empty file. VERIFY the SVG: non-trivial byte size, parses as XML, and
contains the table names as text.

## Task 3 — User Flows

Files: `docs/handoff/05-USER-FLOWS.md`, `docs/handoff/figma/user-flows.svg`,
`docs/handoff/figma/sitemap.svg`

Trace each flow through the code; present as Mermaid + prose:

1. Signup/signin (Clerk) → `/auth/callback` → `PostLoginRedirect` → the
   admin vs consumer split.
2. Onboarding wizard → first profile creation → builder.
3. Profile builder edit → save → public profile render.
4. NFC card lifecycle: admin factory registers and writes the tag → printed
   QR → `/t/<uuid>` → signed-in claim vs signed-out signup chain →
   activation by 6-character code → link profile.
5. Lead capture: public profile contact form → lead → dashboard, including
   the offline queue and sync.
6. Shop: browse → cart → checkout → the `PAYMENTS_ENABLED` placeholder. Be
   explicit that live payment is intentionally disabled.

Note plan gating wherever it changes the flow. Also produce a sitemap SVG of
all 39 routes grouped by area (public / auth / dashboard / admin / shop).
Same SVG generation and verification rules as Task 2.

## Task 4 — Design System

Files: `docs/handoff/06-DESIGN-SYSTEM.md`,
`docs/handoff/figma/tokens.json`,
`docs/handoff/figma/design-system-board.html`

Derive everything from source: `app/globals.css` (118 custom properties),
`lib/fonts.ts` (6 families including per-template fonts),
`components/ui/**` (27 primitives), `components/templates/**` (3 profile
templates + 15 sections), and `components.json`. The external
`extract-design-system` skill scrapes a RENDERED site; we own the source, so
source is authoritative. If you also run it against
https://sigmatap.vercel.app, treat the output purely as a cross-check and
say so.

`06-DESIGN-SYSTEM.md`: the colour system including the light/dark/system
triple and how theming works; the typography scale and the font-per-template
mechanism; spacing; the `--r-*` radii and `--e-*` elevation tokens; the
component inventory; and the hard-won layout rules this codebase enforces:

- flex children need `min-w-0`, and `truncate`/`line-clamp` are inert
  without it;
- capped Convex queries need `.order()` or they freeze on the oldest rows;
- `overflow-x: clip` on html/body makes `scrollWidth` useless as an overflow
  detector — measure `body.scrollWidth` or force `overflow-x: visible`.

`tokens.json`: W3C DTCG format, Tokens Studio compatible. OKLCH values MUST
be converted to hex or rgb — Tokens Studio does not understand `oklch()`.
Verify the JSON parses and every colour value is a valid hex/rgb string.

`design-system-board.html`: a single self-contained page (inline CSS, no
external requests) showing colour swatches with names and values, the type
scale, radii, elevations, and the component inventory — importable via
html.to.design, and readable standalone in a browser.

## Task 5 — Index + Figma import guide

Files: `docs/handoff/README.md`, `docs/handoff/figma/README.md`

`README.md`: the start-here. What each numbered doc covers; a 30-minute
"first day" path (clone → env → `npx convex dev` → `npm run dev` → where to
look first); the commands that matter; and a pointer to `/api/health` for
diagnosing a broken environment.

`figma/README.md`: exact, tested import steps per artifact — SVG drag/drop,
Tokens Studio for `tokens.json`, html.to.design for the board. State plainly
that `.fig` cannot be generated and why, so nobody wastes time hunting for
it. Include the fallback if a plugin is paywalled (the SVG path always
works).
