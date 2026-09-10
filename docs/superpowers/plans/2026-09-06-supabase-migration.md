# Connecta: Convex + Clerk → Supabase Migration Strategy

**Date:** 2026-09-06
**Status:** Strategy agreed, not started. Blocked on the rename merging first — see Sequencing.
**Related:** `docs/superpowers/specs/2026-08-31-connecta-rename-and-card-skins-design.md`,
`docs/handoff/03-DATABASE-SCHEMA.md`, `docs/handoff/04-ERD.md`

> **This document replaces the lost decision record.** The rename spec cites a
> "Convex→Supabase cutover decision record" holding **13 decisions**. That file is not in this
> repo — a search across all seven branches, the full git log, and the working tree found only
> the spec's four references to it. Section _Salvaged decisions_ records what survives; section
> _Decisions that must be re-made_ lists what was lost. Do not treat the lost items as settled.

---

## Decisions taken (2026-09-06)

| Decision        | Choice                                      | Consequence                                                    |
| --------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Migration style | **Port module-by-module** into the new repo | Keeps accumulated bug fixes; selective rewrite where warranted |
| Live data       | **Effectively greenfield** — see caveat     | No ETL, no cutover window, no rollback rehearsal               |
| Reactivity      | **Only where it earns its place**           | Realtime is opt-in per surface, not the default                |

### The "no data to preserve" caveat

Nearly true, but not entirely, and the exception is physical. The 2026-08-31 purge
(spec §"What unblocked this") left the deployment holding:

- **One account**, `tapfolio.dev@gmail.com` — refused by `internalPurgeTestAccounts` **by
  design** because it holds the superadmin grant. It must exist again after cutover.
- **One physical NFC card**, `uuid 43:45:08:03`, tapped four times.

Everything else is gone: 14 accounts, 15 profiles, 8 leads, 14 notifications, 5 carts. Zero
orders, zero subscription invoices — those tables have never held real data.

**The physical tag is the one hard constraint in this migration.** It is programmed with a URL
that cannot be changed without physically rewriting the tag. `/t/43:45:08:03` must resolve
after cutover. The spec's plan is to re-register it through the factory page rather than migrate
the row — acceptable, but it means the factory page and `/t/<uuid>` must both work before the
cutover can be called done. Re-tap the physical card; do not simulate it.

---

## Sequencing — this is blocked

The rename spec is explicit that the rename ships **first**:

> `lib/brand.ts` is a single source of truth with a guard test enforcing it, so the rename is
> cheap _today_ and expensive after the backend migration rewrites 5,240 lines of server code
> and 229 client call sites.

**As of 2026-09-06, `rename/connecta` has 15 commits not in `main`.** Starting the migration now
drags an unmerged rename across a backend being rewritten underneath it — the exact cost the
spec was written to avoid.

**Order: rename merges → migration → card skins.** Do not start Phase 0 until the rename is on
`main`.

---

## Salvaged decisions

What survives of the 13, recovered from the rename spec. These stand:

1. **`profiles.digitalCard` does NOT migrate as a `jsonb` blob.** The original record said it
   would; spec §"Correction to the migration plan" overturns this. `profiles` gets a **`skin`
   enum column** instead. Porting ~15 fields plus nested `positions{x,y,width,scale}` and then
   deleting them is wasted work in both directions.
2. **The freeform designer never reaches Postgres.** `backgroundColor`, `textColor`,
   `cardBackgroundType`, `cardGradientStart`/`End`, `theme`, and the drag-editing `positions`
   are deleted **by omission during the migration**, not removed later. With 0 profiles
   remaining there is no backfill and no `light|dark|glass|carbon` values to translate.
3. **There were four carve-outs; the skin column is a fifth.** The other four are lost — see
   below. A "carve-out" appears to mean a table or field that deviates from a straight
   structural port.
4. **Cutover validation is the physical tag.** Re-register `43:45:08:03` through the factory
   page, re-tap it, confirm `/t/<uuid>` resolves.

## Decisions that must be re-made

Lost with the record. **Each needs an explicit answer before the phase that depends on it.**

- **The four original carve-outs.** Only the fifth survives. Every table that deviates from a
  straight port has to be re-identified during Phase 1. Assume nothing is a straight port until
  checked against `docs/handoff/03-DATABASE-SCHEMA.md`.
- **The remaining ~9 decisions.** Unknown. Likely candidates, given what the migration touches:
  auth provider configuration, file-storage bucket layout, the `clerkId` → `auth.uid()` identity
  mapping, the JSONB-vs-normalized line for other nested objects, the scheduled-job host, and
  how the payment webhooks re-home. Re-decide these as their phase arrives, and **record them
  in this file** so the record is not lost twice.

---

## What is actually being replaced

Convex is one product covering several concerns. Supabase splits them across four services, and
each split is separate work. Counts measured 2026-09-06:

| Convex concern     | Current surface                                                                                        | Supabase replacement                    |
| ------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Database + queries | 20 tables, `convex/schema.ts:1-571`                                                                    | Postgres schema + SQL migrations        |
| Authorization      | `convex/authz.ts` — 5 guards, called across ~130 functions                                             | **RLS policies** (see below)            |
| Reactivity         | 107 `useQuery` call sites across 46 files                                                              | TanStack Query + selective Realtime     |
| File storage       | 8 `ctx.storage.store`, 5 `.get`, 2 `.getUrl`, 2 `.generateUploadUrl`, 2 `.delete`; 31 `storageId` refs | Supabase Storage buckets                |
| Scheduled jobs     | `convex/crons.ts` — one daily plan-expiry sweep, 18:00 UTC                                             | `pg_cron`, or a scheduled Edge Function |
| HTTP endpoints     | `convex/http.ts:1-390`, 2 `httpAction`                                                                 | Next.js route handlers under `app/api/` |
| Auth identity      | Clerk — 42 imports, 67 `useUser`, `clerkId` as FK                                                      | Supabase Auth, `auth.uid()`             |

Backend totals: 43 modules, 13,290 LOC including tests; 46 mutations, 44 queries, 23
`internalMutation`, 9 actions, 4 `internalQuery`, 2 `internalAction`, 2 `httpAction`.

External integrations are **unaffected** and port as-is: Resend (email), Stripe, PayPal, Payrex.
They talk HTTP; they do not care what database is behind them.

---

## Architectural change 1: authorization moves into the database

Today every backend function is responsible for calling its own guard from `convex/authz.ts` —
`requireUser`, `requireUserMatching`, `getAuthedUser`, `isActiveAdmin`, `requireAdmin`.
Authorization is correct only as long as no function forgets to call one.

The history shows this failing already: commit `2569890` patched a **Clerk authorization
bypass**. That is the signature failure of per-function guards, and it will recur.

**Target:** every table carries RLS policies expressing ownership in SQL. A query that forgets
its check returns zero rows rather than someone else's data. Application guards remain, but as
ergonomics and error messages — not as the security boundary.

This is the biggest production-grade win available here, and the reason `clerkId` →
`auth.uid()` is a schema redesign rather than a find-and-replace: each of the 20 tables needs an
explicit answer to "who owns this row, and through which join?"

**Rule: no table is created without its RLS policies in the same migration.** A table shipped
with RLS disabled and "policies to follow" is a table that ships wide open.

## Architectural change 2: reactivity becomes explicit

Convex `useQuery` is a live subscription — it re-renders when underlying data changes, with no
extra code. Supabase `.select()` is a one-shot fetch. **Porting the 107 call sites 1:1 silently
converts every live view into a stale one.** No test catches this; it surfaces weeks later as
"why isn't my dashboard updating?"

**Target pattern:**

- Default: TanStack Query, with `invalidateQueries` after mutations. Covers the large majority.
- Opt-in: a Supabase Realtime subscription invalidating the relevant query key, added only where
  a _second viewer's_ change must appear without interaction.

Candidate Realtime surfaces — confirm against `docs/handoff/05-USER-FLOWS.md`, do not assume:
leads inbox, team membership/invites, order status. Everything else refetches.

**Rule: Realtime is added per surface with a stated reason.** "It was live before" is not a
reason — under Convex everything was live by default, needed or not.

---

## Port order

Ordered by dependency, not size. Each phase lands green before the next begins.

**Phase 0 — Foundation.** _Blocked until the rename merges._ New repo and remote. Next.js +
TypeScript + Tailwind carried over unchanged. Supabase project, local dev via Supabase CLI,
migrations directory, CI running the gates below. No app code yet.

**Phase 1 — Schema + RLS.** All 20 tables as SQL migrations, each with policies. Source of truth
is `docs/handoff/03-DATABASE-SCHEMA.md` and `04-ERD.md`, cross-checked against
`convex/schema.ts` — the handoff docs express intent, the Convex schema expresses what shipped.
**Re-identify the four lost carve-outs here.** Apply salvaged decisions 1 and 2: `profiles` gets
a `skin` enum, and the freeform `digitalCard` fields are simply never created.

**Phase 2 — Auth.** Supabase Auth, middleware, session handling, the `users` row lifecycle on
signup, and re-establishing the `tapfolio.dev@gmail.com` superadmin grant. Replaces 42 Clerk
imports and 67 `useUser` sites. Must land before any feature module, since every module's RLS
depends on `auth.uid()` resolving.

**Phase 3 — Data access layer.** TanStack Query setup, typed Supabase client, query-key
convention, mutation→invalidation pattern. **This is the phase that prevents the reactivity
trap** — establish the pattern before porting 107 call sites against it.

**Phase 4 — Feature modules,** smallest first to prove the patterns cheaply:

1. `settings.ts` (142) · `projects.ts` (87) · `notifications.ts` (43) — low-risk
2. `cards.ts` (357) · `profiles.ts` (559) — product core; carries the `skin` enum
3. `leads.ts` (232) · `teams.ts` (350) — first Realtime candidates
4. `shop.ts` (600) · `checkout.ts` (741) · `adminShop.ts` (944) — largest, most stateful
5. `billing.ts` (478) · `payrex.ts` (165) — payment providers, port integrations verbatim
6. `admin.ts` (628) · `audit.ts` · `rateLimit.ts` · `maintenance.ts` — operational surface

**Phase 5 — Peripheral subsystems.** Storage (`images.ts` → Supabase Storage), the daily cron
(`crons.ts` → pg_cron), HTTP endpoints (`http.ts` + webhooks → route handlers), email
(`email.ts`, Resend, unchanged).

**Phase 6 — Cutover + hardening.** Re-register the physical tag through the factory page and
**re-tap it**. Then: CI/CD, staging, error tracking, structured logging, DB backups, edge rate
limiting, security headers (already in `next.config.ts:21-52` — carry them over).

---

## Traps specific to this codebase

1. **`useAction` has no Supabase equivalent.** 36 call sites. Convex actions are server functions
   permitted to call external services. These become server actions or route handlers — a
   different execution and auth model. Do not map them onto `useMutation`.

2. **`internalMutation` (23) and `internalQuery` (4) are privileged.** They bypass user-facing
   auth deliberately. Their Postgres equivalent is a `SECURITY DEFINER` function or the
   service-role key — both of which **bypass RLS entirely**. Each needs a deliberate decision; a
   service-role key reachable from client code voids the whole RLS design.

3. **The service-role key must never reach the browser.** Server-side only, never in a
   `NEXT_PUBLIC_` variable. Worth a CI check, not just a convention.

4. **`_creationTime` is implicit in Convex.** Postgres needs explicit
   `created_at timestamptz not null default now()`. Any ordering that silently relied on
   `_creationTime` breaks quietly.

5. **Convex ids are opaque strings; Postgres FKs are real constraints.** Convex does not enforce
   referential integrity. Shapes that "worked" may violate real FKs — with the data purged this
   is a gift, surfacing modeling errors at migration time rather than in production.

6. **The 48 test files encode real behavior.** Written against `convex-test`, they will not run
   as-is, but they document expected behavior — including the security regressions in
   `convex/admin.test.ts`. Port the _assertions_, not the harness. The authorization-bypass tests
   especially must survive into the RLS suite.

7. **`docs/handoff/02-TECH-STACK.md` documents Convex/Clerk as current.** It goes stale the
   moment Phase 1 lands. Update it per phase, not at the end.

8. **`maintenance:internalPurgeTestAccounts` refuses the superadmin by design.** Whatever
   replaces it must keep that refusal. Losing it means a maintenance run can delete the only
   admin account.

---

## Verification

Every phase leaves these green — the four gates already in use, plus two this migration adds:

| Gate    | Command                                                    |
| ------- | ---------------------------------------------------------- |
| Types   | `npx tsc --noEmit`                                         |
| Lint    | `npm run lint`                                             |
| Tests   | `npm test`                                                 |
| Build   | `npm run build`                                            |
| Format  | `npm run format:check`                                     |
| **RLS** | Policy tests asserting cross-tenant reads return zero rows |

The RLS gate is new and non-negotiable: for each table, a test authenticating as user A that
confirms user B's rows are invisible. It replaces the per-function guards, so it is the one suite
that must never be skipped.

**Cutover is not done until the physical tag has been re-tapped and `/t/43:45:08:03` resolves.**

---

# Phase 1 record — schema + RLS (2026-09-11, COMPLETE)

18 tables, RLS on every one, applied as `supabase/migrations/2026091100000{1..7}`. The counts
below differ from the plan above because the payment gateway was removed on 2026-09-10:
`orders`, `discounts` and `subscriptionInvoices` no longer exist, taking the schema from 20
tables to 17, plus one new junction table.

## Decisions taken — recording these so the record is not lost twice

| #   | Decision                                                                                                                 | Why                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **`public.users.id` IS `auth.users.id`.** No `clerk_id`, no surrogate key.                                               | Every ownership check becomes `auth.uid() = owner_id` — no join to translate identity, on every row of every query.                                                              |
| D2  | **snake_case** throughout; TS reads generated types.                                                                     | Postgres convention; avoids quoting every identifier.                                                                                                                            |
| D3  | **Every table gets `created_at timestamptz`**; epoch-ms fields become `timestamptz`; `updated_at` is trigger-maintained. | Convex's implicit `_creationTime` has no equivalent, and a hand-maintained `updated_at` is one forgotten mutation away from lying.                                               |
| D4  | **The jsonb line:** payload stays jsonb, entities become tables.                                                         | `agent_info`/`layout_config` are rendered as blocks and never filtered on; `properties`/`projects` are queried independently.                                                    |
| D5  | **`digitalCard` never created** — collapses to `skin card_skin default 'charcoal'`.                                      | Salvaged decisions 1 and 2. Zero profiles remain, so there is nothing to back-fill.                                                                                              |
| D6  | **`is_admin()` / `is_superadmin()` are `security definer`, `search_path = ''`.**                                         | Policies on `admins` must read `admins`; an invoker function would recurse forever.                                                                                              |
| D7  | **Privilege columns are withheld with COLUMN grants, not policies.**                                                     | RLS is row-level and cannot say "edit your name but not your role". Without this, `update users set role='admin' where id=auth.uid()` passes a correct-looking ownership policy. |
| D8  | **Money is `numeric`, never float.**                                                                                     | `v.number()` is an IEEE double; money in a float silently rounds.                                                                                                                |

## The four lost carve-outs, re-identified

The plan required these be re-found during Phase 1. Each is a table deviating from a straight port:

1. **`cards.owner_id` is nullable.** `convex/admin.ts:447` mints stock with `ownerId: adminUser._id`
   and warns "do not use ownerId as an ownership gate for unactivated stock". Under RLS that
   warning is a trap — `auth.uid() = owner_id` would hand every unclaimed card to the admin who
   minted it, and the policy would look right. Nullable owner_id makes _unclaimed means unowned_
   true rather than documented, enforced by `cards_inventory_is_unowned`.
2. **`cards` is invisible to anon; the tap goes through `resolve_card_for_tap()`.**
   `getCardByUuid` returns a narrowed projection hiding `activation_code`. RLS is row-level, so a
   policy letting anon read the row leaks the activation codes that convert stock into a claimed card.
3. **`leads` is the one table anon WRITES.** The public inquiry form is submitted by someone not
   signed in. Anon has INSERT on six columns and no SELECT — the column list, not the policy, is
   what stops a submitter pre-setting `status` or backdating `created_at`.
4. **`carts.guest_id` never created.** A browser-minted, guessable, unauthenticated token cannot
   be checked against anything, so honouring it means an open table. With checkout gone the basket
   only produces an email, so guest baskets stay in localStorage.

Plus the fifth already on record (`profiles.skin`), and two more found while porting:
`profiles.featuredProperties` became a junction table (an array of FKs cannot be constrained
element-wise), and `featuredProjects` was never created — all four call sites write `[]` and
nothing reads it.

## The `settings.is_public` addition

`getShopSettings` is a public query, but `settings` is a generic key/value table. A blanket anon
read would expose every future key the day it is added. The flag defaults to `false`, so a new
setting is private until deliberately published.

## Trap found the hard way — Supabase default privileges

`revoke all on function ... from public` **is not enough**. Supabase ships
`ALTER DEFAULT PRIVILEGES` granting EXECUTE on every new `public` function to `anon`,
`authenticated` and `service_role` _individually_; revoking from `PUBLIC` removes only the
`=X/postgres` entry and leaves each named grant intact. The revoke appears to work and does nothing.

Because PostgREST exposes every `public` function as an RPC endpoint, `is_admin` was briefly
callable at `/rest/v1/rpc/is_admin` by an unauthenticated caller — an oracle for enumerating which
accounts hold admin grants. It reads no rows, so RLS never came into it. Fixed in
`20260911000004`; the advisor caught it, not review.

**Standing rule for every later phase: after creating any function in `public`, explicitly
`revoke execute ... from anon` unless anon is meant to call it, and re-run the security advisor.**

## Verification actually performed

Not inspection — impersonation, via `set local role` + `request.jwt.claims`, exactly as PostgREST
authenticates. 22 assertions, all passing, including positive controls so a merely-broken table
cannot pass as a secure one:

- user A sees only their own row; cannot write B's row; cannot self-grant admin
- user A **can** still update their own name (positive control)
- `updated_at` overrides a client-supplied value
- anon cannot read `cards`; anon **can** resolve a tap and increment its counter
- user A sees their own card but **not** inventory stock
- an `active` card cannot be ownerless; an uppercase uuid is rejected at write
- anon **can** submit a lead; cannot pre-set its status; cannot read the inbox
- the lead→notification trigger and `set_updated_at` both still fire after their EXECUTE revoke

One test initially failed for a test-construction reason worth remembering: `now()` is
transaction-start time, so an insert and a trigger inside one `DO` block stamp the identical value
and `pg_sleep` cannot separate them. The trigger was fine; the assertion was wrong.
