import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Behavior-preservation tests for adminShop.ts's order-list/stats queries.
 *
 * getOrders, getSalesStats, and getShopAnalytics (pre-conversion) each do
 * `ctx.db.query("orders").collect()` and filter in JS by status /
 * paymentStatus / createdAt, despite schema.ts defining `by_status`,
 * `by_paymentStatus`, and `by_createdAt` indexes on orders for exactly these
 * filters. These tests seed orders on both sides of each filter boundary so
 * a conversion to `.withIndex(...)` that quietly changes which rows come
 * back fails loudly.
 */

async function seedAdmin(t: ReturnType<typeof convexTest>, clerkId: string) {
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      email: "admin@test.dev",
      clerkId,
      role: "admin",
      subscriptionStatus: "active",
      plan: "free",
    });
    await ctx.db.insert("admins", {
      userId: id,
      role: "superadmin",
      grantedBy: id,
      grantedAt: Date.now(),
    });
    return id;
  });
  return { userId, asAdmin: t.withIdentity({ subject: clerkId }) };
}

type OrderOverrides = Partial<{
  orderNumber: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  createdAt: number;
  paidAt: number;
  total: number;
  items: Array<{
    productId: Id<"products">;
    productName: string;
    variationId?: Id<"productVariations">;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}>;

async function seedOrder(t: ReturnType<typeof convexTest>, overrides: OrderOverrides = {}) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("orders", {
      orderNumber: overrides.orderNumber ?? `ORD-${Math.random().toString(36).slice(2, 8)}`,
      status: overrides.status ?? "pending",
      items: overrides.items ?? [],
      subtotal: overrides.total ?? 100,
      tax: 0,
      shipping: 0,
      total: overrides.total ?? 100,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: overrides.paymentStatus ?? "pending",
      paidAt: overrides.paidAt,
      shippingAddress: {
        fullName: "Test Buyer",
        addressLine1: "123 Main St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "09171234567",
      },
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.createdAt ?? now,
    });
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

test("getOrders with a status filter returns only orders on that side of the boundary, via the by_status index", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk");

  const pendingId = await seedOrder(t, { status: "pending", orderNumber: "P1" });
  await seedOrder(t, { status: "shipped", orderNumber: "S1" }); // boundary: excluded
  await seedOrder(t, { status: "delivered", orderNumber: "D1" }); // boundary: excluded

  const result = await asAdmin.query(api.adminShop.getOrders, {
    clerkId: "admin_clerk",
    status: "pending",
  });

  expect(result.map((o) => o._id)).toEqual([pendingId]);
});

test("getOrders with a paymentStatus filter returns only orders on that side of the boundary, via the by_paymentStatus index", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk2");

  const paidId = await seedOrder(t, { paymentStatus: "paid", orderNumber: "PAID1" });
  await seedOrder(t, { paymentStatus: "pending", orderNumber: "PEND1" }); // boundary: excluded
  await seedOrder(t, { paymentStatus: "failed", orderNumber: "FAIL1" }); // boundary: excluded

  const result = await asAdmin.query(api.adminShop.getOrders, {
    clerkId: "admin_clerk2",
    paymentStatus: "paid",
  });

  expect(result.map((o) => o._id)).toEqual([paidId]);
});

test("getOrders with no filters returns every order (unfiltered admin list view), sorted newest first", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk3");

  const now = Date.now();
  const olderId = await seedOrder(t, { orderNumber: "OLD", createdAt: now - DAY_MS });
  const newerId = await seedOrder(t, { orderNumber: "NEW", createdAt: now });

  const result = await asAdmin.query(api.adminShop.getOrders, { clerkId: "admin_clerk3" });

  expect(result.map((o) => o._id)).toEqual([newerId, olderId]);
});

test("getOrders combines a status filter with a date range (index narrows, remaining filter still applies)", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk4");

  const now = Date.now();
  const inRangeId = await seedOrder(t, { status: "pending", createdAt: now, orderNumber: "IN" });
  // Boundary: right status, but before dateFrom.
  await seedOrder(t, { status: "pending", createdAt: now - 10 * DAY_MS, orderNumber: "TOO_OLD" });
  // Boundary: in date range, but wrong status.
  await seedOrder(t, { status: "shipped", createdAt: now, orderNumber: "WRONG_STATUS" });

  const result = await asAdmin.query(api.adminShop.getOrders, {
    clerkId: "admin_clerk4",
    status: "pending",
    dateFrom: now - DAY_MS,
  });

  expect(result.map((o) => o._id)).toEqual([inRangeId]);
});

test("getSalesStats only counts paid orders within the requested date range (by_paymentStatus index)", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk5");

  const now = Date.now();
  await seedOrder(t, {
    paymentStatus: "paid",
    createdAt: now,
    total: 500,
    orderNumber: "IN_RANGE_PAID",
  });
  // Boundary: paid but outside the date range.
  await seedOrder(t, {
    paymentStatus: "paid",
    createdAt: now - 10 * DAY_MS,
    total: 999,
    orderNumber: "OUT_OF_RANGE_PAID",
  });
  // Boundary: in range but not paid.
  await seedOrder(t, {
    paymentStatus: "pending",
    createdAt: now,
    total: 777,
    orderNumber: "IN_RANGE_UNPAID",
  });

  const result = await asAdmin.query(api.adminShop.getSalesStats, {
    clerkId: "admin_clerk5",
    dateFrom: now - DAY_MS,
  });

  expect(result.totalOrders).toBe(1);
  expect(result.totalRevenue).toBe(500);
});

test("getShopAnalytics: recent paid/unpaid orders produce the same totals and status breakdown as before conversion", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk6");

  const now = Date.now();
  await seedOrder(t, {
    paymentStatus: "paid",
    status: "delivered",
    total: 300,
    createdAt: now,
    paidAt: now,
    orderNumber: "A",
  });
  await seedOrder(t, {
    paymentStatus: "paid",
    status: "shipped",
    total: 200,
    createdAt: now,
    paidAt: now,
    orderNumber: "B",
  });
  await seedOrder(t, {
    paymentStatus: "pending",
    status: "pending",
    total: 999,
    createdAt: now,
    orderNumber: "C",
  });

  const result = await asAdmin.query(api.adminShop.getShopAnalytics, { clerkId: "admin_clerk6" });

  expect(result.totalRevenue).toBe(500);
  expect(result.paidOrderCount).toBe(2);
  expect(result.totalOrders).toBe(3);
  expect(result.statusCounts.delivered).toBe(1);
  expect(result.statusCounts.shipped).toBe(1);
  expect(result.statusCounts.pending).toBe(1);
});

test("getShopAnalytics: an order older than the 90-day analytics window is excluded from totals (new, deliberate cap)", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk7");

  const now = Date.now();
  await seedOrder(t, {
    paymentStatus: "paid",
    status: "delivered",
    total: 300,
    createdAt: now,
    paidAt: now,
    orderNumber: "RECENT",
  });
  // Older than the 90-day analytics window -> must be excluded post-conversion.
  await seedOrder(t, {
    paymentStatus: "paid",
    status: "delivered",
    total: 5000,
    createdAt: now - 100 * DAY_MS,
    paidAt: now - 100 * DAY_MS,
    orderNumber: "ANCIENT",
  });

  const result = await asAdmin.query(api.adminShop.getShopAnalytics, { clerkId: "admin_clerk7" });

  expect(result.totalRevenue).toBe(300);
  expect(result.paidOrderCount).toBe(1);
  expect(result.totalOrders).toBe(1);
});
