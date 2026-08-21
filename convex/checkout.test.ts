import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
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

const VALID_SHIPPING_ADDRESS = {
  fullName: "Guest Buyer",
  addressLine1: "1 Rizal Ave",
  city: "Manila",
  postalCode: "1000",
  country: "PH",
  phone: "09171234567",
};

/**
 * Task 18 / I3 — the same atomic-rollback bug fixed for convex/cards.ts in
 * Task 1 (and convex/leads.ts earlier in this task): `createOrder` wrote its
 * rate-limit counter, then threw ("Cart is empty") a few lines later in the
 * SAME mutation. Convex mutations are atomic, so that later throw rolled the
 * counter write back out with it — repeated failing attempts (e.g. probing
 * with an empty cart, or brute-forcing a discount code through checkout)
 * never actually accumulated toward the limit. This pins the fix: failing
 * attempts must still count toward the per-key cap, and the 6th must be
 * rejected for being rate-limited, not for the empty cart.
 */
test("createOrder's rate limit still accumulates across repeated failing attempts (empty cart)", async () => {
  const t = convexTest(schema);
  const guestId = "guest_rollback_probe";

  for (let i = 0; i < 5; i++) {
    await expect(
      t.action(api.checkout.createOrder, {
        guestEmail: "probe@test.dev",
        guestId,
        shippingAddress: VALID_SHIPPING_ADDRESS,
        paymentProvider: "payrex",
      })
    ).rejects.toThrow(/cart is empty/i);
  }

  await expect(
    t.action(api.checkout.createOrder, {
      guestEmail: "probe@test.dev",
      guestId,
      shippingAddress: VALID_SHIPPING_ADDRESS,
      paymentProvider: "payrex",
    })
  ).rejects.toThrow(/too many requests/i);
});

/**
 * Task 18 / I3 — `validateDiscount` was a public, unauthenticated Convex
 * `query`: it confirmed both a code's validity AND its exact value, and
 * queries cannot write to the database, so there was no way to meter it at
 * all — a wordlist of guessable promo codes could be hammered against it
 * with zero rate limiting. Converting it to an action (the only function
 * kind that can both stay callable pre-auth and record a rate-limit write
 * via ctx.runMutation) closes that: repeated guesses must eventually be
 * rejected as rate-limited.
 */
test("validateDiscount is rate-limited against repeated code guesses", async () => {
  const t = convexTest(schema);

  for (let i = 0; i < 10; i++) {
    const result = await t.action(api.checkout.validateDiscount, {
      code: `GUESS${i}`,
      subtotal: 10000,
      visitorId: "discount_probe",
    });
    expect(result.valid).toBe(false);
  }

  await expect(
    t.action(api.checkout.validateDiscount, {
      code: "GUESS_OVER_LIMIT",
      subtotal: 10000,
      visitorId: "discount_probe",
    })
  ).rejects.toThrow(/too many requests/i);
});

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
    asStranger.query(api.checkout.getOrderByNumber, { orderNumber: "TF-2026-TESTORD" })
  ).rejects.toThrow(/unauthorized/i);
});

test("getOrderByNumber rejects an unauthenticated caller", async () => {
  const t = convexTest(schema);
  await seedOrder(t, "owner_clerk_id");

  await expect(
    t.query(api.checkout.getOrderByNumber, { orderNumber: "TF-2026-TESTORD" })
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

test("internalConfirmOrderPayment does not regress a paid order when a stale failed webhook arrives afterward", async () => {
  const t = convexTest(schema);
  const { orderId } = await seedOrder(t, "owner_clerk_id");

  const paidResult = await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber: "TF-2026-TESTORD",
    paymentStatus: "paid",
  });
  expect(paidResult.success).toBe(true);

  const paidOrder = await t.run(async (ctx) => ctx.db.get(orderId));
  expect(paidOrder?.paymentStatus).toBe("paid");

  // A stale/duplicate/out-of-order "failed" webhook arrives after the order
  // was already legitimately marked paid (inventory/discount/email side
  // effects already ran). It must not regress the order's paymentStatus.
  const staleFailedResult = await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber: "TF-2026-TESTORD",
    paymentStatus: "failed",
  });
  expect(staleFailedResult.success).toBe(true);

  const orderAfterStaleFailed = await t.run(async (ctx) => ctx.db.get(orderId));
  expect(orderAfterStaleFailed?.paymentStatus).toBe("paid");
});

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
  productId: Id<"products">,
  quantity: number,
  orderNumber: string
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

test("internalConfirmOrderPayment is a no-op when a duplicate paid webhook arrives after the order was refunded", async () => {
  const t = convexTest(schema);
  const productId = await seedProductForOrder(t, 5);
  const orderNumber = "TF-2026-REFUNDED";
  const orderId = await seedPendingOrder(t, productId, 2, orderNumber);

  await t.run(async (ctx) => {
    await ctx.db.insert("discounts", {
      code: "REFUNDCODE",
      type: "fixed",
      value: 1000,
      usageLimit: 5,
      usedCount: 1,
      validFrom: 0,
      isActive: true,
    });
    // Simulate an admin-issued refund: paymentStatus/status "refunded",
    // inventory already restored by markOrderRefunded.
    await ctx.db.patch(orderId, {
      appliedDiscountCode: "REFUNDCODE",
      paymentStatus: "refunded",
      status: "refunded",
      paidAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // A duplicate/replayed "paid" webhook for the now-refunded order arrives.
  const result = await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber,
    paymentStatus: "paid",
  });
  expect(result.success).toBe(true);

  const order = await t.run(async (ctx) => ctx.db.get(orderId));
  expect(order?.paymentStatus).toBe("refunded");
  expect(order?.status).toBe("refunded");

  const product = await t.run(async (ctx) => ctx.db.get(productId));
  expect(product?.inventory).toBe(5); // not re-decremented

  const discount = await t.run(async (ctx) =>
    ctx.db
      .query("discounts")
      .withIndex("by_code", (q) => q.eq("code", "REFUNDCODE"))
      .first()
  );
  expect(discount?.usedCount).toBe(1); // not re-incremented

  const scheduled = await t.run(async (ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(scheduled.length).toBe(0); // no duplicate order-confirmation email scheduled
});

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
      .first()
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
      .first()
  );
  expect(discount?.usedCount).toBe(1);

  const orderB = await t.run(async (ctx) =>
    ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", orderNumberB))
      .first()
  );
  expect(orderB?.paymentStatus).toBe("failed");
});

test("internalConfirmOrderPayment fails an order whose discount was deactivated while the order was pending", async () => {
  const t = convexTest(schema);
  const productId = await seedProductForOrder(t, 100);
  const discountId = await t.run(async (ctx) => {
    return await ctx.db.insert("discounts", {
      code: "DEACTME",
      type: "fixed",
      value: 1000,
      usedCount: 0,
      validFrom: 0,
      isActive: true,
    });
  });

  const orderNumber = "TF-2026-DEACT";
  const orderId = await t.run(async (ctx) => {
    return await ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      items: [
        { productId, productName: "Limited Card", quantity: 1, unitPrice: 50000, total: 50000 },
      ],
      subtotal: 50000,
      tax: 0,
      shipping: 0,
      discount: 1000,
      appliedDiscountCode: "DEACTME",
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
  });

  // Admin deactivates the code (e.g. edits/disables the promo) while the
  // order is still pending, i.e. after the create-time `resolveDiscount`
  // check already passed but before payment confirmation runs.
  await t.run(async (ctx) => {
    await ctx.db.patch(discountId, { isActive: false });
  });

  const result = await t.mutation(internal.checkout.internalConfirmOrderPayment, {
    orderNumber,
    paymentStatus: "paid",
  });
  expect(result.success).toBe(false);

  const order = await t.run(async (ctx) => ctx.db.get(orderId));
  expect(order?.paymentStatus).toBe("failed");

  const discount = await t.run(async (ctx) => ctx.db.get(discountId));
  expect(discount?.usedCount).toBe(0);
});
