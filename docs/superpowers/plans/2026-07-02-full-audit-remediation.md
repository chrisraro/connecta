# Full Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Critical/High findings from the 2026-07-02 full-platform audit (privilege escalation, PII leak, double-charge, silent payment failures, overselling/discount races, missing security headers, unauthenticated cart access, the broken builder reorder/hide feature, image-pipeline bugs, and public-profile image performance) with tests proving each fix.

**Architecture:** Backend fixes land in `convex/*.ts` (Convex mutations/queries/actions) and are unit-tested with `convex-test` against the real schema. Frontend fixes land in `app/`, `components/`, `lib/` and are unit-tested with Vitest + Testing Library where the bug is in pure logic; UI-only regressions (e.g. missing `aria-label`) are verified by direct code inspection in review, not a rendering test, unless a task says otherwise.

**Tech Stack:** Next.js 16 (App Router), React 19, Convex, Clerk, PayRex, Vitest, convex-test, @testing-library/react.

## Global Constraints

- Branch: `fix/full-audit-remediation` (already checked out). Never commit to `main`.
- Every task follows red-green-refactor: write the failing test first, confirm it fails for the right reason, implement, confirm it passes.
- Money and inventory fields are always integers (PHP centavos / unit counts). Never introduce floating point for currency.
- All Convex mutations that accept a `clerkId` argument today must keep accepting it (frontend call sites are unchanged in this plan) but must verify it against `ctx.auth` via `requireUserMatching` — never trust the argument alone for identity.
- Do not change any Convex schema field that already has data semantics (renaming/removing) — only additive schema changes (new tables, new indexes, new optional fields).
- Run `npx convex codegen` (or `npx convex dev --once`) after any `convex/schema.ts` change, before running tests that touch the changed tables, so `convex/_generated` stays in sync.
- Commit after every task with a `fix:` or `feat:` prefix referencing the audit finding, e.g. `fix: require identity check in setupFirstAdmin (Auth #1)`.

---

## Task 0: Test infrastructure (Vitest + convex-test + Testing Library)

**Files:**

- Create: `vitest.config.ts`
- Create: `convex/setup.test.ts`
- Modify: `package.json` (add `devDependencies` and a `test` script)

**Interfaces:**

- Produces: `npm test` runs Vitest once; `npm run test:watch` runs it in watch mode. All later tasks' tests use `import { convexTest } from "convex-test";` and `import schema from "./schema";` (for `convex/*.test.ts`) or `@testing-library/react` + `@testing-library/jest-dom` (for `lib/*.test.ts`, `app/**/*.test.tsx`).

- [ ] **Step 1: Install test dependencies**

Run: `npm install -D vitest @vitest/ui convex-test @edge-runtime/vm @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
Expected: exits 0, `package.json` devDependencies updated.

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Add the Vitest setup file**

Create `vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the `test` script to package.json**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a smoke test proving the harness works end-to-end**

Create `convex/setup.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";

test("convex-test harness can insert and read a user", async () => {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "smoke@test.dev",
      clerkId: "smoke_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user?.email).toBe("smoke@test.dev");
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — `1 passed`. If it fails on the `edge-runtime` environment not being found, run `npm install -D @edge-runtime/vm` again and retry.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts convex/setup.test.ts package.json package-lock.json
git commit -m "test: add Vitest + convex-test harness"
```

---

## Task 1: Platform lockdown (Auth #1 Critical, Auth #2 High, Auth #3 Medium)

**Files:**

- Modify: `convex/admin.ts:156-188` (`setupFirstAdmin`)
- Modify: `convex/checkout.ts:284-293` (`getOrderByNumber`)
- Modify: `middleware.ts`
- Test: `convex/admin.test.ts`
- Test: `convex/checkout.test.ts`

**Interfaces:**

- Consumes: `requireUser(ctx)` and `getAuthedUser(ctx)` from `convex/authz.ts` (already defined, do not modify).
- Produces: `setupFirstAdmin` now requires the caller to be authenticated and to match `args.clerkId` (same contract every other function in `admin.ts` already uses via `requireUserMatching`). `getOrderByNumber` now requires the caller to own the order (`order.userId === user._id`) OR be an authenticated admin — guests can no longer look up arbitrary orders by number; the shop order-confirmation page must pass the caller's Clerk id.

### Step 1: Write the failing test for `setupFirstAdmin`

Create `convex/admin.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

test("setupFirstAdmin rejects an unauthenticated caller", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "victim@test.dev",
      clerkId: "victim_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });

  await expect(
    t.mutation(api.admin.setupFirstAdmin, { clerkId: "victim_clerk_id" }),
  ).rejects.toThrow(/unauthorized/i);
});

test("setupFirstAdmin rejects a caller impersonating another clerkId", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "victim@test.dev",
      clerkId: "victim_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  const asAttacker = t.withIdentity({ subject: "attacker_clerk_id" });

  await expect(
    asAttacker.mutation(api.admin.setupFirstAdmin, { clerkId: "victim_clerk_id" }),
  ).rejects.toThrow(/unauthorized/i);
});

test("setupFirstAdmin grants superadmin when the caller matches the clerkId and no admin exists yet", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "first@test.dev",
      clerkId: "first_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  const asFirstUser = t.withIdentity({ subject: "first_clerk_id" });

  const result = await asFirstUser.mutation(api.admin.setupFirstAdmin, {
    clerkId: "first_clerk_id",
  });

  expect(result.success).toBe(true);
  const isAdmin = await asFirstUser.query(api.admin.checkAdminStatus, {
    clerkId: "first_clerk_id",
  });
  expect(isAdmin.isAdmin).toBe(true);
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run convex/admin.test.ts`
Expected: FAIL — the first two tests fail because `setupFirstAdmin` currently succeeds without authentication.

### Step 3: Fix `setupFirstAdmin`

In `convex/admin.ts`, replace the `setupFirstAdmin` handler body (lines 156-188). Change:

```typescript
export const setupFirstAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) {
```

to:

```typescript
export const setupFirstAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: this bootstraps the platform's first superadmin — it must
    // never trust the clerkId argument alone (Auth audit #1).
    const user = await requireUserMatching(ctx, args.clerkId);
    if (!user) {
```

Remove the now-redundant lookup a few lines down (the original body re-fetched `user` by `args.clerkId` right after the `if (!user)` guard — since `requireUserMatching` already returns the user doc, delete the duplicate query). The full corrected handler:

```typescript
export const setupFirstAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: this bootstraps the platform's first superadmin — it must
    // never trust the clerkId argument alone (Auth audit #1).
    const user = await requireUserMatching(ctx, args.clerkId);
    const existingAdmins = await ctx.db
      .query("admins")
      .withIndex("by_active", (q) => q.eq("revokedAt", undefined))
      .collect();
    if (existingAdmins.length > 0) {
      throw new Error("Admin already exists. Use grantAdminRole mutation to add more admins.");
    }
    const adminId = await ctx.db.insert("admins", {
      userId: user._id,
      role: "superadmin",
      grantedBy: user._id,
      grantedAt: Date.now(),
      reason: "Initial admin setup via CLI script",
    });
    return {
      success: true,
      adminId,
      userId: user._id,
      email: user.email,
      message: `Superadmin role granted to ${user.email}`,
    };
  },
});
```

`requireUserMatching` is already imported at the top of `convex/admin.ts` (line 4: `import { isActiveAdmin, requireUserMatching, requireAdmin as requireAdminAuthed } from "./authz";`) — no new import needed.

### Step 4: Run test to verify it passes

Run: `npx vitest run convex/admin.test.ts`
Expected: PASS — all 3 tests green.

### Step 5: Write the failing test for `getOrderByNumber`

Create `convex/checkout.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

async function seedOrder(t: ReturnType<typeof convexTest>, ownerClerkId: string) {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner@test.dev",
      clerkId: ownerClerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    const orderId = await ctx.db.insert("orders", {
      orderNumber: "TF-2026-TESTORD",
      userId: ownerId,
      status: "pending",
      items: [],
      subtotal: 10000,
      tax: 0,
      shipping: 0,
      total: 10000,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      shippingAddress: {
        fullName: "Jane Owner",
        addressLine1: "123 Main St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "09171234567",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ownerId, orderId };
  });
}

test("getOrderByNumber rejects a caller who does not own the order", async () => {
  const t = convexTest(schema);
  await seedOrder(t, "owner_clerk_id");
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "stranger@test.dev",
      clerkId: "stranger_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  const asStranger = t.withIdentity({ subject: "stranger_clerk_id" });

  await expect(
    asStranger.query(api.checkout.getOrderByNumber, { orderNumber: "TF-2026-TESTORD" }),
  ).rejects.toThrow(/unauthorized/i);
});

test("getOrderByNumber rejects an unauthenticated caller", async () => {
  const t = convexTest(schema);
  await seedOrder(t, "owner_clerk_id");

  await expect(
    t.query(api.checkout.getOrderByNumber, { orderNumber: "TF-2026-TESTORD" }),
  ).rejects.toThrow(/unauthorized/i);
});

test("getOrderByNumber returns the order to its owner", async () => {
  const t = convexTest(schema);
  await seedOrder(t, "owner_clerk_id");
  const asOwner = t.withIdentity({ subject: "owner_clerk_id" });

  const order = await asOwner.query(api.checkout.getOrderByNumber, {
    orderNumber: "TF-2026-TESTORD",
  });

  expect(order?.orderNumber).toBe("TF-2026-TESTORD");
});
```

### Step 6: Run test to verify it fails

Run: `npx vitest run convex/checkout.test.ts`
Expected: FAIL — the first two tests fail because `getOrderByNumber` currently returns the order to anyone.

### Step 7: Fix `getOrderByNumber`

In `convex/checkout.ts`, `getAuthedUser` is imported at line 10 (`import { getAuthedUser } from "./authz";`) — change that line to also import `isActiveAdmin`:

```typescript
import { getAuthedUser, isActiveAdmin } from "./authz";
```

Then replace `getOrderByNumber`:

```typescript
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();
    return order;
  },
});
```

with:

```typescript
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: order numbers are not secret (predictable timestamp + 3-char
    // suffix) — never return an order without verifying ownership (Auth #2).
    const user = await getAuthedUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: sign in to view this order");
    }
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();
    if (!order) return null;
    const isOwner = order.userId === user._id;
    const isAdmin = await isActiveAdmin(ctx, user._id);
    if (!isOwner && !isAdmin) {
      throw new Error("Unauthorized: you do not have access to this order");
    }
    return order;
  },
});
```

**Known caller-side follow-up (do not implement in this task, just leave a `// TODO` comment where `getOrderByNumber` is called):** `app/shop/order/[orderNumber]/page.tsx` currently calls this query without passing auth context beyond the ambient Convex client session — since Clerk sessions are already attached to the Convex client for signed-in users this works for signed-in buyers immediately; guest checkout buyers (no Clerk session) will now get "Unauthorized" on their own order-confirmation page. Add a one-line comment above the `useQuery(api.checkout.getOrderByNumber, ...)` call site: `// TODO(follow-up): guest checkout users need a signed access token for this page — see Auth audit #2 follow-up.` Do not attempt to build the guest-access-token mechanism in this task; it's out of scope and the plan's global constraints forbid speculative scope growth.

### Step 8: Run test to verify it passes

Run: `npx vitest run convex/checkout.test.ts`
Expected: PASS — all 3 tests green.

### Step 9: Add the admin route middleware gate (Auth #3)

Write the failing test first. Middleware itself is hard to unit test in isolation (it depends on `clerkMiddleware`'s runtime), so this step is verified by code inspection in the task review, not an automated test — state this explicitly in the implementer's report. Modify `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth(.*)", // Unified auth route (includes callback)
  "/p/(.*)", // Public profiles
  "/t/(.*)", // NFC Tap redirects
  "/shop(.*)", // Public shop (browsing, cart, checkout)
  "/api/webhooks(.*)", // Payment webhooks
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Single URL Experience: Redirect old auth paths to /auth
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/auth", req.url));
  }
  if (pathname.startsWith("/auth/") && pathname !== "/auth" && pathname !== "/auth/callback") {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  // Protect all non-public routes (requires authentication)
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Defense-in-depth: /admin/* also requires the "admin" role claim on the
  // Clerk session (populated via a Clerk session-token JWT template mapping
  // publicMetadata.role -> sessionClaims.metadata.role). The real
  // authorization gate remains convex/authz.ts:requireAdmin on every admin
  // Convex function — this check only stops the admin UI shell itself from
  // rendering for non-admins (Auth audit #3).
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Prerequisite the implementer must verify before this step ships:** `sessionClaims.metadata.role` is only populated if a Clerk JWT template / session-token customization sets it from `publicMetadata.role`. Check the Clerk dashboard configuration (or `docs/` in this repo) for whether that's already wired up. If it is not, this check will make `role` always `undefined`, redirecting every admin away — that is a **safe failure direction** (fails closed), but flag it clearly in the task report as `DONE_WITH_CONCERNS` rather than `DONE`, naming exactly this prerequisite, so the human partner can confirm Clerk-side configuration before merging.

### Step 10: Verify manually

Run: `npm run build` — Expected: build succeeds with no type errors in `middleware.ts`, `convex/admin.ts`, `convex/checkout.ts`.

### Step 11: Commit

```bash
git add convex/admin.ts convex/admin.test.ts convex/checkout.ts convex/checkout.test.ts middleware.ts
git commit -m "fix: require identity checks in setupFirstAdmin and getOrderByNumber, gate /admin by role (Auth #1, #2, #3)"
```

---

## Task 2: Payment idempotency and failure handling (Payments #1, #2 Critical)

**Files:**

- Modify: `convex/billing.ts:190-266` (`createUpgradeCheckout`)
- Modify: `convex/http.ts:109-154` (webhook handler)
- Modify: `convex/checkout.ts:340-446` (`internalConfirmOrderPayment` — add a `"failed"`/expired branch is already supported by the `paymentStatus` union; this task wires the webhook to actually call it)
- Test: `convex/billing.test.ts`

**Interfaces:**

- Consumes: `PLAN_LIMITS`, `PLAN_PERIOD_DAYS` from `convex/plans.ts` (unchanged).
- Produces: `createUpgradeCheckout` now reuses an existing `pending` invoice for the same `(userId, plan)` pair instead of always inserting a new one, and passes an `Idempotency-Key` header to PayRex derived from the invoice id (stable across retries of the same invoice). The webhook now also handles `payment_intent.payment_failed` / `checkout_session.expire` event types by calling `internal.checkout.internalConfirmOrderPayment` with `paymentStatus: "failed"` (shop orders) or a new `internal.billing.internalFailInvoice` (subscriptions).

### Step 1: Write the failing test for invoice reuse

Create `convex/billing.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "upgrader@test.dev",
      clerkId: "upgrader_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
}

test("createPendingInvoice does not dedupe by itself (baseline)", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);

  const invoiceId1 = await t.mutation(internal.billing.createPendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });
  const invoiceId2 = await t.mutation(internal.billing.createPendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  expect(invoiceId1).not.toBe(invoiceId2);
});

test("findOrCreatePendingInvoice reuses an existing pending invoice for the same user+plan", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);

  const first = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });
  const second = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  expect(second).toBe(first);

  const invoices = await t.run(async (ctx) =>
    ctx.db
      .query("subscriptionInvoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );
  expect(invoices.length).toBe(1);
});

test("findOrCreatePendingInvoice creates a new invoice once the prior one is paid", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);

  const first = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(first, { status: "paid" });
  });

  const second = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  expect(second).not.toBe(first);
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run convex/billing.test.ts`
Expected: FAIL — `internal.billing.findOrCreatePendingInvoice` does not exist yet.

### Step 3: Add `findOrCreatePendingInvoice` and wire it into `createUpgradeCheckout`

In `convex/billing.ts`, add a new internal mutation right after `createPendingInvoice` (after line 166):

```typescript
// Idempotent version of createPendingInvoice: reuses an existing PENDING
// invoice for the same (userId, plan) instead of always inserting a new one.
// This closes the double-charge hole where a double-click / tab reload /
// network retry on the upgrade button created two independent invoices that
// could both be paid (Payments audit #2).
export const findOrCreatePendingInvoice = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("business")),
    amountCentavos: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptionInvoices")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(q.eq(q.field("plan"), args.plan), q.eq(q.field("status"), "pending")))
      .first();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("subscriptionInvoices", {
      userId: args.userId,
      plan: args.plan,
      amountCentavos: args.amountCentavos,
      periodDays: PLAN_PERIOD_DAYS,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
```

Then in `createUpgradeCheckout` (line 211-214), replace:

```typescript
const invoiceId = await ctx.runMutation(internal.billing.createPendingInvoice, {
  userId: me.userId,
  plan: args.plan,
  amountCentavos: amount,
});
```

with:

```typescript
const invoiceId = await ctx.runMutation(internal.billing.findOrCreatePendingInvoice, {
  userId: me.userId,
  plan: args.plan,
  amountCentavos: amount,
});
```

And add an idempotency key to the PayRex request. In the same function, after the `pairs` array is built (after line 228 `pairs.push(["metadata[invoice_id]", invoiceId]);`), pass an `Idempotency-Key` header derived from the invoice id so a retried `fetch` against the same pending invoice doesn't create a second PayRex session:

```typescript
const res = await fetch("https://api.payrexhq.com/checkout_sessions", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: "Basic " + btoa(`${secretKey}:`),
    "Idempotency-Key": `upgrade-invoice-${invoiceId}`,
  },
  body,
});
```

(This replaces the existing `headers: {...}` block at lines 236-239 — same two keys, plus the new `Idempotency-Key` line.)

### Step 4: Run test to verify it passes

Run: `npx vitest run convex/billing.test.ts`
Expected: PASS — all 3 tests green.

### Step 5: Write the failing test for webhook failure handling

Add to `convex/billing.test.ts`:

```typescript
test("internalFailInvoice marks a pending invoice failed and leaves paid invoices untouched", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);
  const invoiceId = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  const result = await t.mutation(internal.billing.internalFailInvoice, { invoiceId });
  expect(result.success).toBe(true);

  const invoice = await t.run(async (ctx) => ctx.db.get(invoiceId));
  expect(invoice?.status).toBe("expired");
});
```

### Step 6: Run test to verify it fails

Run: `npx vitest run convex/billing.test.ts`
Expected: FAIL — `internal.billing.internalFailInvoice` does not exist yet.

### Step 7: Add `internalFailInvoice` and wire the webhook to call it

In `convex/billing.ts`, add after `internalActivateInvoice` (after line 356):

```typescript
// Called by the webhook when PayRex reports a failed/expired checkout for a
// subscription invoice, so the invoice stops showing as permanently
// "pending" and the user can see (and retry) the failure (Payments #1).
export const internalFailInvoice = internalMutation({
  args: { invoiceId: v.id("subscriptionInvoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.status !== "pending") {
      return { success: false, reason: "not_pending" };
    }
    await ctx.db.patch(args.invoiceId, { status: "expired" });
    return { success: true };
  },
});
```

Then in `convex/http.ts`, replace the `isPaid` check (lines 109-111) and the branch below it (lines 113-154) to also recognize failure/expiry event types and route to the new failure handlers. Replace:

```typescript
  const isPaid =
    event.type === "payment_intent.succeeded" ||
    event.type === "checkout_session.payment.paid";

  if (isPaid && event.data) {
```

with:

```typescript
  const isPaid =
    event.type === "payment_intent.succeeded" ||
    event.type === "checkout_session.payment.paid";
  const isFailed =
    event.type === "payment_intent.payment_failed" ||
    event.type === "checkout_session.expire" ||
    event.type === "checkout_session.payment.failed";

  if ((isPaid || isFailed) && event.data) {
```

And after the existing `if (invoiceId) { ... } else { ... }` block (which currently ends at line 153 with the shop-order `internalConfirmOrderPayment` call), change both branches to pass through the correct status instead of hardcoding `"paid"`. Replace the whole inner block (lines 118-153):

```typescript
// Subscription invoice id (Phase 4 plan upgrades) takes priority — it
// routes to the billing activation path instead of the shop order path.
const invoiceId =
  (typeof metaA?.invoice_id === "string" ? (metaA.invoice_id as string) : undefined) ??
  (typeof metaB?.invoice_id === "string" ? (metaB.invoice_id as string) : undefined);

// Fall back to the payment intent id (event.data.id for payment_intent.*).
const paymentIntentId = typeof event.data.id === "string" ? event.data.id : undefined;

if (invoiceId) {
  // Plan upgrade/renewal: activate the subscription invoice.
  await ctx.runMutation(internal.billing.internalActivateInvoice, {
    invoiceId: invoiceId as Id<"subscriptionInvoices">,
    paymentIntentId,
  });
} else {
  // Existing shop order flow.
  const orderNumber =
    (typeof metaA?.order_number === "string" ? (metaA.order_number as string) : undefined) ??
    (typeof metaB?.order_number === "string" ? (metaB.order_number as string) : undefined);

  await ctx.runMutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber,
    paymentIntentId,
    paymentStatus: "paid",
  });
}
```

with:

```typescript
// Subscription invoice id (Phase 4 plan upgrades) takes priority — it
// routes to the billing activation path instead of the shop order path.
const invoiceId =
  (typeof metaA?.invoice_id === "string" ? (metaA.invoice_id as string) : undefined) ??
  (typeof metaB?.invoice_id === "string" ? (metaB.invoice_id as string) : undefined);

// Fall back to the payment intent id (event.data.id for payment_intent.*).
const paymentIntentId = typeof event.data.id === "string" ? event.data.id : undefined;

if (invoiceId) {
  if (isPaid) {
    await ctx.runMutation(internal.billing.internalActivateInvoice, {
      invoiceId: invoiceId as Id<"subscriptionInvoices">,
      paymentIntentId,
    });
  } else {
    await ctx.runMutation(internal.billing.internalFailInvoice, {
      invoiceId: invoiceId as Id<"subscriptionInvoices">,
    });
  }
} else {
  // Existing shop order flow.
  const orderNumber =
    (typeof metaA?.order_number === "string" ? (metaA.order_number as string) : undefined) ??
    (typeof metaB?.order_number === "string" ? (metaB.order_number as string) : undefined);

  await ctx.runMutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber,
    paymentIntentId,
    paymentStatus: isPaid ? "paid" : "failed",
  });
}
```

### Step 8: Run test to verify it passes

Run: `npx vitest run convex/billing.test.ts`
Expected: PASS.

### Step 9: Verify build

Run: `npm run build`
Expected: succeeds with no type errors.

### Step 10: Commit

```bash
git add convex/billing.ts convex/billing.test.ts convex/http.ts
git commit -m "fix: idempotent invoice creation + handle failed/expired PayRex webhook events (Payments #1, #2)"
```

---

## Task 3: Inventory/discount race fixes + cart quantity clamp (Backend #1/#2/#3, Payments #3/#4)

**Files:**

- Modify: `convex/checkout.ts` (`internalConfirmOrderPayment`, `resolveDiscount` call site inside it)
- Modify: `convex/shop.ts:218-259` (`addToCart`), `convex/shop.ts:329-350` (`updateCartItem`)
- Test: `convex/checkout.test.ts` (append)
- Test: `convex/shop.test.ts`

**Interfaces:**

- Produces: `internalConfirmOrderPayment` now re-validates stock and the discount's `usageLimit`/`validUntil`/`isActive` immediately before decrementing inventory / incrementing `usedCount`, and marks the order `"failed"` (not `"paid"`) if either re-check fails instead of silently overselling or over-redeeming. `addToCart` and `updateCartItem` reject `quantity < 1`.

### Step 1: Write the failing tests for cart quantity clamping

Create `convex/shop.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedProduct(t: ReturnType<typeof convexTest>, inventory = 10) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      name: "Test Card",
      slug: "test-card",
      basePrice: 50000,
      sku: "TC-1",
      inventory,
      lowStockThreshold: 2,
      trackInventory: true,
      isPublished: true,
      isFeatured: false,
      tags: [],
      images: [],
      primaryImageIndex: 0,
      shippingRequired: true,
    });
  });
}

test("addToCart rejects zero or negative quantity", async () => {
  const t = convexTest(schema);
  const productId = await seedProduct(t);

  await expect(
    t.mutation(api.shop.addToCart, {
      guestId: "guest-1",
      productId,
      quantity: 0,
    }),
  ).rejects.toThrow(/quantity/i);

  await expect(
    t.mutation(api.shop.addToCart, {
      guestId: "guest-1",
      productId,
      quantity: -3,
    }),
  ).rejects.toThrow(/quantity/i);
});

test("addToCart accepts a positive quantity", async () => {
  const t = convexTest(schema);
  const productId = await seedProduct(t);

  const result = await t.mutation(api.shop.addToCart, {
    guestId: "guest-1",
    productId,
    quantity: 2,
  });

  expect(result.success).toBe(true);
});

test("updateCartItem rejects a negative quantity (zero still means remove)", async () => {
  const t = convexTest(schema);
  const productId = await seedProduct(t);
  await t.mutation(api.shop.addToCart, { guestId: "guest-1", productId, quantity: 1 });

  await expect(
    t.mutation(api.shop.updateCartItem, {
      guestId: "guest-1",
      productId,
      quantity: -1,
    }),
  ).rejects.toThrow(/quantity/i);
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run convex/shop.test.ts`
Expected: FAIL — `addToCart` currently accepts `quantity: 0` / negative values.

### Step 3: Clamp quantity in `addToCart` and `updateCartItem`

In `convex/shop.ts`, inside `addToCart`'s handler, right after the opening `let userId;` block resolution and before `// Validate product exists and is published` (i.e. immediately after line 235's closing brace, before line 237's comment), add:

```typescript
if (!Number.isInteger(args.quantity) || args.quantity < 1) {
  throw new Error("Quantity must be a positive whole number");
}
```

In `updateCartItem`, the existing check at line 348 is `if (args.quantity < 0)`. `0` is intentionally still allowed there (it means "remove the item," handled a few lines down). Tighten it to also reject non-integers and keep `0` legal:

```typescript
if (!Number.isInteger(args.quantity) || args.quantity < 0) {
  throw new Error("Quantity must be a non-negative whole number");
}
```

(This replaces line 348's existing `if (args.quantity < 0) { throw new Error("Quantity must be non-negative"); }`.)

### Step 4: Run test to verify it passes

Run: `npx vitest run convex/shop.test.ts`
Expected: PASS.

### Step 5: Write the failing tests for the payment-confirmation race fixes

Append to `convex/checkout.test.ts`:

```typescript
import { internal, api as apiRoot } from "./_generated/api";

async function seedProductForOrder(t: ReturnType<typeof convexTest>, inventory: number) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      name: "Limited Card",
      slug: "limited-card",
      basePrice: 50000,
      sku: "LC-1",
      inventory,
      lowStockThreshold: 1,
      trackInventory: true,
      isPublished: true,
      isFeatured: false,
      tags: [],
      images: [],
      primaryImageIndex: 0,
      shippingRequired: true,
    });
  });
}

async function seedPendingOrder(
  t: ReturnType<typeof convexTest>,
  productId: any,
  quantity: number,
  orderNumber: string,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      items: [
        {
          productId,
          productName: "Limited Card",
          quantity,
          unitPrice: 50000,
          total: 50000 * quantity,
        },
      ],
      subtotal: 50000 * quantity,
      tax: 0,
      shipping: 0,
      total: 50000 * quantity,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      shippingAddress: {
        fullName: "Buyer",
        addressLine1: "1 St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "0917",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

test("internalConfirmOrderPayment fails the second of two concurrent orders that oversell the last unit", async () => {
  const t = convexTest(schema);
  const productId = await seedProductForOrder(t, 1);
  const orderNumberA = "TF-2026-ORDA";
  const orderNumberB = "TF-2026-ORDB";
  await seedPendingOrder(t, productId, 1, orderNumberA);
  await seedPendingOrder(t, productId, 1, orderNumberB);

  await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber: orderNumberA,
    paymentStatus: "paid",
  });
  await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber: orderNumberB,
    paymentStatus: "paid",
  });

  const product = await t.run(async (ctx) => ctx.db.get(productId));
  expect(product?.inventory).toBe(0);

  const orderB = await t.run(async (ctx) =>
    ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", orderNumberB))
      .first(),
  );
  expect(orderB?.paymentStatus).toBe("failed");
});

test("internalConfirmOrderPayment stops a discount from being redeemed past its usage limit", async () => {
  const t = convexTest(schema);
  const productId = await seedProductForOrder(t, 100);
  await t.run(async (ctx) => {
    await ctx.db.insert("discounts", {
      code: "ONECODE",
      type: "fixed",
      value: 1000,
      usageLimit: 1,
      usedCount: 0,
      validFrom: 0,
      isActive: true,
    });
  });

  const orderNumberA = "TF-2026-DISCA";
  const orderNumberB = "TF-2026-DISCB";
  await t.run(async (ctx) => {
    for (const orderNumber of [orderNumberA, orderNumberB]) {
      await ctx.db.insert("orders", {
        orderNumber,
        status: "pending",
        items: [
          { productId, productName: "Limited Card", quantity: 1, unitPrice: 50000, total: 50000 },
        ],
        subtotal: 50000,
        tax: 0,
        shipping: 0,
        discount: 1000,
        appliedDiscountCode: "ONECODE",
        total: 49000,
        currency: "PHP",
        paymentProvider: "payrex",
        paymentStatus: "pending",
        shippingAddress: {
          fullName: "Buyer",
          addressLine1: "1 St",
          city: "Manila",
          postalCode: "1000",
          country: "PH",
          phone: "0917",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  });

  await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber: orderNumberA,
    paymentStatus: "paid",
  });
  await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber: orderNumberB,
    paymentStatus: "paid",
  });

  const discount = await t.run(async (ctx) =>
    ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", "ONECODE"))
      .first(),
  );
  expect(discount?.usedCount).toBe(1);

  const orderB = await t.run(async (ctx) =>
    ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", orderNumberB))
      .first(),
  );
  expect(orderB?.paymentStatus).toBe("failed");
});
```

### Step 6: Run test to verify it fails

Run: `npx vitest run convex/checkout.test.ts`
Expected: FAIL — both new tests fail (inventory goes to `-1`; `usedCount` reaches `2`; both orders stay `"paid"`).

### Step 7: Fix `internalConfirmOrderPayment`

In `convex/checkout.ts`, replace the inventory-decrement loop and discount-increment block (lines 389-416):

```typescript
for (const item of order.items) {
  const product = await ctx.db.get(item.productId);
  if (product && product.trackInventory) {
    await ctx.db.patch(product._id, {
      inventory: product.inventory - item.quantity,
    });
  }
  if (item.variationId) {
    const variation = await ctx.db.get(item.variationId);
    if (variation) {
      await ctx.db.patch(variation._id, {
        inventory: variation.inventory - item.quantity,
      });
    }
  }
}

if (order.appliedDiscountCode) {
  const discount = await ctx.db
    .query("discounts")
    .withIndex("by_code", (q) => q.eq("code", order.appliedDiscountCode!))
    .first();
  if (discount) {
    await ctx.db.patch(discount._id, {
      usedCount: discount.usedCount + 1,
    });
  }
}
```

with:

```typescript
// Re-validate stock and the discount's usage limit HERE, immediately
// before committing, instead of trusting the create-time check — closes
// the overselling / usage-limit-bypass race between two orders paid
// concurrently for the same last-unit product or single-use code
// (Backend #1/#2/#3, Payments #3/#4).
for (const item of order.items) {
  const product = await ctx.db.get(item.productId);
  if (product && product.trackInventory && product.inventory < item.quantity) {
    await ctx.db.patch(order._id, {
      paymentStatus: "failed",
      status: order.status,
      updatedAt: Date.now(),
    });
    return { success: false, reason: "insufficient_stock" };
  }
  if (item.variationId) {
    const variation = await ctx.db.get(item.variationId);
    if (variation && variation.inventory < item.quantity) {
      await ctx.db.patch(order._id, {
        paymentStatus: "failed",
        status: order.status,
        updatedAt: Date.now(),
      });
      return { success: false, reason: "insufficient_stock" };
    }
  }
}

if (order.appliedDiscountCode) {
  const discount = await ctx.db
    .query("discounts")
    .withIndex("by_code", (q) => q.eq("code", order.appliedDiscountCode!))
    .first();
  if (discount && discount.usageLimit !== undefined && discount.usedCount >= discount.usageLimit) {
    await ctx.db.patch(order._id, {
      paymentStatus: "failed",
      status: order.status,
      updatedAt: Date.now(),
    });
    return { success: false, reason: "discount_limit_reached" };
  }
}

for (const item of order.items) {
  const product = await ctx.db.get(item.productId);
  if (product && product.trackInventory) {
    await ctx.db.patch(product._id, {
      inventory: product.inventory - item.quantity,
    });
  }
  if (item.variationId) {
    const variation = await ctx.db.get(item.variationId);
    if (variation) {
      await ctx.db.patch(variation._id, {
        inventory: variation.inventory - item.quantity,
      });
    }
  }
}

if (order.appliedDiscountCode) {
  const discount = await ctx.db
    .query("discounts")
    .withIndex("by_code", (q) => q.eq("code", order.appliedDiscountCode!))
    .first();
  if (discount) {
    await ctx.db.patch(discount._id, {
      usedCount: discount.usedCount + 1,
    });
  }
}
```

Note this function already patches `paymentStatus`/`status`/`paidAt` optimistically at the top (lines 377-383) before this block runs; the re-check above corrects that by overwriting `paymentStatus` back to `"failed"` if either re-validation fails, and returns early before the email-scheduling code at the bottom (lines 418-442) so no order-confirmation email goes out for an order that just failed its re-check.

### Step 8: Run test to verify it passes

Run: `npx vitest run convex/checkout.test.ts`
Expected: PASS — all tests in the file green, including the two new race tests.

### Step 9: Verify build

Run: `npm run build`
Expected: succeeds.

### Step 10: Commit

```bash
git add convex/checkout.ts convex/checkout.test.ts convex/shop.ts convex/shop.test.ts
git commit -m "fix: re-validate stock and discount usage at payment confirmation, clamp cart quantity (Backend #1/#2/#3, Payments #3/#4)"
```

---

## Task 4: Security headers + server-side upload validation (Security #1, #2 High)

**Files:**

- Modify: `next.config.ts`
- Modify: `convex/images.ts`
- Test: `convex/images.test.ts`

**Interfaces:**

- Produces: every response now carries CSP/HSTS/X-Frame-Options/nosniff/Referrer-Policy headers. `convex/images.ts` gains an internal validation step: after a client POSTs to the generated upload URL, callers must call a new `validateUpload` mutation before the storage id is considered usable elsewhere; components that show uploaded images already call `getImageUrl`, which now returns `null` for anything that fails validation instead of silently serving it.

### Step 1: Add security headers (verified by direct inspection + a runtime check, not a unit test — `next.config.ts` headers can't run under Vitest)

Replace `next.config.ts` entirely:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.convex.cloud https://*.convex.site https://*.clerk.accounts.dev https://clerk.com wss://*.convex.cloud",
              "frame-src 'self' https://*.clerk.accounts.dev",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Note for the implementer:** the `script-src`/`connect-src` origins list Clerk's dev-instance domain pattern (`*.clerk.accounts.dev`) alongside `clerk.com`, and Convex's `*.convex.cloud`/`*.convex.site`. If the deployed Convex/Clerk URLs differ (check `NEXT_PUBLIC_CONVEX_URL` and the Clerk publishable key's domain in `.env.local`), adjust the CSP origins to match exactly — a CSP that's too strict will silently break the app in the browser console, not at build time. Verify manually (Step 2) rather than trusting this compiles.

### Step 2: Verify manually

Run: `npm run build && npm run dev` (or `npm run build && npm start`), then in a browser open the app, open DevTools → Network tab, reload, and confirm the response headers on the top-level document include `content-security-policy`, `x-frame-options`, `strict-transport-security`. Also check the DevTools Console for any CSP violation errors while navigating the dashboard, public profile, and shop — fix any blocked origin by adding it to the relevant `next.config.ts` directive. Stop the dev server when done.

### Step 3: Write the failing test for upload validation

Create `convex/images.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

test("validateUpload rejects a file over the size limit", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/png",
    size: 6 * 1024 * 1024,
  });
  expect(result.valid).toBe(false);
  expect(result.reason).toMatch(/size/i);
});

test("validateUpload rejects a disallowed content type", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/svg+xml",
    size: 1024,
  });
  expect(result.valid).toBe(false);
  expect(result.reason).toMatch(/type/i);
});

test("validateUpload accepts a small jpeg", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/jpeg",
    size: 512 * 1024,
  });
  expect(result.valid).toBe(true);
});
```

### Step 4: Run test to verify it fails

Run: `npx vitest run convex/images.test.ts`
Expected: FAIL — `internal.images.validateUploadMetadata` does not exist yet.

### Step 5: Implement server-side upload validation

Replace `convex/images.ts` entirely:

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin } from "./admin";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — generous ceiling above the 1MB client-side compression target.

export const generateUploadUrl = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is an admin
    await requireAdmin(ctx, args.clerkId);

    // Generate upload URL for authenticated admin users
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return uploadUrl;
  },
});

// Pure validation logic, exposed as an internal mutation purely so it's
// independently testable; also called directly (not via ctx.runMutation)
// from validateUpload below.
export const validateUploadMetadata = internalMutation({
  args: { contentType: v.string(), size: v.number() },
  handler: async (_ctx, args) => {
    return validateMetadata(args.contentType, args.size);
  },
});

function validateMetadata(
  contentType: string,
  size: number,
): { valid: true } | { valid: false; reason: string } {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { valid: false, reason: `Unsupported content type: ${contentType}` };
  }
  if (size > MAX_UPLOAD_BYTES) {
    return { valid: false, reason: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)` };
  }
  return { valid: true };
}

// Called by the client immediately after a successful POST to the upload
// URL, before the storageId is used anywhere else. Deletes the blob and
// throws if it fails server-side validation — the client-side check in
// lib/image-compression.ts is UX only and is trivially bypassable by
// posting directly to the upload URL (Security audit #2).
export const validateUpload = mutation({
  args: { storageId: v.id("_storage"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error("Upload not found");
    }
    const result = validateMetadata(metadata.contentType ?? "", metadata.size);
    if (!result.valid) {
      await ctx.storage.delete(args.storageId);
      throw new Error(result.reason);
    }
    return { success: true };
  },
});

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.storageId);
      return url;
    } catch (error) {
      console.error("Failed to get image URL:", error);
      return null;
    }
  },
});
```

**Scope note:** this task adds `validateUpload` and the `validateUploadMetadata` internal helper it's built on, both fully tested. Wiring every caller of `generateUploadUrl` (e.g. `components/ui/image-uploader.tsx`) to call `validateUpload` after the POST completes is covered in Task 8 (which already touches `image-uploader.tsx` for the object-URL leak fix) — do not modify `image-uploader.tsx` in this task to keep the diff reviewable per-concern.

**Also note:** `generateUploadUrl` currently requires `requireAdmin` (line 11 of the original file) — this plan does not change who can upload; it only adds a validation gate for what they upload. If admin-restricted uploads are not actually the intended access model (e.g. regular users are expected to upload their own avatar/profile images through this same path from `app/dashboard/builder`), that's a pre-existing access-control question outside this audit's file:line findings — do not change it in this task; flag it to the human partner if the implementer notices dashboard (non-admin) callers of `generateUploadUrl` while working.

### Step 6: Run test to verify it passes

Run: `npx vitest run convex/images.test.ts`
Expected: PASS.

### Step 7: Verify build

Run: `npm run build`
Expected: succeeds. `v.id("_storage")` requires the `storageId` argument type change on `validateUpload` — confirm no other caller passes a bare string where `Id<"_storage">` is now expected (this task only adds a new mutation; it does not change `getImageUrl`'s existing `v.string()` arg, so no caller breaks).

### Step 8: Commit

```bash
git add next.config.ts convex/images.ts convex/images.test.ts
git commit -m "fix: add security headers + server-side upload validation (Security #1, #2)"
```

---

## Task 5: Rate limiting + order-confirmation email sanitization (Security #3/#4, Backend #7)

**Files:**

- Create: `convex/rateLimit.ts`
- Modify: `convex/schema.ts` (add `rateLimits` table)
- Modify: `convex/leads.ts` (`createLead`)
- Modify: `convex/cards.ts` (`incrementTapCount`)
- Modify: `convex/checkout.ts` (`createOrder`)
- Modify: `convex/email.ts` (`sendOrderConfirmation`)
- Test: `convex/rateLimit.test.ts`
- Test: `convex/email.test.ts`

**Interfaces:**

- Produces: `checkRateLimit(ctx, key, { max, windowMs })` — a reusable sliding-window limiter backed by the new `rateLimits` table. Throws `Error("Too many requests. Please try again in a moment.")` when exceeded. `sendOrderConfirmation` now HTML-escapes every interpolated string before templating.

### Step 1: Add the `rateLimits` table

In `convex/schema.ts`, add a new table. Insert it right after the `settings` table definition (after line 393, before the `// --- SaaS layer` comment on line 395):

```typescript
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

```

Run `npx convex codegen` after saving so `convex/_generated` picks up the new table before writing tests against it.

### Step 2: Write the failing test for the rate limiter

Create `convex/rateLimit.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { checkRateLimit } from "./rateLimit";

test("checkRateLimit allows calls under the max within the window", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await checkRateLimit(ctx, "test:key-a", { max: 3, windowMs: 60_000 });
    await checkRateLimit(ctx, "test:key-a", { max: 3, windowMs: 60_000 });
    await checkRateLimit(ctx, "test:key-a", { max: 3, windowMs: 60_000 });
  });
});

test("checkRateLimit throws once the max is exceeded within the window", async () => {
  const t = convexTest(schema);
  await expect(
    t.run(async (ctx) => {
      await checkRateLimit(ctx, "test:key-b", { max: 2, windowMs: 60_000 });
      await checkRateLimit(ctx, "test:key-b", { max: 2, windowMs: 60_000 });
      await checkRateLimit(ctx, "test:key-b", { max: 2, windowMs: 60_000 });
    }),
  ).rejects.toThrow(/too many requests/i);
});

test("checkRateLimit uses independent counters per key", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await checkRateLimit(ctx, "test:key-c1", { max: 1, windowMs: 60_000 });
    await checkRateLimit(ctx, "test:key-c2", { max: 1, windowMs: 60_000 });
  });
});
```

### Step 3: Run test to verify it fails

Run: `npx vitest run convex/rateLimit.test.ts`
Expected: FAIL — `convex/rateLimit.ts` does not exist yet.

### Step 4: Implement the rate limiter

Create `convex/rateLimit.ts`:

```typescript
import { MutationCtx } from "./_generated/server";

const DEFAULT_WINDOW_MS = 60_000;

/**
 * Sliding-window rate limiter backed by the `rateLimits` table. Not
 * IP-based (Convex mutations don't receive the caller's IP) — callers pass
 * a resource-scoped key (e.g. `lead:${ownerId}`, `order:${userId}`) so the
 * limit is "how often can this resource be hit," which is what actually
 * matters for the abuse cases this closes (Security #3, Backend #7).
 *
 * Throws if the caller has exceeded `max` calls for `key` within the
 * current window; otherwise records the call and returns.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  opts: { max: number; windowMs?: number },
): Promise<void> {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!existing || existing.windowStart + windowMs < now) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (existing.count >= opts.max) {
    throw new Error("Too many requests. Please try again in a moment.");
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
```

### Step 5: Run test to verify it passes

Run: `npx vitest run convex/rateLimit.test.ts`
Expected: PASS.

### Step 6: Apply the limiter to `createLead`, `incrementTapCount`, `createOrder`

In `convex/leads.ts`, add the import at the top (`import { checkRateLimit } from "./rateLimit";`) and call it as the first line of `createLead`'s handler (before the existing `const owner = await ctx.db.get(args.ownerId);` at line 27):

```typescript
    handler: async (ctx, args) => {
        await checkRateLimit(ctx, `lead:${args.ownerId}`, { max: 5, windowMs: 60_000 });
        const owner = await ctx.db.get(args.ownerId);
```

In `convex/cards.ts`, add the import (`import { checkRateLimit } from "./rateLimit";`) and update `incrementTapCount`'s handler (lines 96-106):

```typescript
export const incrementTapCount = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    await checkRateLimit(ctx, `tap:${args.cardId}`, { max: 20, windowMs: 60_000 });
    const card = await ctx.db.get(args.cardId);
    if (card) {
      await ctx.db.patch(args.cardId, {
        tapCount: card.tapCount + 1,
      });
    }
  },
});
```

In `convex/checkout.ts`, add the import (`import { checkRateLimit } from "./rateLimit";`) and call it inside `createOrder`'s handler, right after `const userId = authedUser?._id;` (line 150), keyed on whichever identity is available:

```typescript
const userId = authedUser?._id;
await checkRateLimit(ctx, `order:${userId ?? args.guestId ?? "anon"}`, {
  max: 5,
  windowMs: 60_000,
});
```

### Step 7: Write a regression test proving the limit fires on `createLead`

Add to a new or existing test near leads — create `convex/leads.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

test("createLead throttles more than 5 leads per owner within a minute", async () => {
  const t = convexTest(schema);
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "recipient@test.dev",
      clerkId: "recipient_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );

  for (let i = 0; i < 5; i++) {
    await t.mutation(api.leads.createLead, {
      ownerId,
      inquirerName: `Visitor ${i}`,
      inquirerContact: `visitor${i}@test.dev`,
    });
  }

  await expect(
    t.mutation(api.leads.createLead, {
      ownerId,
      inquirerName: "Visitor 6",
      inquirerContact: "visitor6@test.dev",
    }),
  ).rejects.toThrow(/too many requests/i);
});
```

### Step 8: Run test to verify it passes

Run: `npx vitest run convex/leads.test.ts`
Expected: PASS.

### Step 9: Write the failing test for email sanitization

Create `convex/email.test.ts`. This tests a pure helper extracted from `sendOrderConfirmation` rather than the `"use node"` action itself (Convex node actions can't run inside `convex-test`'s edge-runtime harness):

```typescript
import { expect, test } from "vitest";
import { escapeHtml } from "./email";

test("escapeHtml neutralizes angle brackets and quotes", () => {
  expect(escapeHtml('<a href="evil">click</a>')).toBe(
    "&lt;a href=&quot;evil&quot;&gt;click&lt;/a&gt;",
  );
});

test("escapeHtml leaves plain text untouched", () => {
  expect(escapeHtml("123 Main St, Manila")).toBe("123 Main St, Manila");
});
```

### Step 10: Run test to verify it fails

Run: `npx vitest run convex/email.test.ts`
Expected: FAIL — `escapeHtml` is not exported from `convex/email.ts` yet.

### Step 11: Implement and apply `escapeHtml`

In `convex/email.ts`, add near the top (after the imports, before `export const sendLeadNotification`):

```typescript
// HTML-escape untrusted strings before interpolating them into an email
// template — Resend does not auto-escape (Security audit #4).
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

Then apply it everywhere `sendOrderConfirmation` interpolates order/shipping data into HTML. Replace the two interpolation sites:

Item rendering (line 104-113), change `item.productName` and `item.variationName`:

```typescript
                                    ${args.items.map(item => `
                                        <tr>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                <strong>${escapeHtml(item.productName)}</strong>
                                                ${item.variationName ? `<br/><span style="color: #666; font-size: 12px;">${escapeHtml(item.variationName)}</span>` : ''}
                                            </td>
                                            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatPrice(item.total, args.currency)}</td>
                                        </tr>
                                    `).join('')}
```

Shipping address rendering (lines 119-124), wrap every field:

```typescript
                            <p style="margin: 5px 0;">${escapeHtml(args.shippingAddress.fullName)}</p>
                            <p style="margin: 5px 0;">${escapeHtml(args.shippingAddress.addressLine1)}</p>
                            ${args.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${escapeHtml(args.shippingAddress.addressLine2)}</p>` : ''}
                            <p style="margin: 5px 0;">${escapeHtml(args.shippingAddress.city)}${args.shippingAddress.state ? ', ' + escapeHtml(args.shippingAddress.state) : ''} ${escapeHtml(args.shippingAddress.postalCode)}</p>
                            <p style="margin: 5px 0;">${escapeHtml(args.shippingAddress.country)}</p>
                            <p style="margin: 5px 0;">${escapeHtml(args.shippingAddress.phone)}</p>
```

### Step 12: Run test to verify it passes

Run: `npx vitest run convex/email.test.ts`
Expected: PASS.

### Step 13: Verify build

Run: `npm run build && npm test`
Expected: both succeed.

### Step 14: Commit

```bash
git add convex/rateLimit.ts convex/rateLimit.test.ts convex/schema.ts convex/leads.ts convex/leads.test.ts convex/cards.ts convex/checkout.ts convex/email.ts convex/email.test.ts
git commit -m "fix: rate-limit public mutations, sanitize order-confirmation email (Security #3/#4, Backend #7)"
```

---

## Task 6: Cart authorization fix + missing indexes (Payments #5 Medium, Backend #5/#6 Medium)

**Files:**

- Modify: `convex/schema.ts` (add indexes on `orders`, `subscriptionInvoices`, `users`)
- Modify: `convex/shop.ts:155-493` (`getCart`, `addToCart`, `updateCartItem`, `removeFromCart`, `clearCart`)
- Modify: `convex/checkout.ts:360-365` (query by index instead of filter)
- Modify: `convex/billing.ts:302-307` (query by index instead of filter)
- Test: `convex/shop.test.ts` (append)

**Interfaces:**

- Produces: every cart mutation that receives `clerkId` now verifies it against `ctx.auth` (same pattern `mergeGuestCart` already uses) before resolving `userId` — a caller can no longer pass an arbitrary victim's `clerkId` to read or mutate their cart. `orders.paymentIntentId` and `subscriptionInvoices.paymentIntentId` are now indexed; the two webhook-fallback lookups use `withIndex` instead of `.filter()`.

### Step 1: Write the failing test for cart authorization

Append to `convex/shop.test.ts`:

```typescript
test("getCart rejects a clerkId that does not match the authenticated caller", async () => {
  const t = convexTest(schema);
  const victimClerkId = "victim_clerk_id";
  await t.run(async (ctx) => {
    const victimId = await ctx.db.insert("users", {
      email: "victim@test.dev",
      clerkId: victimClerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    await ctx.db.insert("carts", {
      userId: victimId,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  const asAttacker = t.withIdentity({ subject: "attacker_clerk_id" });

  await expect(asAttacker.query(api.shop.getCart, { clerkId: victimClerkId })).rejects.toThrow(
    /unauthorized/i,
  );
});

test("addToCart rejects a clerkId that does not match the authenticated caller", async () => {
  const t = convexTest(schema);
  const victimClerkId = "victim_clerk_id";
  const productId = await seedProduct(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "victim@test.dev",
      clerkId: victimClerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  const asAttacker = t.withIdentity({ subject: "attacker_clerk_id" });

  await expect(
    asAttacker.mutation(api.shop.addToCart, {
      clerkId: victimClerkId,
      productId,
      quantity: 1,
    }),
  ).rejects.toThrow(/unauthorized/i);
});

test("addToCart still works for a guest with no clerkId", async () => {
  const t = convexTest(schema);
  const productId = await seedProduct(t);

  const result = await t.mutation(api.shop.addToCart, {
    guestId: "guest-xyz",
    productId,
    quantity: 1,
  });

  expect(result.success).toBe(true);
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run convex/shop.test.ts`
Expected: FAIL — the two authorization tests fail because `getCart`/`addToCart` currently trust `clerkId` unconditionally.

### Step 3: Fix the five cart functions

In `convex/shop.ts`, add the import at the top: `import { requireUserMatching } from "./authz";`.

Each of `getCart`, `addToCart`, `updateCartItem`, `removeFromCart`, `clearCart` currently starts its userId resolution with the same pattern:

```typescript
let userId;
if (args.clerkId) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
    .first();
  userId = user?._id;
}
```

Replace **every one of the five occurrences** (in `getCart` line ~163-171, `addToCart` line ~228-235, `updateCartItem` line ~339-346, `removeFromCart` line ~411-418, `clearCart` line ~460-467) with:

```typescript
let userId;
if (args.clerkId) {
  const user = await requireUserMatching(ctx, args.clerkId);
  userId = user._id;
}
```

This is a mechanical, identical replacement in all five places — `requireUserMatching` already throws `"Unauthorized: identity mismatch"` when the claimed `clerkId` doesn't match `ctx.auth`, and throws `"Unauthorized: authentication required"` if there's no session at all, which correctly still allows the guest path (`args.clerkId` is `undefined` for guest calls, so the `if (args.clerkId)` branch is skipped entirely and `userId` stays `undefined`, falling through to the existing `args.guestId` branch below it — unchanged in this task).

### Step 4: Run test to verify it passes

Run: `npx vitest run convex/shop.test.ts`
Expected: PASS — all tests in the file green.

### Step 5: Add the missing indexes

In `convex/schema.ts`:

Change the `orders` table's index chain (lines 367-371) from:

```typescript
  }).index("by_orderNumber", ["orderNumber"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_paymentStatus", ["paymentStatus"])
    .index("by_createdAt", ["createdAt"]),
```

to:

```typescript
  }).index("by_orderNumber", ["orderNumber"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_paymentStatus", ["paymentStatus"])
    .index("by_createdAt", ["createdAt"])
    .index("by_paymentIntentId", ["paymentIntentId"]),
```

Change the `subscriptionInvoices` table's index chain (lines 435-437) from:

```typescript
  }).index("by_user", ["userId"])
    .index("by_checkoutId", ["payrexCheckoutId"])
    .index("by_status", ["status"]),
```

to:

```typescript
  }).index("by_user", ["userId"])
    .index("by_checkoutId", ["payrexCheckoutId"])
    .index("by_status", ["status"])
    .index("by_paymentIntentId", ["paymentIntentId"]),
```

Change the `users` table's index chain (line 28) from:

```typescript
  }).index("by_clerkId", ["clerkId"]),
```

to:

```typescript
  }).index("by_clerkId", ["clerkId"])
    .index("by_teamId", ["teamId"]),
```

Run `npx convex codegen` after saving.

### Step 6: Use the new indexes at the two fallback lookup sites

In `convex/checkout.ts`, `internalConfirmOrderPayment` (lines 360-365), replace:

```typescript
if (!order && args.paymentIntentId) {
  order = await ctx.db
    .query("orders")
    .filter((q) => q.eq(q.field("paymentIntentId"), args.paymentIntentId))
    .first();
}
```

with:

```typescript
if (!order && args.paymentIntentId) {
  order = await ctx.db
    .query("orders")
    .withIndex("by_paymentIntentId", (q) => q.eq("paymentIntentId", args.paymentIntentId))
    .first();
}
```

In `convex/billing.ts`, `internalActivateInvoice` (lines 302-307), replace:

```typescript
if (!invoice && args.paymentIntentId) {
  invoice = await ctx.db
    .query("subscriptionInvoices")
    .filter((q) => q.eq(q.field("paymentIntentId"), args.paymentIntentId))
    .first();
}
```

with:

```typescript
if (!invoice && args.paymentIntentId) {
  invoice = await ctx.db
    .query("subscriptionInvoices")
    .withIndex("by_paymentIntentId", (q) => q.eq("paymentIntentId", args.paymentIntentId))
    .first();
}
```

**Note:** `convex/teams.ts`'s full-table `users` scans (Backend #6) are not touched in this task — adding the `by_teamId` index here is a prerequisite, but rewriting `teams.ts`'s query call sites to use it is deferred to the architecture follow-up (see the end of this plan) since it touches team-membership logic this plan hasn't otherwise scoped.

### Step 7: Run the full suite and build

Run: `npm test && npm run build`
Expected: both succeed. The existing `checkout.test.ts` and `billing.test.ts` tests from Tasks 1-3 continue to pass unchanged — they query by the fields they set, so switching `.filter()` to `.withIndex()` at these two sites is behavior-preserving.

### Step 8: Commit

```bash
git add convex/schema.ts convex/shop.ts convex/shop.test.ts convex/checkout.ts convex/billing.ts
git commit -m "fix: verify clerkId against ctx.auth in cart mutations, index paymentIntentId/teamId lookups (Payments #5, Backend #5/#6)"
```

---

## Task 7: Builder — stop leaking hidden-block data, wire section order through to public templates (Frontend #1 Critical)

**Files:**

- Modify: `app/dashboard/builder/page.tsx` (`handleSave`, around line 639-712)
- Modify: `types/profile.ts` (`ProfileData`)
- Modify: `app/p/[id]/page.tsx` (`PublicProfileContent`)
- Modify: `components/templates/Editorial.tsx`, `components/templates/Kinetic.tsx`, `components/templates/Architectural.tsx`
- Test: `lib/profileSections.test.ts`
- Test: `types/profile.ts` gains a new pure helper this task also tests

**Interfaces:**

- Produces: `ProfileData.componentOrder: string[]` — the list of enabled section ids in display order, already computed today by `handleSave` (line 702) and stored in `layoutConfig.componentOrder`, now actually read on the public page. A new pure helper `filterAgentInfoByEnabledBlocks(agentInfo, enabledBlockIds)` in `lib/profileSections.ts` strips optional section data (`certification`, `education`, `techStack`, `experience`, `testimonials`, `gallery`) that belongs to a disabled block before it's ever saved.

This is the one task in this plan where the exact JSX inside `Editorial.tsx` / `Kinetic.tsx` / `Architectural.tsx` isn't reproduced here — those files are large (several hundred lines each) and each already contains the section markup; the fix reorders/gates existing markup, it does not invent new markup. Read each file's current section-rendering block (the audit located them at `Editorial.tsx:56-69`, `Kinetic.tsx:58-74`, and the equivalent block in `Architectural.tsx`) before editing.

### Step 1: Write the failing test for the pure data-gating helper

Create `lib/profileSections.test.ts`:

```typescript
import { expect, test } from "vitest";
import { filterAgentInfoByEnabledBlocks } from "./profileSections";
import { ProfileInfo } from "@/types/profile";

const baseAgentInfo: ProfileInfo = {
  fullName: "Jane Doe",
  title: "Designer",
  company: "Acme",
  phone: "0917",
  email: "jane@acme.test",
  services: [],
  socialLinks: [],
  certification: { title: "Certified Thing", description: "..." },
  education: [{ degree: "BFA", school: "State U" }],
  gallery: ["img1", "img2"],
};

test("strips education when the Education block is disabled", () => {
  const result = filterAgentInfoByEnabledBlocks(baseAgentInfo, ["Hero", "About", "Contact"]);
  expect(result.education).toBeUndefined();
});

test("keeps education when the Education block is enabled", () => {
  const result = filterAgentInfoByEnabledBlocks(baseAgentInfo, ["Hero", "Education", "Contact"]);
  expect(result.education).toEqual(baseAgentInfo.education);
});

test("strips gallery, certification when their blocks are disabled but keeps required fields", () => {
  const result = filterAgentInfoByEnabledBlocks(baseAgentInfo, ["Hero", "Contact"]);
  expect(result.gallery).toBeUndefined();
  expect(result.certification).toBeUndefined();
  expect(result.fullName).toBe("Jane Doe");
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run lib/profileSections.test.ts`
Expected: FAIL — `lib/profileSections.ts` does not exist yet.

### Step 3: Implement the pure helper

Create `lib/profileSections.ts`:

```typescript
import { ProfileInfo } from "@/types/profile";

// Maps a builder block id to the ProfileInfo field(s) it owns. Blocks not
// listed here (Hero, About, Projects, Products, Properties, Contact) either
// have no optional agentInfo field of their own or are always required.
const BLOCK_TO_AGENT_FIELDS: Record<string, (keyof ProfileInfo)[]> = {
  Certification: ["certification"],
  Education: ["education"],
  TechStack: ["techStack"],
  Services: ["services"],
  Experience: ["experience"],
  Testimonials: ["testimonials"],
  Gallery: ["gallery"],
};

/**
 * Strips optional ProfileInfo fields whose owning block is disabled, so a
 * block the user toggled off never gets saved (and therefore never
 * rendered) even if its underlying data is still filled in the form
 * (Frontend audit #1 — "hidden" blocks currently still render because their
 * data is saved regardless of isEnabled).
 */
export function filterAgentInfoByEnabledBlocks(
  agentInfo: ProfileInfo,
  enabledBlockIds: string[],
): ProfileInfo {
  const enabled = new Set(enabledBlockIds);
  const result: ProfileInfo = { ...agentInfo };
  for (const [blockId, fields] of Object.entries(BLOCK_TO_AGENT_FIELDS)) {
    if (!enabled.has(blockId)) {
      for (const field of fields) {
        delete (result as Record<string, unknown>)[field];
      }
    }
  }
  return result;
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run lib/profileSections.test.ts`
Expected: PASS.

### Step 5: Wire the helper into `handleSave`

In `app/dashboard/builder/page.tsx`, import it at the top: `import { filterAgentInfoByEnabledBlocks } from "@/lib/profileSections";`.

In `handleSave` (starting line 635), the `cleanAgentInfo` object (lines 639-659) is built directly from `agentInfo` state, then used at line 692 (`agentInfo: cleanAgentInfo,`). After building `cleanAgentInfo` (after line 659's closing `};`) and before it's used, compute the enabled block ids the same way `componentOrder` already does at line 702, and pass `cleanAgentInfo` through the filter:

```typescript
const enabledBlockIds = getBlocksForProfileType(profileType, blocks)
  .filter((b) => b.isEnabled)
  .map((b) => b.id);
const filteredAgentInfo = filterAgentInfoByEnabledBlocks(cleanAgentInfo, enabledBlockIds);
```

Then change the `createProfile` call (line 692) from `agentInfo: cleanAgentInfo,` to `agentInfo: filteredAgentInfo,`.

### Step 6: Add `componentOrder` to `ProfileData` and populate it

In `types/profile.ts`, add the field to the `ProfileData` interface (after line 178's `inlineProjects?: InlineProject[];`):

```typescript
    componentOrder?: string[];
```

In `app/p/[id]/page.tsx`, the `data: ProfileData` object built at lines 62-81 currently has no `componentOrder` field. Add it:

```typescript
const data: ProfileData = {
  ownerId: profile.ownerId,
  name: profile.name,
  profileType: (profile.profileType || "individual") as ProfileType,
  agent: agentInfo,
  properties: [],
  projects: [],
  products: profile.products,
  services: profile.services,
  propertyListings: (profile as any).propertyListings,
  inlineProjects: (profile as any).inlineProjects,
  componentOrder: layoutConfig.componentOrder,
  theme: {
    primaryColor: profile.teamBranding?.accentColor || layoutConfig.colorPalette.primary,
    backgroundColor: layoutConfig.colorPalette.background,
    textColor: layoutConfig.colorPalette.text,
    secondaryColor: (layoutConfig.colorPalette as any).secondary,
    accentColor: profile.teamBranding?.accentColor || (layoutConfig.colorPalette as any).accent,
  },
  digitalCard: (profile as any).digitalCard,
};
```

(Only the new `componentOrder: layoutConfig.componentOrder,` line is added; everything else in this object is unchanged.)

### Step 7: Make each template respect `componentOrder`

This step is exploratory within its own file — read the current section-rendering JSX in each template before changing it. The required end state for each of `components/templates/Editorial.tsx`, `Kinetic.tsx`, `Architectural.tsx`:

1. Identify the top-level sequence of section blocks the template currently renders unconditionally-by-data-presence (e.g. `{data.agent.education && <EducationSection .../>}`, repeated per section).
2. Extract each into a `sectionId -> () => JSX.Element | null` map local to the file, e.g.:

```typescript
const sectionRenderers: Record<string, () => React.ReactNode> = {
  Hero: () => <HeroSection .../>,
  About: () => data.agent.about ? <AboutSection .../> : null,
  Certification: () => data.agent.certification ? <CertificationSection .../> : null,
  Education: () => data.agent.education?.length ? <EducationSection .../> : null,
  // ...one entry per section id already present in the file, same JSX as before
};
```

3. Replace the fixed JSX sequence with an order-driven render:

```typescript
const order = data.componentOrder?.length
  ? data.componentOrder
  : Object.keys(sectionRenderers); // legacy profiles with no stored order: fall back to today's hardcoded order
{order.map((id) => (
  <React.Fragment key={id}>{sectionRenderers[id]?.()}</React.Fragment>
))}
```

The exact variable names inside each section renderer (props, local variables referencing `data.agent.X`) must match what the current hardcoded block already uses — this is a refactor of existing rendering, not new logic. Do not change what each section renders, only where it renders relative to the others and whether it renders at all (an id absent from `data.componentOrder` is simply not in the `order` array, so it's skipped — this is what makes "hide" actually hide it on top of Step 5's data-stripping).

### Step 8: Verify manually

Run: `npm run dev`. In the builder, create/edit a profile: drag "Projects" above "About," toggle "Education" off, Save. Open the resulting public profile URL and confirm Projects now renders above About, and Education does not render. Then re-open the builder for the same profile and confirm the block order and toggle states loaded correctly reflect what was saved (this exercises the existing prefill logic at builder `page.tsx:518-536`, unchanged by this task). Stop the dev server when done.

### Step 9: Run the full suite and build

Run: `npm test && npm run build`
Expected: both succeed.

### Step 10: Commit

```bash
git add app/dashboard/builder/page.tsx types/profile.ts app/p/[id]/page.tsx lib/profileSections.ts lib/profileSections.test.ts components/templates/Editorial.tsx components/templates/Kinetic.tsx components/templates/Architectural.tsx
git commit -m "fix: builder reorder and hide/show now affect the published profile (Frontend #1)"
```

---

## Task 8: Image pipeline fixes (Frontend #2 High, #3/#4/#5/#6 Medium)

**Files:**

- Modify: `lib/image-compression.ts`
- Modify: `components/ui/image-uploader.tsx`
- Modify: `components/profile-builder/AccessCard.tsx`
- Test: `lib/image-compression.test.ts`

**Interfaces:**

- Produces: `compressImage` preserves aspect ratio when clamping to `minWidthOrHeight`. `loadImage` revokes its object URL on both success and failure. `ImageUploader` revokes its preview object URL on unmount. `AccessCard`'s QR value is computed client-side only (no SSR/CSR mismatch) and its avatar renders through `ProfileImage` so Convex storage ids resolve correctly.

### Step 1: Write the failing test for aspect-ratio preservation

Create `lib/image-compression.test.ts`. `compressImage` uses `document.createElement('canvas')`/`Image`/`URL.createObjectURL`, all DOM APIs — this test needs the `jsdom` environment. Name the file so it matches `environmentMatchGlobs` in `vitest.config.ts` from Task 0 (`**/*.test.tsx` gets jsdom; this is `.ts`, so instead add an explicit per-file environment override):

```typescript
// @vitest-environment jsdom
import { expect, test, vi, beforeEach } from "vitest";

// jsdom doesn't implement canvas or Image decoding — mock just enough of
// the DOM surface compressImage touches to exercise the dimension math in
// isolation, independent of real image decoding.
class FakeImage {
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });
});

test("clamping to minWidthOrHeight preserves aspect ratio instead of stretching", async () => {
  const { compressImage } = await import("./image-compression");

  // Simulate a 4000x500 banner (8:1) needing to scale down to fit
  // maxWidthOrHeight=1920, then re-clamped so neither dimension drops below
  // minWidthOrHeight=800. Pre-fix: width/height are clamped independently,
  // producing 1920x800 (a 2.4:1 image squeezed from an 8:1 source). Post-fix
  // the SAME clamp must be applied uniformly to preserve the 8:1 ratio.
  const img = new FakeImage();
  img.width = 4000;
  img.height = 500;
  vi.spyOn(globalThis, "Image").mockImplementation(() => img as unknown as HTMLImageElement);

  // canvas + toBlob are also not implemented in jsdom — stub the minimum.
  const fakeCtx = {
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    drawImage: vi.fn(),
  };
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => fakeCtx,
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x".repeat(100)])),
  };
  vi.spyOn(document, "createElement").mockReturnValue(fakeCanvas as unknown as HTMLCanvasElement);

  const file = new File(["x".repeat(2 * 1024 * 1024)], "banner.jpg", { type: "image/jpeg" });
  const result = await compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    minWidthOrHeight: 800,
  });

  const ratio = result.width / result.height;
  expect(ratio).toBeCloseTo(4000 / 500, 1); // 8:1, not stretched toward 2.4:1
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run lib/image-compression.test.ts`
Expected: FAIL — current code clamps `width`/`height` independently (`width = Math.max(width, minWidthOrHeight); height = Math.max(height, minWidthOrHeight);`), producing a ratio near `2.4:1`, not `8:1`.

### Step 3: Fix the aspect-ratio clamp

In `lib/image-compression.ts`, replace lines 67-75:

```typescript
if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
  const scale = maxWidthOrHeight / Math.max(width, height);
  width = Math.round(width * scale);
  height = Math.round(height * scale);
}

// Ensure we don't go below minimum dimensions
width = Math.max(width, minWidthOrHeight);
height = Math.max(height, minWidthOrHeight);
```

with:

```typescript
if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
  const scale = maxWidthOrHeight / Math.max(width, height);
  width = Math.round(width * scale);
  height = Math.round(height * scale);
}

// Ensure we don't go below minimum dimensions WITHOUT distorting the
// aspect ratio: scale both dimensions by whichever axis needs the bigger
// boost to clear minWidthOrHeight, not each axis independently.
if (width < minWidthOrHeight || height < minWidthOrHeight) {
  const upscale = Math.max(minWidthOrHeight / width, minWidthOrHeight / height);
  width = Math.round(width * upscale);
  height = Math.round(height * upscale);
}
```

Apply the identical fix to the second occurrence of the same pattern inside the compression retry loop (originally lines 108-116):

```typescript
const scale = 0.8;
width = Math.round(width * scale);
height = Math.round(height * scale);

// Ensure minimum dimensions
width = Math.max(width, minWidthOrHeight);
height = Math.max(height, minWidthOrHeight);
```

becomes:

```typescript
const scale = 0.8;
width = Math.round(width * scale);
height = Math.round(height * scale);

// Same ratio-preserving clamp as the initial resize above.
if (width < minWidthOrHeight || height < minWidthOrHeight) {
  const upscale = Math.max(minWidthOrHeight / width, minWidthOrHeight / height);
  width = Math.round(width * upscale);
  height = Math.round(height * upscale);
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run lib/image-compression.test.ts`
Expected: PASS.

### Step 5: Fix the `loadImage` object-URL leak

In `lib/image-compression.ts`, replace the `loadImage` function (lines 156-163):

```typescript
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

with:

```typescript
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}
```

No new test for this step — it's covered by inspection in task review since jsdom's `URL.revokeObjectURL` is a no-op mock and asserting it was _called_ would just test the mock, not real leak behavior; the existing aspect-ratio test above already exercises this code path without erroring.

### Step 6: Fix the `ImageUploader` unmount leak

In `components/ui/image-uploader.tsx`, the `useEffect` import is already present (line 3: `import { useState, useRef, useEffect } from "react";`) but unused — this confirms a cleanup effect was intended. Add it right after the existing state declarations (after line 26's `const generateUploadUrl = useMutation(api.images.generateUploadUrl);`):

```typescript
useEffect(() => {
  return () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
  };
}, [localPreviewUrl]);
```

### Step 7: Fix `AccessCard`'s hydration mismatch and broken avatar

In `components/profile-builder/AccessCard.tsx`, add `useState`/`useEffect` to the import (line 1-6 currently has no React hook import beyond the component itself being a function — add `import { useEffect, useState } from "react";` as a new import line after the `"use client";` directive), and add `ProfileImage` to the imports:

```typescript
"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ProfileInfo } from "@/types/profile";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { ProfileImage } from "@/components/templates/ProfileImage";
```

Replace the render-time `window` read (lines 15-17):

```typescript
const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${profileId}` : "";
```

with a mount-gated version that matches the pattern already used correctly in `components/ui/digital-business-card.tsx`:

```typescript
const [profileUrl, setProfileUrl] = useState("");
useEffect(() => {
  setProfileUrl(`${window.location.origin}/p/${profileId}`);
}, [profileId]);
```

Replace the raw `<img>` avatar rendering (lines 67-81):

```typescript
                {/* Profile Pic moved to bottom right */}
                <div className="flex-shrink-0">
                    {agent.avatarUrl ? (
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 bg-zinc-900 shadow-xl">
                            <img
                                src={agent.avatarUrl}
                                alt={agent.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/10">
                            <User className="w-8 h-8 text-zinc-500" />
                        </div>
                    )}
                </div>
```

with:

```typescript
                {/* Profile Pic moved to bottom right */}
                <div className="flex-shrink-0">
                    {agent.avatarUrl ? (
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 bg-zinc-900 shadow-xl">
                            <ProfileImage
                                src={agent.avatarUrl}
                                alt={agent.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/10">
                            <User className="w-8 h-8 text-zinc-500" />
                        </div>
                    )}
                </div>
```

Note the QR code's `value={profileUrl}` prop (line 39) needs no change — it already reads the `profileUrl` variable, which is now state instead of a render-time computed value, so on first client render it will briefly be `""` before the `useEffect` fires (matching SSR output, then updating) instead of mismatching SSR.

### Step 8: Run the full suite and build

Run: `npm test && npm run build`
Expected: both succeed.

### Step 9: Verify manually

Run: `npm run dev`. Open a dashboard profile with an avatar uploaded via `ImageUploader` (a Convex storage id, not an http URL) and view its Access Card — confirm the avatar now renders instead of showing a broken image. Upload a wide banner-shaped image (or resize a test image to roughly 4000×500) through any `ImageUploader` in the builder and confirm it doesn't appear vertically stretched after upload. Stop the dev server when done.

### Step 10: Commit

```bash
git add lib/image-compression.ts lib/image-compression.test.ts components/ui/image-uploader.tsx components/profile-builder/AccessCard.tsx
git commit -m "fix: preserve aspect ratio in compression, fix object-URL leaks, fix AccessCard hydration + avatar (Frontend #2-6)"
```

---

## Task 9: Builder unsaved-changes guard (Frontend #7 Low)

**Files:**

- Modify: `app/dashboard/builder/page.tsx`
- Test: `lib/hasUnsavedChanges.test.ts` (pure logic only; the `beforeunload`/route-intercept wiring is verified manually, browser navigation APIs aren't unit-testable)

**Interfaces:**

- Produces: a `window.confirm`-gated intercept on the back button (line 839-844) and a `beforeunload` listener, both driven by a single `isDirty` boolean the implementer derives from comparing current form state against the last-saved/last-loaded snapshot.

### Step 1: Write the failing test for the pure dirty-check helper

Create `lib/hasUnsavedChanges.test.ts`:

```typescript
import { expect, test } from "vitest";
import { hasUnsavedChanges } from "./hasUnsavedChanges";

test("returns false when snapshots are identical", () => {
  const snap = { fullName: "Jane", title: "Designer" };
  expect(hasUnsavedChanges(snap, { ...snap })).toBe(false);
});

test("returns true when a field changed", () => {
  const original = { fullName: "Jane", title: "Designer" };
  const current = { fullName: "Jane", title: "Senior Designer" };
  expect(hasUnsavedChanges(original, current)).toBe(true);
});

test("returns true when a field was added", () => {
  const original = { fullName: "Jane" };
  const current = { fullName: "Jane", title: "Designer" };
  expect(hasUnsavedChanges(original, current)).toBe(true);
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run lib/hasUnsavedChanges.test.ts`
Expected: FAIL — `lib/hasUnsavedChanges.ts` does not exist yet.

### Step 3: Implement the helper

Create `lib/hasUnsavedChanges.ts`:

```typescript
/**
 * Deep-equality dirty check via JSON serialization. Good enough for the
 * builder's plain-object/array form state (no functions, no Dates) — avoids
 * pulling in a deep-equal dependency for one call site.
 */
export function hasUnsavedChanges<T>(original: T, current: T): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run lib/hasUnsavedChanges.test.ts`
Expected: PASS.

### Step 5: Wire it into the builder page

In `app/dashboard/builder/page.tsx`, import the helper (`import { hasUnsavedChanges } from "@/lib/hasUnsavedChanges";`) and `useCallback` if not already imported from React (check the existing `import { useState, useEffect, useRef, Suspense } from "react";` at line 3 — add `useCallback`).

Add a snapshot ref right after the `hasPrefilled` state declaration (after line 466's `const [hasPrefilled, setHasPrefilled] = useState(false);`):

```typescript
const savedSnapshotRef = useRef<string | null>(null);
```

At the end of the prefill `useEffect` (right before `setHasPrefilled(true);` in both branches, lines 537 and 555), capture the baseline snapshot once prefill completes. Since the snapshot needs to reflect the full editable state (agentInfo, blocks, colors, digitalCard, etc.) and this task must not restructure that state into one object, take the snapshot from the same fields `handleSave` already serializes — call it right after both `setHasPrefilled(true);` lines by extracting a small helper used in both places:

```typescript
const captureSnapshot = useCallback(() => {
  savedSnapshotRef.current = JSON.stringify({
    agentInfo,
    additionalPhones,
    additionalEmails,
    digitalCard,
    blocks,
    selectedTemplate,
    customColors,
    certification,
    education,
    techStack,
    experience,
    testimonials,
    gallery,
    products,
    propertyListings,
    inlineProjects,
  });
}, [
  agentInfo,
  additionalPhones,
  additionalEmails,
  digitalCard,
  blocks,
  selectedTemplate,
  customColors,
  certification,
  education,
  techStack,
  experience,
  testimonials,
  gallery,
  products,
  propertyListings,
  inlineProjects,
]);
```

Place this `useCallback` definition after all the referenced state declarations (i.e., after line 425, before the `handleCardThemeChange` function at line 427).

Call `captureSnapshot()` in place of both `setHasPrefilled(true);` lines' neighbors — change:

```typescript
setHasPrefilled(true);
```

(both occurrences, lines 537 and 555) to:

```typescript
setHasPrefilled(true);
captureSnapshot();
```

And call it again at the end of a successful save — in `handleSave`, right after `router.push(\`/p/${profileId}\`);`(line 713), add`captureSnapshot();`before the`router.push` call so a save immediately clears dirty state even if the router push is slow:

```typescript
captureSnapshot();
router.push(`/p/${profileId}`);
```

Add the dirty check and both guards right after the `captureSnapshot` `useCallback` definition:

```typescript
const isDirty = useCallback(() => {
  if (savedSnapshotRef.current === null) return false;
  const current = JSON.stringify({
    agentInfo,
    additionalPhones,
    additionalEmails,
    digitalCard,
    blocks,
    selectedTemplate,
    customColors,
    certification,
    education,
    techStack,
    experience,
    testimonials,
    gallery,
    products,
    propertyListings,
    inlineProjects,
  });
  return hasUnsavedChanges(savedSnapshotRef.current, current);
}, [
  agentInfo,
  additionalPhones,
  additionalEmails,
  digitalCard,
  blocks,
  selectedTemplate,
  customColors,
  certification,
  education,
  techStack,
  experience,
  testimonials,
  gallery,
  products,
  propertyListings,
  inlineProjects,
]);

useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty()) {
      e.preventDefault();
    }
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [isDirty]);
```

Finally, change the back button's `onClick` (line 840, `onClick={() => router.back()}`) to:

```typescript
                        onClick={() => {
                            if (isDirty() && !window.confirm("You have unsaved changes. Leave without saving?")) {
                                return;
                            }
                            router.back();
                        }}
```

### Step 6: Run the full suite and build

Run: `npm test && npm run build`
Expected: both succeed.

### Step 7: Verify manually

Run: `npm run dev`. Open the builder, edit a field, click the back chevron — confirm a browser confirm dialog appears. Cancel it, confirm you stay on the page. Click back again and accept — confirm you navigate away. Reload the page, make an edit, and try closing the tab — confirm the browser's native "leave site?" prompt appears (exact wording is browser-controlled, not customizable). Stop the dev server when done.

### Step 8: Commit

```bash
git add app/dashboard/builder/page.tsx lib/hasUnsavedChanges.ts lib/hasUnsavedChanges.test.ts
git commit -m "fix: warn on unsaved changes before leaving the profile builder (Frontend #7)"
```

---

## Task 10: Public profile image performance (UI/UX P0)

**Files:**

- Modify: `convex/profiles.ts` (`getProfile`)
- Modify: `components/templates/ProfileImage.tsx`
- Test: `convex/profiles.test.ts`

**Interfaces:**

- Produces: `getProfile` now resolves every storage-id image referenced in the profile (avatar + gallery) to a real URL server-side, in one query, exposed as a new `resolvedImages: Record<string, string>` map alongside the existing profile fields. `ProfileImage` consults this map first (no client-side `useQuery` round-trip per image) and falls back to its current per-image query only for images not present in the map (e.g. a src passed from a context that doesn't have `resolvedImages`, keeping the component backward-compatible). It renders via `next/image` instead of a raw `<img>`.

### Step 1: Write the failing test for server-side batch resolution

Create `convex/profiles.test.ts`:

```typescript
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

test("getProfile resolves storage-id avatar and gallery images into resolvedImages", async () => {
  const t = convexTest(schema);
  const { profileId, storageId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner@test.dev",
      clerkId: "owner_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    const blob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const storageId = await ctx.storage.store(blob);
    const profileId = await ctx.db.insert("profiles", {
      ownerId,
      name: "Test Profile",
      agentInfo: {
        fullName: "Jane Doe",
        title: "Designer",
        company: "Acme",
        phone: "0917",
        email: "jane@acme.test",
        avatarUrl: storageId,
        services: [],
        socialLinks: [],
        gallery: [storageId],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#000", background: "#fff", text: "#000" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
    return { profileId, storageId };
  });

  const profile = await t.query(api.profiles.getProfile, { profileId });

  expect(profile?.resolvedImages).toBeDefined();
  expect(profile?.resolvedImages?.[storageId]).toMatch(/^https?:\/\//);
});

test("getProfile leaves http/data/blob URLs out of resolvedImages (nothing to resolve)", async () => {
  const t = convexTest(schema);
  const profileId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner2@test.dev",
      clerkId: "owner2_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Test Profile 2",
      agentInfo: {
        fullName: "Jane Doe",
        title: "Designer",
        company: "Acme",
        phone: "0917",
        email: "jane@acme.test",
        avatarUrl: "https://example.com/avatar.jpg",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#000", background: "#fff", text: "#000" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  });

  const profile = await t.query(api.profiles.getProfile, { profileId });

  expect(Object.keys(profile?.resolvedImages ?? {}).length).toBe(0);
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run convex/profiles.test.ts`
Expected: FAIL — `getProfile` does not return `resolvedImages` yet.

### Step 3: Implement batch resolution in `getProfile`

In `convex/profiles.ts`, replace the `getProfile` handler (lines 181-216):

```typescript
export const getProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return null;

    // Compute the owner's effective plan server-side and expose ONLY a
    // cosmetic boolean (showBranding) plus optional team branding — never
    // leak the owner's plan/expiry internals to the public.
    const owner = await ctx.db.get(profile.ownerId);
    let showBranding = true;
    let teamBranding: {
      companyName?: string;
      logoUrl?: string;
      accentColor?: string;
    } | null = null;

    if (owner) {
      const { plan, limits } = planContext(owner);
      showBranding = limits.showBranding;
      // Business members inherit shared team branding on their profile.
      if (plan === "business" && owner.teamId) {
        const team = await ctx.db.get(owner.teamId);
        if (team) {
          teamBranding = {
            companyName: team.companyName,
            logoUrl: team.logoUrl,
            accentColor: team.accentColor,
          };
        }
      }
    }

    // Batch-resolve every Convex-storage-id image referenced by this
    // profile in one pass, instead of leaving each <ProfileImage> to fire
    // its own useQuery round-trip on the client (UI/UX audit P0 — this
    // was the single biggest contributor to slow first paint on the
    // public profile page).
    const candidateIds = [profile.agentInfo.avatarUrl, ...(profile.agentInfo.gallery ?? [])].filter(
      (id): id is string => {
        if (!id) return false;
        return !id.startsWith("http") && !id.startsWith("data:") && !id.startsWith("blob:");
      },
    );
    const uniqueIds = Array.from(new Set(candidateIds));
    const resolvedEntries = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const url = await ctx.storage.getUrl(id);
          return url ? ([id, url] as const) : null;
        } catch {
          return null;
        }
      }),
    );
    const resolvedImages: Record<string, string> = {};
    for (const entry of resolvedEntries) {
      if (entry) resolvedImages[entry[0]] = entry[1];
    }

    return { ...profile, showBranding, teamBranding, resolvedImages };
  },
});
```

### Step 4: Run test to verify it passes

Run: `npx vitest run convex/profiles.test.ts`
Expected: PASS.

### Step 5: Consume `resolvedImages` in `ProfileImage` and migrate to `next/image`

Replace `components/templates/ProfileImage.tsx` entirely:

```typescript
"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { resolveImageUrl } from "@/lib/utils";

interface ProfileImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackSeed?: string;
    resolvedImages?: Record<string, string>;
    fill?: boolean;
    width?: number;
    height?: number;
}

export function ProfileImage({
    src,
    alt,
    className = "",
    fallbackSeed,
    resolvedImages,
    fill = true,
    width,
    height,
}: ProfileImageProps) {
    const isDirectUrl = src?.startsWith("http") || src?.startsWith("data:") || src?.startsWith("blob:");
    const batchResolved = src && !isDirectUrl ? resolvedImages?.[src] : undefined;

    // Only fall back to a per-image query when the caller didn't supply a
    // resolvedImages map (e.g. a src reached outside of profiles.getProfile's
    // response) — the common path (public profile pages) never hits this.
    const storageUrl = useQuery(
        api.images.getImageUrl,
        src && !isDirectUrl && !batchResolved && !resolvedImages ? { storageId: src } : "skip"
    );

    let imageUrl = "";
    if (isDirectUrl) {
        imageUrl = src as string;
    } else if (batchResolved) {
        imageUrl = batchResolved;
    } else if (storageUrl) {
        imageUrl = storageUrl;
    } else if (src) {
        imageUrl = resolveImageUrl(src);
    }

    const finalUrl = imageUrl || (fallbackSeed
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fallbackSeed)}`
        : "");

    if (!finalUrl) {
        return (
            <div className={`bg-muted flex items-center justify-center ${className}`}>
                <span className="text-muted-foreground text-xs">No Image</span>
            </div>
        );
    }

    if (fill) {
        return (
            <div className={`relative ${className}`}>
                <Image
                    src={finalUrl}
                    alt={alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    unoptimized={finalUrl.startsWith("data:") || finalUrl.startsWith("blob:")}
                />
            </div>
        );
    }

    return (
        <Image
            src={finalUrl}
            alt={alt}
            width={width ?? 200}
            height={height ?? 200}
            className={className}
            unoptimized={finalUrl.startsWith("data:") || finalUrl.startsWith("blob:")}
        />
    );
}
```

**Breaking-prop note for the implementer:** every existing call site of `<ProfileImage>` passes a `className` that sizes the element directly (e.g. `className="w-full h-full object-cover"`), expecting a raw `<img>`. With `fill` defaulting to `true`, `ProfileImage` now renders a wrapping `<div className={className}>` containing an absolutely-positioned `<Image fill>` — the existing `className` values (width/height/object-fit classes) still apply correctly to that wrapper div in every call site the audit located (`AccessCard.tsx`, builder gallery grid, templates), because they were already sizing a fixed-dimension container. Grep for `<ProfileImage` across the repo after this change and visually check each call site in Step 7 below; if any call site relied on `className` targeting the `<img>` itself for a non-`object-fit` style (e.g. a border radius that needs to clip the image, not just the container), verify the clip still applies to the wrapper (it does, since `overflow-hidden` in the existing className classes now clips the div, same visual result).

**`next.config.ts` note:** `next/image` requires either a local path or a configured `remotePatterns` entry for external hosts. Convex storage URLs come from `*.convex.cloud`. Add to `next.config.ts` (from Task 4, alongside the `headers()` addition):

```typescript
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
```

Insert this as a sibling key to `reactCompiler` and `headers` in the `nextConfig` object.

### Step 6: Propagate `resolvedImages` from the public profile page

In `app/p/[id]/page.tsx`, every `<ProfileImage>` usage lives inside the template components (`Editorial`, `Kinetic`, `Architectural`), which receive `data: ProfileData`. Add `resolvedImages` to `ProfileData` (`types/profile.ts`, next to the `componentOrder?: string[];` field added in Task 7):

```typescript
    resolvedImages?: Record<string, string>;
```

In `app/p/[id]/page.tsx`, add it to the `data` object (alongside `componentOrder: layoutConfig.componentOrder,` added in Task 7):

```typescript
        resolvedImages: (profile as any).resolvedImages,
```

Each template's existing `<ProfileImage src={...} .../>` calls need `resolvedImages={data.resolvedImages}` added as a prop — grep `<ProfileImage` in `Editorial.tsx`, `Kinetic.tsx`, `Architectural.tsx` and add the prop to every call site found. This is mechanical (same prop, same value, every call site) and does not require reading unrelated parts of those files.

### Step 7: Run the full suite and build, then verify manually

Run: `npm test && npm run build`
Expected: both succeed.

Run: `npm run dev`. Open a public profile with an avatar and a multi-image gallery. Open DevTools Network tab, filter to XHR/Fetch, reload — confirm there are far fewer (ideally zero) `getImageUrl` Convex queries firing on load (they should already be present in `resolvedImages` from the single `getProfile` call). Confirm images render correctly (not broken, not stretched) and check the `<img>`/`Image`-rendered elements in the Elements panel use `next/image`'s generated `srcset`. Stop the dev server when done.

### Step 8: Commit

```bash
git add convex/profiles.ts convex/profiles.test.ts components/templates/ProfileImage.tsx types/profile.ts app/p/[id]/page.tsx components/templates/Editorial.tsx components/templates/Kinetic.tsx components/templates/Architectural.tsx next.config.ts
git commit -m "perf: batch-resolve profile images server-side, migrate ProfileImage to next/image (UI/UX P0)"
```

---

## Deferred to a follow-up plan (not in this plan's scope)

These were in the audit but require reading substantially more of the codebase (the full contents of `Editorial.tsx`, `Kinetic.tsx`, `Architectural.tsx`, `convex/teams.ts`, `convex/payrex.ts`) than this plan's tasks needed, and rushing them risks the same kind of bug this audit exists to catch. Write a separate plan for these once Tasks 0-10 above are merged:

- **UI/UX P1 accessibility pass**: `aria-label`s on icon-only buttons and touch-target sizing throughout `app/dashboard/builder/page.tsx`, and the body-text contrast fix (`readableTextColor` applied to the ~55 opacity-based muted-text occurrences across the three templates).
- **Architecture consolidation** (Strong recommendations from the architecture review): extract a single PayRex client module (`convex/payrex.ts` and `convex/billing.ts` currently rebuild the same request), de-duplicate `convex/plans.ts`/`lib/plans.ts`, de-duplicate the order-total math across `convex/settings.ts` and the cart/checkout pages, and de-duplicate `resolveDiscount`/`validateDiscount` in `convex/checkout.ts`.
- **`convex/teams.ts` full-table scans** (Backend #6): rewrite the team-membership queries to use the `users.by_teamId` index this plan's Task 6 already added.
- **Rate limiting on `validateDiscount`**: it is a Convex `query`, which cannot write to the database (Convex's own restriction) — closing the enumeration risk needs either converting the flow to a mutation-backed check or an external solution, deliberately left out of Task 5 rather than force a broken implementation.
