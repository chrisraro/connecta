# Roadmap — current state, what's deferred, what's next

_As of commit `4116d50` on `main`. Evidence: `git log`,
`.superpowers/sdd/progress.md` (the full ledger of the 21-task
production-audit wave), `docs/superpowers/plans/production-audit-fixes.md`,
and direct source reads called out below._

## 1. Where the code came from

`git log --oneline` shows 170 commits total, starting from
`a2e5872 Initial commit: Project scaffold with Next.js 15, Custom Convex
Schema, and Dependencies`. Note: the initial-commit message says "Next.js
15" — the current `package.json` pins `"next": "16.2.12"`
(`package.json`), i.e. the codebase has since moved to Next 16. This is
exactly the kind of stale-version claim this handoff package exists to
avoid repeating — don't trust old commit messages for current versions,
check `package.json`.

Two major development waves are visible in the log before the current one:
a `redesign/product-ux` branch (rebrand, server-rendered slugs, builder
rebuild, legal pages, launch-safety dependency patches) and then the
**production-audit wave**, which is the subject of this document.

## 2. The 21-task production-audit wave

Branch `fix/production-audit`, plan `docs/superpowers/plans/
production-audit-fixes.md`, ledger `.superpowers/sdd/progress.md`. Source
audits: `.superpowers/sdd/audit-convex.md`, `audit-clerk.md`,
`audit-payments.md` (initial), plus two audits run mid-wave:
`audit-dataflow.md` and `audit-journey.md`. Findings going in: "6 Critical,
11 Important, 10 Minor across audit-convex.md / audit-clerk.md /
audit-payments.md" (`.superpowers/sdd/progress.md:18`).

The wave ran in **three phases**, each ending in either a shipped merge or a
whole-branch review that generated the next phase's task list:

### Phase 1 — security-critical fixes + a live production outage
- **Task 1**: `getCardByUuid` was a public, unauthenticated query returning
  the full card document including the manual-claim `activationCode` secret
  — anyone scanning a QR code could read and hijack it. Fixed to a minimal
  projection; `activateCard`/`claimCardByUuid` rate-limited.
  (`.superpowers/sdd/progress.md:19-24`)
- **Task 9**: a **live production signup outage** — the CSP in
  `next.config.ts` blocked `challenges.cloudflare.com` (Clerk's Turnstile
  bot-check), so every signup failed at the CAPTCHA. Confirmed empirically
  against `https://sigmatap.vercel.app`, fixed, and confirmed fixed again
  live: "two real users completed signup 10:44/10:48 UTC minutes after
  deploy, ending a week-long signup drought" (`.superpowers/sdd/progress.md:26`).
- **Task 2**: webhook integrity — failure visibility, replay-window
  enforcement, and a refund-terminal guard on payment webhooks.
- **Task 10**: NFC write IO-error handling (tag-lost race).
- Shipped to `main` at `8c40119` (Tasks 1+9) and `77b35ca` (Tasks 2+10),
  Convex functions pushed in lockstep (`.superpowers/sdd/progress.md:26,39`).

### Phase 2 — the journey audit and 5 core-journey blockers
A dedicated `audit-journey.md` found "5 Blockers / 6 Majors / 3 Minor"
(`.superpowers/sdd/progress.md:40`). All 5 blockers were fixed:
- **Task 12**: the onboarding wizard's first-profile path didn't go through
  the same plan-aware creation path as every subsequent profile —
  live-verified end to end with a genuinely fresh 0-profile Clerk user.
- **Task 13**: saving the builder with a block hidden **destroyed that
  block's data** instead of just hiding it — 7 affected blocks, all fixed
  by construction (the filtering logic was removed, not special-cased).
- **Task 14**: the onboarding wizard was unusable on phone — verified with
  real-click hit-testing at 320/360/390/430px.
- **Task 15**: replaced 31 raw `alert()`/silent-failure sites in the core
  journey with toast/dialog UX. A real information-leak was found and fixed
  during review (a formatter regex could let raw stack frames reach the
  user on an edge case) — see `02-TECH-STACK.md` for why this class of bug
  matters here (`Error` vs `ConvexError` on a real prod deployment).
- **Task 5**: non-admin users could not upload a profile picture at all.

Also in Phase 2: Task 16 (catalog prices were being scaled 100x on some
render paths — storage-unit convention was undocumented, now fixed with a
single documented convention), Task 11 (Pro-tier gating rendered as visible
locked CTAs instead of vanishing features, plus the payment placeholder —
see §3), Tasks 3+7 (webhook observability, card-deletion guard so an admin
can't hard-delete an active customer card), Task 6 (capped Convex queries
were missing `.order()`, so they silently froze on the *oldest* rows forever
instead of showing new ones — see `06-DESIGN-SYSTEM.md`/`02-TECH-STACK.md`
for this as a general codebase rule), Task 4 (account deletion now actually
deletes the Clerk identity + a Clerk deletion webhook exists), Task 8 (the
`/api/health` endpoint — see §4).

Phase 2 ended in a **whole-branch review** (`d5424b5..516f22e`, 37 commits)
that found 3 Critical + 6 Important + more, all live at the time:
- C1: several NFC-activation and rate-limit code paths still threw plain
  `Error` instead of `ConvexError` — invisible in dev (plain `Error` shows
  its real message) but on a genuine production Convex deployment, plain
  `Error` is redacted to the literal string `"Server Error"`
  (`.superpowers/sdd/progress.md:95`) — see `02-TECH-STACK.md`.
- C2: `payrex.ts:33` `createCheckoutSession` was reachable unauthenticated
  over guessable order numbers.
- C3: onboarding's edit mode discarded all edits and lied that the profile
  was created — live at the time.
- Plus I1–I6 (shop-checkout raw `alert()`, lead-limit keyed on the victim
  not the offender, unmetered discount validation, dead upload-validation
  code, Pro users blocked from a 2nd profile by a missing check, admins
  ejected from the consumer dashboard so the owner couldn't dogfood their
  own product) and a new risk: `convex/billing.ts:423`
  `internalDowngradeExpired` collects the **entire `users` table** inside
  the daily cron with no pagination — verified still present, unpaginated,
  as of this commit (`convex/billing.ts:418-436`, `ctx.db.query("users").collect()`
  at line 423). This is a silent platform-wide revenue-leak risk if the
  table ever crosses Convex's read limit; **carried, not yet fixed**.

### Phase 3 — closing what the whole-branch review found
- **Task 17**: fixed C3 properly — the first fix attempt traded one
  data-loss bug for another (merging stale `onboardingData` over live
  builder fields); the real fix hydrates edit mode from the live profile
  (`.superpowers/sdd/progress.md:101-105`).
- **Task 18**: finished the `ConvexError` conversion across cards/leads/
  checkout (closing C1), and found `validateDiscount` was a Convex *query*
  — queries cannot write, so it was **completely unmeterable**, not merely
  unmetered. Converted to a rate-limited action.
- **Task 19**: closed C2 (guest checkout now requires an opaque
  `orders.guestOrderToken`, added as an optional schema field so existing
  rows still validate) and I4 (upload validation is now live-wired, not
  dead code).
- **Tasks 20+21**: I5 (Pro users can create a 2nd profile — routed through
  the same plan-aware helper as onboarding) and I6 (admins can now reach and
  stay in the consumer dashboard — see `05-USER-FLOWS.md` for the redirect
  mechanism). Task 21 fixed a real bug found *during* Task 20's review: the
  onboarding wizard's "Finish →" button only advanced to a summary screen
  and did **not** complete onboarding — closing the tab there left the user
  with no profile despite the button saying "Finish". Now "Finish →" calls
  the real completion mutation.

**Wave total**: 21 tasks, test count grew from 126 to 366, all four gates
(vitest, tsc, eslint, build) reported green at completion
(`.superpowers/sdd/progress.md:130`).

## 3. Explicitly DEFERRED — payment gateway

`docs/superpowers/plans/production-audit-fixes.md:68-71` records a product
decision: **the team has not committed to PayRex or any other gateway; no
keys exist and none are coming soon.** Payment-gateway production readiness
is explicitly out of scope for this wave. What was in scope instead
(rescoped Task 3) was fast-follow safety work on the webhook path that
already existed (a dead-code deletion and an observability log), not new
gateway integration.

The original, larger PayRex scope was moved to **`Task 3-DEFERRED`**
(`docs/superpowers/plans/production-audit-fixes.md:86-110`) to revive when a
gateway is chosen:
- `payrex.ts:33-141` creates a fresh checkout session on every call — a
  double-click produces two payable sessions for one order.
- `payrex.ts:93-98` sends discounts as a **negative** line-item amount, but
  PayRex requires positive integer amounts and has no discount field, so
  every discounted order would fail session creation *after* the cart was
  already cleared.
- `checkout.ts:290-311` guest order confirmation throws Unauthorized (a
  pre-existing in-code TODO) — needs a guest access-token design.
- Cart-clearing ordering relative to session creation needs verification.

In the meantime, live payment is **hard-disabled in code**, not a runtime
config flag: `lib/payments.ts:18` — `export const PAYMENTS_ENABLED = false;`.
Both the shop checkout and the Pro-upgrade flow render a shared
`PaymentPlaceholderDialog` instead of charging anything
(`components/billing/PaymentPlaceholderDialog.tsx`). Task 19 verified the
disabled path does not create an unpayable pending order and does not clear
the cart (`.superpowers/sdd/progress.md:70`, Task 11 completion note).

## 4. Carried findings — real, not yet fixed, and known

These were found during the wave, deliberately **not** fixed (either
descoped, or a genuine follow-up), and remain true as of this commit unless
noted:

- **`convex/billing.ts:423`** — `internalDowngradeExpired` runs inside the
  daily cron and does `ctx.db.query("users").collect()` with no pagination.
  Verified present in source at the cited line. Confirmed still unpatched.
- **Branded money types** — `formatPHP(centavos)` (`lib/payment.ts:35`) and
  `formatCatalogPrice(pesos)` (`lib/payment.ts:48`) both take a plain
  `number`, so passing the
  wrong unit is a silent 100x error with no type-level catch (this exact
  class of bug is what Task 16 fixed at the render boundary — see
  `06-DESIGN-SYSTEM.md`). Recommended fix (branded `Centavos`/`Pesos`
  types) not implemented.
- **Health-route rate limiting** — `/api/health` (`app/api/health/route.ts`)
  has no in-code rate limiter. Deliberate: on Vercel serverless, in-memory
  per-IP state is per-instance and resets on cold start, so an in-code
  limiter "would look like protection while providing little — security
  theater is worse than a documented gap"
  (`.superpowers/sdd/progress.md:90`). The correct fix is a **Vercel WAF /
  firewall rate rule**, which is a dashboard action, not code — recorded as
  a USER action below. The route leaks no secret material regardless
  (adversarially reviewed, `.superpowers/sdd/progress.md:89`).
- **Team locked-state UI idiom** — the team page uses a second, different
  "locked feature" pattern (an `EmptyState` swap) instead of the
  `UpgradeGate` component used elsewhere. Not a bug (nothing vanishes), a
  consistency follow-up.
- **Residual `alert()` calls** — `app/admin/factory/page.tsx` still uses
  `alert()` on 4 lines: 253, 278, 304, 337 (verified present at these lines
  in source). Progress notes flagged 304 and 337 specifically as
  "unreachable in practice" guard branches (`.superpowers/sdd/progress.md:73`);
  line 278 (`alert(error.message)`) was not separately called out in the
  ledger — UNVERIFIED whether it was considered and accepted, or missed;
  treat it as an open item.
- **`individual`-excludes-Products** — `lib/profileSections.ts:20-21`
  currently prevents `individual`-type profiles from adding a Products
  block at all. Flagged explicitly as an **unresolved product decision**,
  not a bug: "Possibly intentional, possibly not."
  (`.superpowers/sdd/progress.md:63`). Needs an owner decision.
- **Rollback/TOCTOU minutiae carried from Task 1**: `rateLimit.ts`'s
  read-then-insert has a pre-existing TOCTOU race shared by all callers; a
  nested double `checkRateLimit` in one mutation can let a per-key increment
  roll back if the aggregate check then throws (only manifests when the
  aggregate is already saturated) (`.superpowers/sdd/progress.md:22,114`).
- **Discount-validation shared bucket** — shop-wide rate limits are a single
  shared bucket across all shoppers (no per-tenant `ownerId` on `shop.ts`),
  so concurrent shoppers during a sale could trip a 30/min global cap and
  block everyone for up to 60s. Fails safe (rejects, no corruption) but is a
  self-inflicted availability risk (`.superpowers/sdd/progress.md:111`).
- UNVERIFIED beyond what's cited above: whether any Minor findings from the
  original three audit reports (`audit-convex.md`, `audit-clerk.md`,
  `audit-payments.md`) remain unaddressed — the ledger says they were
  "triaged at final review" (`docs/superpowers/plans/production-audit-fixes.md:210`)
  but this task did not re-read all three audit reports line-by-line
  against current source to confirm each Minor's disposition.

## 5. Outstanding USER actions

These require dashboard/CLI access this documentation task does not have,
or a human decision — collected from the plan and the ledger:

1. **Rotate `CLERK_SECRET_KEY` and `RESEND_API_KEY`.** Both leaked into a
   transcript during the audit wave
   (`docs/superpowers/plans/production-audit-fixes.md:206`,
   `.superpowers/sdd/task-8-brief.md:17`). Rotate both credentials at their
   respective dashboards, then update the Convex env value (see below) —
   never re-paste the old value anywhere.
2. **Set the missing Convex environment variables.** Verified live via
   `npx convex env list` in this session (names only, no values printed):
   currently **set** — `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`. Currently
   **missing** — `PAYREX_SECRET_KEY`, `PAYREX_WEBHOOK_SECRET`,
   `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`. This matches the
   independent `/api/health` finding recorded in the ledger at the time of
   Task 8 (`.superpowers/sdd/progress.md:88`). `CLERK_SECRET_KEY`'s absence
   means server-side Clerk Backend API calls (e.g. the real-deletion path in
   Task 4) run in a degraded, non-fatal "pending configuration" mode today —
   see `05-USER-FLOWS.md`. The two `PAYREX_*` vars are blocked on the
   gateway decision in §3.
3. **Add a Vercel WAF rate-limit rule for `/api/health`.** See §4 — this is
   a dashboard-only mitigation; no code change is expected to accompany it.
4. **Decide the `individual`-excludes-Products question.** See §4 — pick an
   intended behavior for `lib/profileSections.ts:20-21` (block Products for
   individuals, or don't) and file it as a normal product change.
5. UNVERIFIED by this task: whether a Clerk **production** instance exists
   yet, versus the dev-instance-keys-in-production risk flagged during
   Task 9 planning (`docs/superpowers/plans/production-audit-fixes.md:213-219`
   area). Not re-checked here; confirm current Clerk dashboard state before
   relying on this doc for that fact.

## 6. What this means for a new developer, practically

- Don't build on `properties`, `projects`, or `profiles.services` — they're
  dead tables/fields (§ non-goals in `01-PRD.md`, evidenced by the dataflow
  audit).
- Don't add code that depends on `PAYREX_SECRET_KEY` or
  `PAYREX_WEBHOOK_SECRET` being set in any environment you can reach today —
  they aren't, and the gateway itself isn't committed to.
- If you touch anything under `convex/billing.ts`'s cron path, the
  unpaginated `internalDowngradeExpired` query is a known landmine — don't
  copy its pattern.
- Treat `/api/health` as your first diagnostic stop for "why is nothing
  working" — see `02-TECH-STACK.md` / `docs/handoff/README.md`.
