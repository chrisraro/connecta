import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import schema from "./schema";
import { api } from "./_generated/api";

const VALID_SHIPPING_ADDRESS = {
  fullName: "Jane Owner",
  addressLine1: "123 Main St",
  city: "Manila",
  postalCode: "1000",
  country: "PH",
  phone: "09171234567",
};

async function seedUserOwnedOrder(
  t: ReturnType<typeof convexTest>,
  ownerClerkId: string,
  orderNumber: string
) {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner@test.dev",
      clerkId: ownerClerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
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
      shippingAddress: VALID_SHIPPING_ADDRESS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ownerId, orderId };
  });
}

async function seedGuestOrder(
  t: ReturnType<typeof convexTest>,
  orderNumber: string,
  guestOrderToken: string | undefined
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("orders", {
      orderNumber,
      guestEmail: "guest@test.dev",
      guestOrderToken,
      status: "pending",
      items: [],
      subtotal: 10000,
      tax: 0,
      shipping: 0,
      total: 10000,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      shippingAddress: VALID_SHIPPING_ADDRESS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

beforeEach(() => {
  // createCheckoutSession bails out before touching ownership if these
  // aren't set — every test in this file needs to get PAST that guard to
  // actually exercise the authorization logic under test (Task 19 / C2).
  vi.stubEnv("PAYREX_SECRET_KEY", "sk_test_00000000000000000000000000000000");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("createCheckoutSession rejects an unauthenticated caller for a signed-in user's order", async () => {
  const t = convexTest(schema);
  await seedUserOwnedOrder(t, "owner_clerk_id", "TF-2026-OWNED1");

  await expect(
    t.action(api.payrex.createCheckoutSession, { orderNumber: "TF-2026-OWNED1" })
  ).rejects.toThrow(ConvexError);
});

test("createCheckoutSession rejects a caller who is authenticated but does not own the order", async () => {
  const t = convexTest(schema);
  await seedUserOwnedOrder(t, "owner_clerk_id", "TF-2026-OWNED2");
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
    asStranger.action(api.payrex.createCheckoutSession, { orderNumber: "TF-2026-OWNED2" })
  ).rejects.toThrow(ConvexError);
});

test("createCheckoutSession rejects a guest checkout request with no token", async () => {
  const t = convexTest(schema);
  await seedGuestOrder(t, "TF-2026-GUEST1", "correct-token");

  await expect(
    t.action(api.payrex.createCheckoutSession, { orderNumber: "TF-2026-GUEST1" })
  ).rejects.toThrow(ConvexError);
});

test("createCheckoutSession rejects a guest checkout request with the wrong token", async () => {
  const t = convexTest(schema);
  await seedGuestOrder(t, "TF-2026-GUEST2", "correct-token");

  await expect(
    t.action(api.payrex.createCheckoutSession, {
      orderNumber: "TF-2026-GUEST2",
      guestOrderToken: "guessed-token",
    })
  ).rejects.toThrow(ConvexError);
});

test("createCheckoutSession rejects when the order has no stored guest token at all (never mint a bypass)", async () => {
  const t = convexTest(schema);
  await seedGuestOrder(t, "TF-2026-GUEST3", undefined);

  await expect(
    t.action(api.payrex.createCheckoutSession, {
      orderNumber: "TF-2026-GUEST3",
      guestOrderToken: "anything",
    })
  ).rejects.toThrow(ConvexError);
});

test("createCheckoutSession rejects an unknown order number", async () => {
  const t = convexTest(schema);

  await expect(
    t.action(api.payrex.createCheckoutSession, { orderNumber: "TF-2026-NOPE" })
  ).rejects.toThrow(ConvexError);
});

test("createCheckoutSession succeeds for the order's authenticated owner", async () => {
  const t = convexTest(schema);
  await seedUserOwnedOrder(t, "owner_clerk_id", "TF-2026-OWNED3");
  const asOwner = t.withIdentity({ subject: "owner_clerk_id" });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ id: "cs_123", url: "https://pay.payrexhq.com/cs_123" }),
        { status: 200 }
      )
    )
  );

  const result = await asOwner.action(api.payrex.createCheckoutSession, {
    orderNumber: "TF-2026-OWNED3",
  });

  expect(result.url).toBe("https://pay.payrexhq.com/cs_123");
});

test("createCheckoutSession succeeds for a guest presenting the correct token", async () => {
  const t = convexTest(schema);
  await seedGuestOrder(t, "TF-2026-GUEST4", "correct-token");

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ id: "cs_456", url: "https://pay.payrexhq.com/cs_456" }),
        { status: 200 }
      )
    )
  );

  const result = await t.action(api.payrex.createCheckoutSession, {
    orderNumber: "TF-2026-GUEST4",
    guestOrderToken: "correct-token",
  });

  expect(result.url).toBe("https://pay.payrexhq.com/cs_456");
});

test("createCheckoutSession lets an admin start checkout on behalf of a customer's order", async () => {
  const t = convexTest(schema);
  await seedUserOwnedOrder(t, "owner_clerk_id", "TF-2026-OWNED4");
  await t.run(async (ctx) => {
    const adminUserId = await ctx.db.insert("users", {
      email: "admin@test.dev",
      clerkId: "admin_clerk_id",
      role: "admin",
      subscriptionStatus: "active",
      plan: "business",
    });
    await ctx.db.insert("admins", {
      userId: adminUserId,
      role: "superadmin",
      grantedBy: adminUserId,
      grantedAt: Date.now(),
    });
  });
  const asAdmin = t.withIdentity({ subject: "admin_clerk_id" });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ id: "cs_789", url: "https://pay.payrexhq.com/cs_789" }),
        { status: 200 }
      )
    )
  );

  const result = await asAdmin.action(api.payrex.createCheckoutSession, {
    orderNumber: "TF-2026-OWNED4",
  });

  expect(result.url).toBe("https://pay.payrexhq.com/cs_789");
});
