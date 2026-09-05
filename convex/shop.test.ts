import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

/**
 * Behavior-preservation tests for the public storefront's getProducts.
 *
 * getProducts already used the by_published index for its base query
 * (schema.ts's audit finding #8 flagged the missing pagination, not a
 * missing index) — the fix here is adding a `.take(N)` cap in place of an
 * unbounded `.collect()`. This test seeds more published products than the
 * cap to prove the cap engages, and confirms unpublished products still
 * never appear (pre-existing by_published filtering, unchanged).
 */
test("getProducts excludes unpublished products (pre-existing by_published index behavior)", async () => {
  const t = convexTest(schema);
  const publishedId = await t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Published Card",
      slug: "published-card",
      basePrice: 1000,
      sku: "PUB-1",
      inventory: 5,
      lowStockThreshold: 1,
      trackInventory: true,
      isPublished: true,
      isFeatured: false,
      tags: [],
      images: [],
      primaryImageIndex: 0,
      shippingRequired: true,
    }),
  );
  // Boundary: unpublished — must be excluded.
  await t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Draft Card",
      slug: "draft-card",
      basePrice: 1000,
      sku: "DRAFT-1",
      inventory: 5,
      lowStockThreshold: 1,
      trackInventory: true,
      isPublished: false,
      isFeatured: false,
      tags: [],
      images: [],
      primaryImageIndex: 0,
      shippingRequired: true,
    }),
  );

  const result = await t.query(api.shop.getProducts, {});
  expect(result.map((p) => p._id)).toEqual([publishedId]);
});

test("getProducts caps the published catalog at PUBLISHED_PRODUCTS_CAP and keeps the newest products", async () => {
  const t = convexTest(schema);
  const CAP = 200;
  const TOTAL = CAP + 10;
  const ids: Id<"products">[] = [];
  await t.run(async (ctx) => {
    for (let i = 0; i < TOTAL; i++) {
      const id = await ctx.db.insert("products", {
        name: `Bulk Product ${i}`,
        slug: `bulk-product-${i}`,
        basePrice: 1000,
        sku: `BULK-${i}`,
        inventory: 5,
        lowStockThreshold: 1,
        trackInventory: true,
        isPublished: true,
        isFeatured: false,
        tags: [],
        images: [],
        primaryImageIndex: 0,
        shippingRequired: true,
      });
      ids.push(id);
    }
  });

  // A length check alone doesn't catch truncation dropping the WRONG end:
  // without ordering, the same oldest CAP rows would satisfy `length ===
  // CAP` forever regardless of how many newer products get published past
  // the cap — this is the "Newest First" storefront default silently never
  // showing new inventory (production-audit finding). Assert row IDENTITY:
  // the newest CAP products (the tail of `ids`) must all be present, and
  // the oldest TOTAL-CAP products (the head of `ids`) must all be excluded.
  const result = await t.query(api.shop.getProducts, {});
  expect(result.length).toBe(CAP);
  const resultIds = new Set(result.map((p) => p._id));
  const newest = ids.slice(TOTAL - CAP);
  const oldest = ids.slice(0, TOTAL - CAP);
  for (const id of newest) {
    expect(resultIds.has(id)).toBe(true);
  }
  for (const id of oldest) {
    expect(resultIds.has(id)).toBe(false);
  }
}, 20000);

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
