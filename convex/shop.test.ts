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
    })
  ).rejects.toThrow(/quantity/i);

  await expect(
    t.mutation(api.shop.addToCart, {
      guestId: "guest-1",
      productId,
      quantity: -3,
    })
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
    })
  ).rejects.toThrow(/quantity/i);
});
