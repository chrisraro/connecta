# Task 6 report — Index discipline: kill the full-table scans

Branch: `fix/production-audit`. Base commit: `12fac15`.

## Summary

Converted the JS-side-filter-over-`.collect()` pattern to the existing
`schema.ts` indexes in `teams.ts`, `adminShop.ts`, `admin.ts`, and
`shop.ts`, per `.superpowers/sdd/task-6-brief.md`. No public return shapes
changed. Two functions (`getShopAnalytics`, and the two capped list views)
introduce sanctioned, documented value changes (a 90-day analytics window
and a 500/200-row list cap) — both called out below and reflected in the
admin UI copy so the numbers shown don't overclaim.

Process followed for every function: seeded rows on both sides of the
filter boundary, wrote the test against the pre-conversion code, watched it
pass (or, for the two intentionally-new-behavior tests, watched it fail —
proving the old code didn't yet do what we were about to add), converted,
confirmed green. Final suite: **281/281 passing, 38 test files** (was
260/36; net +21 tests across 2 new files + additions to 3 existing files).
`tsc --noEmit`: clean. `eslint`: 0 errors (14 pre-existing warnings,
untouched). `next build`: clean. `npx convex dev --once`: functions
deployed clean to the dev deployment.

## convex/teams.ts

All four spots doing `ctx.db.query("users").collect()` + JS filter
(`u.teamId === team._id || u._id === team.ownerId`) now go through a shared
`loadTeamMembers(ctx, team)` helper built on `by_teamId`:

- **`getMyTeam`** (was line 75) — member list.
- **`inviteMember`** (was line 129) — seat-count check. The function still
  does one full `users` collect for the "is this email already a user
  anywhere in the system" check (no `by_email` index exists on `users`;
  out of scope for this task — that full scan is unrelated to the
  teamId-filter pattern this task targets).
- **`acceptInvitesForCurrentUser`** (was line 274) — seat-count check on
  login.
- **`getTeamLeads`** (was line 307) — team member roster for lead
  aggregation.

`loadTeamMembers` queries `by_teamId` for `team._id`, then merges in the
owner via `ctx.db.get(team.ownerId)` only if not already present — this
preserves the OR-fallback the original code had for the rare case an
owner's own `teamId` isn't backfilled yet (confirmed via a dedicated test;
the normal path, `billing.ts:internalActivateInvoice`, does set
`user.teamId = teamId` on team creation, so this is genuinely a legacy-data
fallback, not the common case).

**Tests** (`convex/teams.test.ts`, new file, 7 tests): seeded an in-team
member, a member on a *different* team, and a no-team member for every
function, plus an owner-teamId-unset edge case for `getMyTeam` and a
zero-free-seat vs. one-free-seat pair for `inviteMember`/
`acceptInvitesForCurrentUser`. All 7 passed unmodified before and after the
conversion.

## convex/adminShop.ts

- **`getOrders`** — now branches on whichever filter the caller actually
  supplied: `status` → `by_status`, else `paymentStatus` → `by_paymentStatus`,
  else `dateFrom`/`dateTo` → `by_createdAt` range, else (no filter at all)
  a full collect — because the one live caller
  (`app/admin/shop/orders/page.tsx`) currently calls with **no** filter args
  and does its own client-side filtering, so an unfiltered call is a
  genuine "give me everything" request, not a scan to eliminate. Remaining
  (non-indexed) filters are still applied in JS afterward on the narrowed
  set, so combined filters (e.g. status + date range) produce byte-identical
  results to before.
- **`getSalesStats`** — `paymentStatus === "paid"` was unconditional, so it
  now queries `by_paymentStatus` directly instead of collecting every order
  regardless of payment status. `dateFrom`/`dateTo` still filtered in JS on
  the paid-only subset (this query has no live caller today — confirmed via
  grep — so risk is low, but behavior for the paid+date-range case is
  unchanged).
- **`getShopAnalytics`** — this one computes true full-aggregate totals
  (revenue, order counts, status breakdown) with no filter argument to
  index on, so per the brief's "cap the window, label the UI string" rule:
  added a named constant `SHOP_ANALYTICS_WINDOW_DAYS = 90` and query
  `by_createdAt >= now - 90d` instead of collecting the entire `orders`
  table. **This is a deliberate value change**: orders older than 90 days
  no longer count toward the summary cards. Updated
  `app/admin/analytics/page.tsx` labels to say "last 90 days" on every
  affected card (Total Revenue, Paid Orders, Delivered, Orders by Status,
  Top Products) plus the page subtitle, so the admin isn't shown an
  unqualified number that used to mean "all time." Note: bucketing by
  `paidAt ?? createdAt` combined with filtering on `createdAt` means an
  order paid long after it was created could theoretically fall outside
  the window on `createdAt` grounds while still being "recently paid" —
  edge case, not exercised by real checkout flow (payment is near-immediate
  in this app), flagged here rather than silently accepted.

**Tests** (`convex/adminShop.test.ts`, new file, 7 tests): status-filter
boundary, paymentStatus-filter boundary, no-filter (still full list),
combined status+date filter, `getSalesStats` paid+date-range boundary, and
two `getShopAnalytics` tests — one proving recent-order totals are
unchanged, one (written to fail pre-conversion, and it did) proving an
order older than 90 days is now excluded.

## convex/admin.ts

Added two named constants: `ADMIN_USER_LIST_CAP = 500`,
`ADMIN_CARDS_LIST_CAP = 500`.

- **`getAllUsers`** — `users` collect → `.take(ADMIN_USER_LIST_CAP)`.
  Fixed the N+1: the per-user `admins` `by_user` lookup is now a single
  batched `ctx.db.query("admins").collect()` (admins table is bounded by
  grant history, not user count) turned into a `Map<userId, grant>` that
  keeps the *earliest*-created row per user — this exactly reproduces
  `.withIndex("by_user", eq(userId)).first()`'s tie-break, including the
  subtle case where a user's original (now-revoked) grant still "wins" over
  a later active regrant. A dedicated test locks in that exact edge case so
  a future change can't silently "fix" it as a side effect. The per-user
  `cards` (`by_owner`) and `orders` (`by_user`) lookups stay as indexed
  per-user queries (not batched into a full collect) — `orders` was
  previously a full unindexed collect + JS filter and now uses the
  existing `by_user` index instead, which is the actual scan this task
  targets; `cards`/`orders` per-user reads stay proportional to each user's
  real data rather than reading the whole (growth-risk) table.
- **`getCards`** — `.collect()` → `.take(ADMIN_CARDS_LIST_CAP)`.
  Updated `app/admin/factory/page.tsx`'s "N total cards registered" label
  to say "Showing first N cards (list is capped)" once N hits the cap, so
  the count doesn't quietly become a lie once inventory exceeds 500.
- **Not touched**: `getAdminDashboard`/`getDashboardStats` — these compute
  true unconditional totals (all-time user/card/lead/profile counts) and
  `users`/`cards`/`profiles` have no date or status index to narrow by in
  this schema, so there's no existing index to convert to; the brief's
  bullet list for `admin.ts` names only `getAllUsers`/`getCards`, and I
  read that omission as deliberate for exactly this reason. Flagging here
  rather than silently leaving it out of the report: a real fix for these
  would need either a new index or maintained counters, both out of scope
  for "use the indexes that already exist."

**Tests** (appended to `convex/admin.test.ts`, 5 tests): card/order counts
scoped correctly per user (with another user's cards/orders seeded as the
boundary), revoked-only admin grant → "agent", the revoke-then-regrant
tie-break edge case, and cap tests for both `getAllUsers` (511 seeded users
→ 500 returned) and `getCards`.

## convex/shop.ts

- **`getProducts`** — already used `by_published` (this wasn't a missing
  index, per audit finding #8); the fix was `.collect()` →
  `.take(PUBLISHED_PRODUCTS_CAP)` where `PUBLISHED_PRODUCTS_CAP = 200`.
  In-memory category/featured/search/price/sort filtering is unchanged and
  now runs over the capped set, as authorized by the brief ("in-memory
  search/sort may remain over the capped set"). Public return shape is
  unchanged.

**Tests** (appended to `convex/shop.test.ts`, 2 tests): published-vs-draft
boundary (pre-existing behavior, sanity-checked), and a cap test (210
seeded → 200 returned).

## Files touched

- `convex/teams.ts`, `convex/adminShop.ts`, `convex/admin.ts`, `convex/shop.ts`
- `convex/teams.test.ts` (new), `convex/adminShop.test.ts` (new)
- `convex/admin.test.ts`, `convex/shop.test.ts` (appended)
- `app/admin/analytics/page.tsx`, `app/admin/factory/page.tsx` (UI copy to
  match the new windowed/capped reality)

## Addendum — review fixes (4 findings)

A follow-up review of this task caught a real correctness bug in the caps
just shipped above, plus three smaller gaps. Fixed on the same
`fix/production-audit` branch, base `7dfa629`.

### Finding 1 (IMPORTANT, correctness) — capped queries had no `.order()`

`getAllUsers` (admin.ts), `getCards` (admin.ts), and `getProducts`
(shop.ts) all called `.take(CAP)` with no explicit order. Convex full/
index scans default to **ascending** iteration, so once a table exceeds
its cap the unordered `.take(CAP)` returns the same oldest CAP rows on
every call, forever — a newly inserted row can never enter the result set,
no matter how the caller sorts afterward. Worst case: `shop.ts`'s base
fetch runs *before* the `sortBy` switch, and `sortBy: "newest"` is the
storefront's default (`app/shop/page.tsx`), so past 200 published
products the "Newest First" view could never surface a newly published
product.

**TDD, as directed**: rewrote the three existing cap tests (which only
asserted `result.length`, so they'd pass unchanged even with `.take()`
deleted entirely) to seed more rows than the cap and assert row
*identity* — the newest CAP rows (tail of the seeded id list) must all be
present in the result, the oldest (TOTAL − CAP) rows must all be absent.
Ran the new tests against the pre-fix code first and watched all three
fail for the predicted reason:

```
AssertionError: expected false to be true
 ❯ convex/admin.test.ts:373:31   (getAllUsers — newest row missing)
 ❯ convex/admin.test.ts:411:31   (getCards — newest row missing)
 ❯ convex/shop.test.ts:118:31    (getProducts — newest row missing)
```

Each failure was on the "newest present" assertion specifically (not
"oldest absent") — confirming the returned set was the stale oldest-N
rows, exactly as predicted.

**Fix**: added `.order("desc")` before `.take()` at all three sites.
- `admin.ts` `getAllUsers`: `ctx.db.query("users").order("desc").take(ADMIN_USER_LIST_CAP)`
- `admin.ts` `getCards`: `ctx.db.query("cards").order("desc").take(ADMIN_CARDS_LIST_CAP)`
- `shop.ts` `getProducts`: `.withIndex("by_published", ...).order("desc").take(PUBLISHED_PRODUCTS_CAP)`
  — the `by_published` index has `_creationTime` as an implicit trailing
  sort key, so `order("desc")` gives newest-published-first within the
  index, not just newest-overall.

Downstream logic verified unaffected: `shop.ts`'s in-memory
category/featured/search/price filters and the `sortBy` switch
(price_asc/price_desc/popular/newest) all still run over the capped set
exactly as before — they don't depend on the pre-sort fetch order, only
on which *rows* made it into the set, which is precisely what this fix
corrects. Same for `admin.ts`'s per-user card/order aggregation. No
return shape changed.

All three rewritten tests pass after the fix; full suite stays 281/38
(rewrote existing tests in place rather than adding new ones, so the
count is unchanged from this task's original report above).

### Finding 2 (IMPORTANT, honesty) — `getAllUsers`'s cap had no UI signal

`app/admin/users/page.tsx` rendered `usersList` with no truncation notice,
so past 500 users the page would silently show a partial list as if it
were the complete user base. Applied the same pattern already used on
`app/admin/factory/page.tsx:546` for the cards cap: when
`usersList.length >= 500`, the header now shows "Showing first N users
(list is capped)" instead of implying completeness.

### Finding 3 (MINOR) — `getCards` cap test didn't exercise the cap

The original test at `admin.test.ts:363-384` seeded only 2 cards and
would have passed unchanged even if `.take()` were deleted outright.
Replaced with a real cap test: seeds 510 cards split across two owners,
asserts `result.length === 500`, and asserts newest-retained /
oldest-excluded identity per finding 1's fix (same test that caught the
finding 1 bug pre-fix, see above).

### Finding 4 (MINOR) — inconsistent 90-day qualifier on analytics page

`app/admin/analytics/page.tsx`'s "Avg. Order Value" card read "Per paid
order" while its three sibling cards (Total Revenue, Paid Orders,
Delivered) all said "...last 90 days". Changed to "Per paid order, last
90 days" to match — `averageOrderValue` is itself computed from the same
90-day-windowed `getShopAnalytics` query, so the old copy understated the
window that was actually already in effect.

### Gates (re-run after all four fixes)

- `npx vitest run`: **281 passed (281), 38 test files passed (38)**
- `npx tsc --noEmit`: clean
- `npx eslint .`: **0 errors**, 31 pre-existing warnings (unchanged)
- `npm run build`: clean (`✓ Compiled successfully`, all routes generated)
- `npx convex dev --once`: `✔ Convex functions ready!` — deployed clean

### Files touched (addendum)

- `convex/admin.ts`, `convex/shop.ts` — `.order("desc")` on the three
  capped queries
- `convex/admin.test.ts`, `convex/shop.test.ts` — cap tests rewritten to
  assert row identity, not just length
- `app/admin/users/page.tsx` — cap-aware truncation notice
- `app/admin/analytics/page.tsx` — consistent 90-day qualifier
