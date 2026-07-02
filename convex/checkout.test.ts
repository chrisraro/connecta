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
