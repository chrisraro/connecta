# Production Audit Fixes

Source evidence: `.superpowers/sdd/audit-convex.md`, `.superpowers/sdd/audit-clerk.md`,
`.superpowers/sdd/audit-payments.md` (2026-08-20). Branch: `fix/production-audit`.

## Global Constraints

- TDD is mandatory: write the failing test FIRST, watch it fail for the right
  reason, then implement. Convex logic tests use `convex-test` + vitest,
  matching the style of `convex/cards.test.ts`.
- Baseline stays green: 126 existing tests, `npx tsc --noEmit`, `npx eslint .`
  (0 errors; 31 pre-existing warnings in convex/ are accepted), `npm run build`.
- Do NOT touch: `lib/storage-keys.ts` literals, `lib/brand.test.ts` guard
  logic, `app/admin/factory/page.tsx` PRODUCTION_DOMAIN derivation.
- Never print secret values. Env vars are referenced by NAME only.
- Public API shapes consumed by existing UI keep their contract unless the
  task explicitly says otherwise; when a return shape changes, update every
  consumer in the same task.
- Convex mutations are transactions; prefer fixing state machines inside the
  mutation over compensating client-side.
- Commit per task with a conventional prefix and a body explaining mechanism.

## Task 1 — Stop leaking activation codes; rate-limit activation

**Files:** `convex/cards.ts`, `convex/rateLimit.ts` (reference only), `app/t/[uuid]/page.tsx` (consumer check), `convex/cards.test.ts`

`getCardByUuid` (cards.ts:98-107) is a public unauthenticated query returning
the FULL card document — including `activationCode`, the manual-claim secret.
Anyone scanning any card's QR (or enumerating `/t/<uuid>`) can read the code
for unsold inventory and hijack it.

1. Test first: `getCardByUuid` result must not contain `activationCode` (and
   not `ownerId` either — custodial admin id is also nobody's business).
   Return a minimal projection: `_id`, `uuid`, `status`, `linkedProfileId`.
   Check `app/t/[uuid]/page.tsx` (the only consumer) uses nothing else.
2. Test first: `activateCard` under repeated wrong codes throws a rate-limit
   error after N attempts. Wire `checkRateLimit` (see how other mutations in
   the codebase call it — grep `checkRateLimit` for the established pattern)
   into BOTH `activateCard` and `claimCardByUuid` keyed by user identity.
3. Keep the existing legacy-code fallback behavior intact (tests exist).

## Task 2 — Webhook failure visibility, replay window, refund-terminal guard

**Files:** `convex/http.ts`, `convex/checkout.ts`, new/extended tests in `convex/checkout.test.ts` (+ a small http handler test if feasible)

Three payment-integrity defects:
- http.ts:136-166 runs mutations, discards results, always returns 200. A
  failed `internalConfirmOrderPayment` = money captured, order never marked
  paid, PayRex never retries (it saw 200), nobody alerted.
- http.ts:80-90 verifies the signature but never checks the `t` timestamp:
  any captured webhook replays forever.
- checkout.ts:391-401 idempotency guard only treats `paid` as terminal; a
  duplicate `paid` delivered after `markOrderRefunded` re-decrements
  inventory, re-increments discount usage, re-emails the customer.

1. Test first (checkout): confirm-payment on an order whose `paymentStatus`
   is `refunded` is a NO-OP (no inventory change, no email scheduled, no
   status change). Then widen the terminal-state guard.
2. Test first (http helper): extract the timestamp-window check into a pure,
   exported helper (e.g. `isWebhookTimestampFresh(t, nowMs, windowMs)`), test
   boundaries, then enforce a 5-minute window in the handler (reject = 400).
3. Wrap the webhook's mutation dispatch: if the internal mutation throws,
   log `console.error` with event id + type (no payload dump, no PII) and
   return 500 so PayRex retries. Unknown event types keep returning 200.
   The processed-event idempotency that already exists must make retries safe
   — verify that in a test (same event id twice = second is a no-op).

## Task 3 — RESCOPED (2026-08-21): Task-2 fast-follows only

**Product decision:** the team has NOT committed to PayRex (or any gateway);
no keys exist and none are coming soon. Payment-gateway production readiness
is explicitly NOT a deliverable. The PayRex-specific items originally here —
checkout-session idempotency, discount line-item distribution, guest order
view — are DEFERRED until a gateway is chosen (they live in the audit report
`.superpowers/sdd/audit-payments.md` and this plan's history; do not lose
them). What remains in Task 3:

1. `convex/checkout.ts` internalConfirmOrderPayment: `console.error` (event
   context, no PII) when the mutation returns `{success:false,
   reason:"order_not_found"}` — the reviewer-elevated observability gap.
   Keep returning 200 (permanent mismatch; retries add nothing).
2. Delete the dead early-return at checkout.ts:391-393 subsumed by
   TERMINAL_PAYMENT_STATUSES.
3. Tests for both (the order_not_found log can be asserted via a spy).

## Task 3-DEFERRED (original scope, revive when a gateway is chosen)

**Files:** `convex/payrex.ts`, `convex/checkout.ts`, `app/shop/order/**` consumer if needed, tests in `convex/checkout.test.ts` / new `convex/payrex.test.ts` for pure helpers

- payrex.ts:33-141 creates a fresh PayRex checkout session on every call:
  double-click = two payable sessions for one order. `convex/billing.ts`
  already solved this ("Payments audit #2" comment) by reusing a pending
  session — mirror that pattern for shop checkout.
- payrex.ts:93-98 sends the discount as a NEGATIVE line_items amount. PayRex
  requires positive integer amounts and has no discount field, so EVERY
  discounted order fails session creation — after the cart was already
  cleared. Fix: distribute the discount across line items proportionally
  (largest-remainder so centavos sum exactly), or collapse to a single
  "Order total" line item; pick whichever keeps the receipt meaningful, and
  extract the amount math into a pure, exported, tested helper. Total sent
  to PayRex must equal the order's stored total exactly (integer centavos).
- checkout.ts:290-311: guest order confirmation throws Unauthorized (in-code
  TODO). Design: `getOrderByNumber` allows unauthenticated access ONLY when
  the caller presents the order's `guestAccessToken` — check the orders
  schema for an existing token/email field first and reuse it; if none, add
  an opaque token generated at order creation, returned to the guest client
  once, and required as an optional arg. Signed-in owners keep working as
  today. Test both paths first.
- Cart clearing: move it AFTER successful session creation if it currently
  happens before (verify; the audit says carts clear then session fails).

## Task 4 — Make account deletion real (Clerk identity) + external-deletion webhook

**Files:** `convex/users.ts` (deleteMyAccount), a new Convex action for the
Clerk Backend API call, `convex/http.ts` (new Clerk webhook route), schema if
needed, tests

- The Settings "Delete Account" flow wipes Convex data and claims RA-10173
  permanent erasure, but never deletes the Clerk identity — signing back in
  silently resurrects the account.
- No Clerk webhook exists: accounts deleted via Clerk dashboard/API orphan
  all their Convex data.

1. Add an action that calls Clerk's Backend API `DELETE /v1/users/{id}` using
   `CLERK_SECRET_KEY` from Convex env. Fail-fast with a clear error if the
   env var is unset (it currently IS unset in the deployment — the code must
   degrade to "Convex data deleted; identity deletion pending configuration"
   surfaced to the caller, NOT a silent success). deleteMyAccount orchestrates:
   erase Convex data (existing logic) then schedule the identity deletion.
   Tests: mock fetch; assert the endpoint/method; assert graceful degradation
   when env missing.
2. Add `POST /clerk-webhook` HTTP route verifying the Svix signature
   (`CLERK_WEBHOOK_SIGNING_SECRET` env, `svix-id`/`svix-timestamp`/
   `svix-signature` headers — implement HMAC verification as a pure tested
   helper; do NOT add the svix npm package, Convex runtime supports Web
   Crypto). On `user.deleted`: run the existing erasure logic for that
   clerkId (idempotent if no row). Unknown events → 200. Bad signature → 400.
   Missing env → 500 + console.error (so it's visible, not silently open —
   and the route must NOT process anything when the secret is unset).
3. Document (in the task report + ledger) the two USER actions this enables:
   set CLERK_SECRET_KEY in Convex env; create the webhook endpoint in the
   Clerk dashboard pointing at `https://<convex-site-url>/clerk-webhook`
   with the user.deleted event, and set CLERK_WEBHOOK_SIGNING_SECRET.

## Task 5 — Unbreak profile-picture upload for regular users

**Files:** `convex/images.ts`, `convex/images.test.ts`

`generateUploadUrl` calls `requireAdmin`, but the profile builder and
onboarding call it for every signed-in user — avatar upload is broken for all
non-admins. Test first: a non-admin authenticated identity CAN get an upload
URL; an unauthenticated caller CANNOT. Replace `requireAdmin` with the
codebase's requireUser-equivalent (see authz.ts) and add `checkRateLimit`
(uploads are abuse-prone). Keep any existing validation.

## Task 6 — Index discipline: kill the full-table scans

**Files:** `convex/teams.ts`, `convex/admin.ts`, `convex/adminShop.ts`, `convex/shop.ts`, tests

Replace JS-side filtering over full-table `.collect()` with the indexes that
already exist in schema.ts. No return-shape changes.

- teams.ts:75,129,274,307 — use `by_teamId` on users.
- adminShop.ts getOrders/getSalesStats/getShopAnalytics — use
  `by_status`/`by_paymentStatus`/`by_createdAt` ranges instead of collecting
  all orders. Where a true aggregate over everything is required, cap the
  window (e.g. stats over the last 90 days via `by_createdAt`) and label the
  UI string accordingly if one exists.
- admin.ts getAllUsers — fix the N+1 (batch the sub-lookups); add
  `.take(500)` caps with a clear constant; same for getCards.
- shop.ts getProducts — keep the public shape, but query via the published
  index and `.take(200)` cap; in-memory search/sort may remain over the
  capped set.

Tests: for each converted function, a behavior-preservation test (seed rows
on both sides of the filter boundary, assert identical results pre/post) —
write it against the CURRENT behavior first so it fails if the conversion
changes results.

## Task 7 — deleteCards safety guard

**Files:** `convex/admin.ts`, `convex/cards.test.ts` or admin test file

deleteCards hard-deletes any card regardless of status; an admin can destroy
a customer's ACTIVE card row (policy elsewhere: physical cards are never
deleted, only returned to inventory). Test first: deleting an `active` card
throws; deleting `inventory` cards succeeds; the result reports skipped ids.
Only `inventory` (and `lost`) cards may be deleted.

## Task 8 — Health check + payments preflight

**Files:** new `app/api/health/route.ts`, `convex/health.ts` (query), tests

A GET /api/health route (public, no auth, no secrets) returning JSON:
- `convex`: can the app reach Convex (call a trivial public query)?
- `env`: booleans for presence of each required NEXT_PUBLIC_* on the web side.
- `payments`: a Convex query reporting boolean presence (NOT values) of
  PAYREX_SECRET_KEY / PAYREX_WEBHOOK_SECRET / RESEND_API_KEY in the Convex
  environment, so a misconfigured payments path is visible before a customer
  hits it.
Cache-Control: no-store. Test the Convex query with convex-test; the route
handler with a unit test if the harness allows, else document manual curl.

## Not in scope (recorded for the final review + user actions)

- USER: rotate CLERK_SECRET_KEY + RESEND_API_KEY (leaked in transcripts);
  set PAYREX_SECRET_KEY / PAYREX_WEBHOOK_SECRET / CLERK_SECRET_KEY /
  CLERK_WEBHOOK_SIGNING_SECRET in Convex env; create Clerk prod instance
  (dev keys in prod); create Clerk dashboard webhook (Task 4 doc).
- Minor findings from all three audit reports: triaged at final review.
- Error-reporting service (Sentry etc.): needs an account decision.

## Task 9 — Fix production signup (CSP blocks Clerk CAPTCHA); solidify auth flow

**Files:** `next.config.ts`, new `lib/csp.test.ts` (or colocated), possibly `app/(auth)/**` UX

ROOT CAUSE (empirically confirmed on https://sigmatap.vercel.app 2026-08-20):
the CSP in next.config.ts blocks `https://challenges.cloudflare.com/turnstile/v0/api.js`.
Clerk mounts bot protection (`#clerk-captcha` div is present) but the widget
never loads; submit produces `400 POST /v1/client/sign_ups` and the visible
error "The CAPTCHA failed to load… try a different browser". Email/password
signup is 100% broken in production. Console also shows blob: worker creation
blocked (no `worker-src`, falls back to script-src without `blob:`), which
degrades Clerk's session web workers.

1. Test first: a vitest that loads the CSP string out of next.config.ts and
   asserts: `script-src` includes `https://challenges.cloudflare.com`;
   `frame-src` includes `https://challenges.cloudflare.com` (Turnstile
   renders in an iframe); a `worker-src 'self' blob:` directive exists;
   `connect-src` includes `https://challenges.cloudflare.com`. Watch it fail.
2. Amend the CSP minimally — add exactly those sources; do not loosen
   anything else (no wildcards beyond what exists).
3. Verify locally (`npm run build` + `npm run start` and curl the header, or
   assert via the test) and run the full gate suite.
4. Auth-flow solidification, scoped to what is verifiable now:
   - sign-in page: same CSP fix covers it; verify no other console errors.
   - Confirm the card_uuid signup chain still renders (no regression to the
     Task-earlier NFC flow): /t/<uuid> signed-out → /auth?mode=signup&card_uuid.
   - The Clerk-side "unsupported browser" message is Clerk-rendered and goes
     away once the widget loads; no custom error UI needed.
5. Out of scope, record for the user: production still runs the Clerk DEV
   instance (pk_test / sunny-skunk-50). Clerk production instances require a
   custom domain (CNAME) — impossible on *.vercel.app alone — so the real
   migration waits for the planned .ph domain purchase. Dev-instance limits
   (user cap, dev banner in Clerk components) remain until then.

## Task 10 — NFC factory write: "Failed to write due to an IO error: null"

**Files:** `app/admin/factory/page.tsx`, new `lib/nfc.ts` + `lib/nfc.test.ts`

ROOT CAUSE (code-read + Chromium Web NFC internals): the error is Chromium
appending Android's underlying TagLostException message — literally `null` —
to "Failed to write due to an IO error: ". The tag lost coupling mid-write.
The handler in factory/page.tsx makes this common and unrecoverable:
- `onreading` has NO re-entrancy guard — Chrome re-fires it on every tag
  re-couple, so a wobbling card spawns CONCURRENT `ndef.write()` calls that
  race each other on the serialized NFC stack.
- No retry: a single transient coupling loss surfaces raw to the admin.
- If the write succeeds but `registerCard` throws (e.g. duplicate uuid), the
  scan keeps running and immediately re-fires into another write.
- The raw DOMException text (with its "null") is shown verbatim.

1. TDD the logic as pure modules in `lib/nfc.ts` (hardware-free tests):
   - `classifyNfcWriteError(err: unknown)` → `{ kind: "tag-lost" | "not-supported" | "permission" | "unknown", userMessage: string }`.
     "tag-lost" matches NotReadableError / NetworkError / messages containing
     "IO error"; userMessage tells the admin to hold the card still against
     the phone until success shows, then tap Retry. "permission" for
     NotAllowedError; "not-supported" for NotSupportedError (locked/too-small
     tag: say the tag may be write-protected). Never surface the raw "null".
   - `withRetries(fn, { attempts: 3, delayMs: 250 })` → retries ONLY when the
     classified kind is "tag-lost"; rethrows others immediately; returns the
     attempt count. Test: succeeds on 3rd try; gives up after 3; no retry on
     "permission".
2. Rework the page handler using those helpers:
   - A `writingRef` re-entrancy guard: while a write+register cycle is in
     flight, further `onreading` events for ANY serial are ignored.
   - Status copy during write: "Writing — hold the card still…".
   - On final failure: show the classified userMessage; KEEP the scan session
     alive so the admin just re-taps (don't force restarting the scanner).
   - `registerCard` "already exists" error: distinct message ("This card is
     already registered — its activation code is in the inventory list
     below."), stop scanning, no retry loop into the same tag.
3. Gates green; commit `fix(nfc):` explaining the TagLostException mechanism.


## Task 11 — Pro-feature gating UX + payment-gateway placeholder paywall

**Files:** `app/dashboard/builder/**`, `app/dashboard/billing/page.tsx`,
`convex/billing.ts` (read for planContext), components as needed, tests

**Product context (binding):** the team is still choosing a payment gateway
(PayRex not committed; no keys). Do NOT build production checkout. The
monetization funnel should exist and look intentional, but terminate in a
polite placeholder.

1. Discovery first (read, then list in your report): every plan-gated
   capability and how the UI treats free users today. Known: free =
   1 active card (`planContext` limits), and the profile builder reportedly
   shows pro features as "hidden" with no upsell. Grep the builder for
   plan/pro/locked/hidden logic and enumerate.
2. Locked-state UX: gated features render VISIBLE but locked — the feature's
   UI shown disabled/preview with a lock badge and a "Get Pro" CTA
   (consistent component, reused everywhere something is gated). No feature
   silently vanishes for free users. TDD what's testable: a component test
   asserting a gated section renders the locked state + CTA for a free plan
   and the live feature for pro.
3. The CTA routes to /dashboard/billing. That page must STOP calling the
   dead PayRex checkout (it throws — keys unset). Replace the upgrade action
   with a placeholder state: plan cards remain visible with prices, the
   upgrade button opens a dialog/banner: "We're finalizing our payment
   provider — Pro upgrades are opening soon." plus a mailto/support contact.
   No dead buttons, no raw server errors. Gate this on a single constant
   (e.g. `PAYMENTS_ENABLED = false` in lib/) so flipping it later re-enables
   the real flow without archaeology.
4. Plan-limit errors from the server (e.g. "Upgrade to Pro to activate more
   than one card" on /t/ claim and cards page) should render with the same
   upgrade CTA where they surface, not as plain error text.
5. Do not remove or stub the payrex/billing server code — it stays for the
   future gateway decision; only the UI entry points route to the
   placeholder.

## Phase 2 (evidence: audit-journey.md + audit-dataflow.md)

## Task 12 — First-run profile flow: onboarding → builder must edit, not re-create

**Files:** `app/dashboard/onboarding/page.tsx`, `app/dashboard/builder/page.tsx` (routing/mode only), `convex/users.ts` or wherever onboarding auto-creates, `convex/profiles.ts` (createProfile), nav link sources, tests

Journey Blockers 1+2+9, dataflow #6. Onboarding's Finish auto-creates the
first profile via a direct insert (no slug, bypassing createProfile), then
routes to /dashboard/builder WITHOUT ?id= — builder enters create mode, the
free plan's maxProfiles:1 is already consumed, so the user's FIRST save
always fails with the upgrade error. Fix:
1. Onboarding's profile creation goes through the same code path as
   createProfile (slug assigned, digitalCard seeded). TDD via convex-test:
   onboarding-created profile has a slug and identical shape to a
   builder-created one.
2. After Finish, route to `/dashboard/builder?id=<newProfileId>` so the
   builder EDITS the profile. Any nav entry ("Create profile", dashboard
   quick actions, profiles page CTA) for a user who already has a profile at
   the free limit routes to editing their existing profile, not create mode.
3. Builder create-mode entered WITH an existing at-limit profile: redirect to
   edit of the newest profile instead of a doomed save (test the redirect
   decision as a pure helper).
4. Backfill: live onboarding-created rows lack slugs — the repo has an
   idempotent slug-backfill mutation (dataflow audit confirmed); run it as

# PHASE 2 — core journey (from .superpowers/sdd/audit-journey.md + audit-dataflow.md)

## Task 12 — Repair the onboarding → first profile → builder chain

**Files:** `app/dashboard/onboarding/page.tsx`, `convex/users.ts` (completeOnboarding / wherever the auto-insert lives), `convex/profiles.ts` (createProfile), `app/dashboard/builder/page.tsx`, dashboard nav entry points, tests

THE worst defect in the product: every new user's first Save fails.

Evidence (audit-journey Blockers 1, 2, 9; audit-dataflow items 6):
- Onboarding "Finish" auto-creates the first profile via a DIRECT db.insert,
  bypassing `createProfile` — so it gets NO slug (public link stuck at
  `/p/<convexId>`) and no `digitalCard`.
- It then routes to `/dashboard/builder` with NO `?id=`, so the builder is in
  "Create Profile" mode. Free plan `maxProfiles: 1` is already consumed by the
  auto-created profile, so the first Save throws "Upgrade to Pro for unlimited
  profiles." Reproduced live with exact error text.
- Three nav entry points route to the same no-id builder even for users who
  already own a profile.

1. Decide ONE creation path and make it authoritative: onboarding completion
   should call the SAME `createProfile` mutation the builder uses (slug
   assignment, digitalCard defaults, plan check in one place). No direct
   inserts. TDD at the Convex layer first: completing onboarding produces a
   profile WITH a slug and digitalCard, and does not consume a second
   profile slot when the builder later saves it.
2. Route onboarding completion to `/dashboard/builder?id=<newId>` so the
   builder edits the profile that was just created instead of trying to
   create a second one. Test the redirect target.
3. Builder "no id" entry: if the user already has profile(s) and is at the
   free limit, do NOT present a create form that cannot succeed. Either
   redirect to editing their existing profile or show the locked/upgrade
   state from Task 11. Fix the three nav entry points to link to the
   user's existing profile when one exists.
4. Slug backfill: an idempotent backfill mutation already exists in-repo
   (`profiles:internalBackfillSlugs` per the ledger) — run it against the
   deployment and report the count fixed, so existing slugless profiles get
   real public links.

## Task 13 — Stop destroying user data on first builder save

**Files:** `app/dashboard/builder/page.tsx` (save-time filtering + default layout), `convex/profiles.ts`, tests

Blocker 3 + Major 6 + dataflow items 1:
- Services typed during onboarding are PERMANENTLY deleted the first time the
  user saves in the builder: the individual profile type's default layout
  omits the Services block, and save-time filtering strips data for any
  disabled block — firing even though the user never chose to hide it.
- The public Storefront's structured services catalog (`profiles.services`,
  top-level) can never be populated: the builder always saves `[]`, and its
  "Services" editor writes to `agentInfo.services` instead. Live data confirms
  top-level `services` is empty on 100% of rows.

1. TDD first: a save that does not touch the Services block must PRESERVE
   existing services data. Change the rule — never strip data for a block the
   user didn't explicitly clear; hiding a block should affect RENDERING only,
   not persistence. Audit every other block for the same destructive filter
   and cover each with a test.
2. If a profile has services data, the default layout for its type must not
   silently hide it — include the block when data exists.
3. Resolve the services duplication per audit-dataflow #1: `agentInfo.services`
   (string tags) is authoritative and rendered; top-level `services` is dead.
   Remove the dead field's write path and make the Storefront read the
   authoritative source. Schema field removal needs the documented
   compat/backfill plan — if that's larger than this task, leave the field
   declared-but-unwritten and note it, but the UI must stop pretending to
   populate it.

## Task 14 — Onboarding wizard reachable on a phone

**Files:** `app/dashboard/layout.tsx` or the onboarding page/route group, tests

Blocker 4: at 390–430px the dashboard's fixed bottom nav overlaps and
intercepts taps on the wizard's Next/Back — a real click at the visible
"Next →" navigated to `/dashboard/cards`.

Onboarding is a focused, full-screen task; the dashboard chrome should not be
present during it (or must clear it with padding + z-index). Prefer removing
the bottom nav on the onboarding route over stacking z-index hacks. Verify at
320/360/390/430px with a real click at the button's center landing on the
button — the earlier responsive work in this repo has a scratchpad harness
that drives real clicks; measuring rects alone is NOT sufficient evidence.

## Task 15 — Real error trapping + toast notifications

**Files:** `package.json` (add `sonner`), `app/layout.tsx` (Toaster), a small
`lib/errors.ts`, then the call sites, tests

Major 8: 31 mutation/action call sites with missing/weak error handling; the
app uses native `alert()`/`confirm()` and several paths fail silently. The
full inventory table is in `.superpowers/sdd/audit-journey.md` — work from it.

1. Install `sonner`, mount `<Toaster />` once in the root layout with
   theme-aware styling matching the design tokens already in use.
2. `lib/errors.ts`: a tested `toUserMessage(err): string` that unwraps Convex
   transport noise (`[CONVEX M(...)] [Request ID: ...] Server Error Uncaught
   Error: <msg> at ...`), prefers `ConvexError.data.message`/`.code` when
   present, and falls back to a friendly generic — NEVER shows a stack trace
   or the literal "Server Error". Unit-test against the real observed shapes
   (samples are in the audit and in lib/nfc.test.ts).
3. Replace every `alert()`/`confirm()` in the user-facing journey with toasts
   (destructive confirms become an AlertDialog). Every mutation call site in
   the journey gets: pending feedback, success toast, and an error toast via
   `toUserMessage`. Silent `.catch(console.error)` is not acceptable.
4. Prioritize the journey (auth → onboarding → builder → save → cards →
   leads); admin screens can follow the same pattern but are lower priority
   — if scope runs long, finish the journey and list the remainder.

## Task 16 — Storefront price rendering (100x error)

**Files:** wherever the Storefront tab renders product prices, `lib/payment.ts` or equivalent, tests

Major 7: product prices render 100x too small on the Storefront (₱19.99 →
"₱0.20") from a centavos/pesos mismatch, and disagree with the Portfolio
tab's rendering of the same price (which also uses the wrong currency
symbol). Find the single formatting helper (or create one), TDD it against
both integer-centavos and peso-float inputs, and route BOTH tabs through it.

# PHASE 3 — whole-branch review findings (verdict: ship the merge, do NOT public-launch yet)

Root cause named by the reviewer: 13 tasks were scoped BY SYMPTOM, and an
invariant scoped by symptom only gets applied where a task happened to look.
ConvexError reached ~5 of ~15 sites that need it; toUserMessage got a client
half and never a server half; the rate-limit rollback analysis was written up
in cards.ts and images.ts and never run against leads.ts or checkout.ts.

## Task 17 — Stop losing user data and leads (BOTH LIVE TODAY)

**C3 — onboarding `?edit=true` silently discards everything typed.**
`convex/users.ts:120-185`: on `markCompleted:true` a profile is created only
when `existingProfiles.length === 0`; the else branch at :182-184 just assigns
`profileId = existingProfiles[0]._id` and NEVER patches agentInfo/name/
profileType/layoutConfig. Per-step saves write only `user.name` and
`user.onboardingData`. So "Edit Profile Setup" → change job title + phone →
Finish → toast says "Profile created!" (also wrong wording in edit mode) and
the live profile is byte-identical. onboardingData and profiles.agentInfo
diverge permanently with nothing reconciling them.
Fix: in edit mode, patch the existing profile from the wizard's data through
the SAME path first-completion uses. Correct the toast wording for edit mode.
TDD the edit branch — `convex/users.test.ts:333-399` pins only first
completion, so the else branch has zero coverage.

**I2 — lead capture throttles the victim, and offline sync lies about it.**
`convex/leads.ts:28`: `checkRateLimit(ctx, 'lead:${args.ownerId}', {max:5,
windowMs:60_000})` is keyed on the PROFILE OWNER, so every anonymous visitor
to one profile shares a 5/min bucket. SigmaTap's flagship scenario is NFC
cards at a networking event: ten taps in a minute loses half the leads. The
visitor just sees "Failed to send message."
Compounding: `lib/offline-leads.ts:107-123` loops createLead over the whole
queued batch, so a 20-lead batch fails 6-20 every sync. Data is NOT lost
(markLeadSynced skipped on failure, clearSyncedLeads only removes successes)
but the failure is INVISIBLE: syncOfflineLeads catches per-lead and returns
{synced, failed}, never throws, so OfflineLeadCapture.tsx:161's catch can
never fire and :158 reports only result.synced — "Synced 5 leads" while 15
silently didn't.
Fix: (a) rate-limit per VISITOR (ip/fingerprint/guest id), not per owner, or
raise the ceiling substantially and justify the number against event traffic;
(b) surface `failed` honestly in the sync toast and keep retrying.

## Task 18 — Finish the ConvexError invariant server-side (C1 + I3)

**C1** — plain `Error` at `convex/cards.ts:88,89,236,253` and
`convex/rateLimit.ts:38` redact to "[CONVEX M(...)] Server Error" on a real
production deployment, so `toUserMessage` correctly returns the generic
fallback and the entire NFC activation journey loses its specific messages
("Invalid activation code", "already registered", "Too many requests") at the
exact moment a customer needs them. Invisible today ONLY because production
points at the dev Convex deployment, which does not redact. Note
`assertCanActivateCard` at cards.ts:31 IS already a ConvexError — three lines
above one that isn't.
`rateLimit.ts:38` is the highest-leverage single change: it fixes rate-limit
UX across activate, claim, tap, public lead form and order placement at once.

**I3** — the Task-1 rollback bug, unfixed in two more files: `leads.ts:28`
(limiter write, then throws at :31/:34 roll it back → unmetered forever) and
`checkout.ts:153` (throws at :159,176,193,202,208 plus resolveDiscount
:31/36/40/44). checkout's key is `order:${userId ?? args.guestId ?? "anon"}`
and guestId is CLIENT-SUPPLIED, so a guest rotating it is never limited at
all. Paired with `checkout.ts:68 validateDiscount` — public, unauthenticated,
unmetered, confirms a code's validity AND value — discount brute-forcing is
open TODAY (impact currently low only because few codes exist).
Apply the established action + internalMutation split (see cards.ts:38-51) or
an equivalent that survives the throw, and meter validateDiscount.

## Task 19 — Close the launch-armed security + validation gaps (C2 + I1 + I4)

**C2 (SECURITY)** — `convex/payrex.ts:33 createCheckoutSession` is an
unauthenticated action taking only `orderNumber`, loading the order via
`internal.checkout.getOrderForPayment` (checkout.ts:327, no ownership check),
returning a live PayRex URL and writing payrexCheckoutId/paymentIntentId onto
that order. The codebase states the premise at checkout.ts:293-294: order
numbers are predictable and must never be trusted alone — the wave applied
that to getOrderByNumber and not here. Attacker enumerates order numbers,
calls the action directly against the public Convex URL (PAYMENTS_ENABLED
gates the UI, not the wire), gets a stranger's checkout page and controls the
ids `convex/http.ts` uses to map webhooks back to orders. Inert only because
PAYREX_SECRET_KEY is unset; ARMS THE DAY PAYREX IS CONFIGURED.
Fix: require identity and verify ownership (guest orders need the guest-token
path, matching getOrderByNumber's treatment).

**I1** — `app/shop/checkout/page.tsx:136,168` still `alert(error.message)`,
bypassing toUserMessage: in production that renders a raw Convex envelope to
a paying customer. Unreachable only behind PAYMENTS_ENABLED — a constant
designed to be flipped. The one non-admin survivor of the Task 15 sweep.

**I4** — `convex/images.ts:101 validateUpload` has ZERO non-test callers;
ALLOWED_CONTENT_TYPES/MAX_UPLOAD_BYTES are reachable only through it and
through validateUploadMetadata, which only tests call. So three green tests
named "validateUpload rejects…" exercise a helper production never invokes,
while the live path (generateUploadUrl → client POSTs straight to storage)
enforces nothing server-side — the client checks are, per the file's own
comment, trivially bypassable. Any authenticated user can store arbitrary
content/size at 10/min. ALSO: validateUpload:104 still calls requireAdmin —
the same bug Task 5 fixed on its neighbour — so wiring it as-is breaks it for
every non-admin.
Fix: enforce server-side (ctx.storage.getMetadata after upload, or a
validated commit step), and fix the admin gate. The false assurance from the
passing tests is the worst part — make the tests exercise the live path.

## Task 20 — Plan-awareness and admin dogfooding (I5 + I6)

**I5** — `app/dashboard/profiles/page.tsx:58-59` computes createProfileHref
with NO plan check (the file never queries getMyPlan), so both "Create New"
buttons (:88 mobile, :104 desktop) silently mean "edit your newest profile"
for a PAYING customer. `lib/builderEntry.ts:27` is deliberately plan-aware
(`maxProfiles === null` → no redirect); Task 12 applied the guard at a call
site that doesn't know the plan, bypassing the helper that does. Multiple
profiles is the headline Pro benefit and this is the page called "My Profiles".

**I6** — `app/dashboard/layout.tsx:372` ejects admins from the whole consumer
product (only /dashboard/onboarding is exempt). An admin CAN complete
onboarding — profile created and publicly live — then can never edit it, and
the post-claim confirmation at app/t/[uuid]/page.tsx:76 breaks. The product
owner is an admin, so this prevents dogfooding the journey this wave fixed.
One line.

## Task 21 — The onboarding "Finish" button does not finish

**Files:** `app/dashboard/onboarding/page.tsx`, tests

Found during Task 17's live verification. The wizard's final-step button is
labelled "Finish →" but is wired to the SAME handler as every "Next" — it
calls the mutation with `markCompleted: false` and merely advances to the
summary screen. The ONLY action that actually completes onboarding is the
summary screen's "Go to Profile Builder →".

Consequence: a user who clicks a button that says **Finish**, sees a summary
that looks like completion, and closes the tab has NOT completed onboarding
and has NO profile. They are silently returned to the wizard next visit.

This also partly explains an earlier false diagnosis in this wave: a
controller probe appeared to dead-end at "Finish" and was attributed wholly
to a bad selector. The selector was wrong AND the button genuinely does not
complete.

1. Decide the intended flow and make the labels honest. Either "Finish"
   completes onboarding (and the summary becomes a post-completion
   confirmation), or the button is relabelled to what it does (e.g.
   "Review →"). Prefer the former — users reasonably expect Finish to finish,
   and a summary screen that requires a further click to persist is a
   data-loss trap.
2. Whatever you choose, a user who abandons at the summary screen must not
   lose their work. If completion happens at the summary, the wizard must
   still recover their entered data on return.
3. TDD the completion trigger: assert that whatever the final CTA is, it
   results in `markCompleted: true` and a created/updated profile. The
   existing tests never covered which button fires completion, which is why
   this survived.
