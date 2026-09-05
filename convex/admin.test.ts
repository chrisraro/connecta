import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Seeds an authenticated superadmin (users row + active admins grant) and
// returns a `t` client already authenticated as that admin, matching the
// clerkId requireAdmin(ctx, clerkId) expects.
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

async function seedCard(
  t: ReturnType<typeof convexTest>,
  ownerId: Id<"users">,
  status: "inventory" | "active" | "lost",
  uuid: string,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("cards", {
      ownerId,
      uuid,
      activationCode: uuid.toUpperCase().slice(0, 6),
      status,
      linkedProfileId: undefined,
      tapCount: 0,
    }),
  );
}

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

test("deleteCards refuses to delete an active card and reports it as skipped", async () => {
  const t = convexTest(schema);
  const { userId, asAdmin } = await seedAdmin(t, "admin_clerk_id");
  const activeCardId = await seedCard(t, userId, "active", "active-uuid-1");

  const result = await asAdmin.mutation(api.admin.deleteCards, {
    clerkId: "admin_clerk_id",
    cardIds: [activeCardId],
  });

  expect(result.deletedCount).toBe(0);
  expect(result.skippedIds).toEqual([activeCardId]);

  const card = await t.run(async (ctx) => ctx.db.get(activeCardId));
  expect(card).not.toBeNull();
  expect(card?.status).toBe("active");
});

test("deleteCards deletes inventory and lost cards", async () => {
  const t = convexTest(schema);
  const { userId, asAdmin } = await seedAdmin(t, "admin_clerk_id");
  const inventoryCardId = await seedCard(t, userId, "inventory", "inv-uuid-1");
  const lostCardId = await seedCard(t, userId, "lost", "lost-uuid-1");

  const result = await asAdmin.mutation(api.admin.deleteCards, {
    clerkId: "admin_clerk_id",
    cardIds: [inventoryCardId, lostCardId],
  });

  expect(result.deletedCount).toBe(2);
  expect(result.skippedIds).toEqual([]);

  const inventoryCard = await t.run(async (ctx) => ctx.db.get(inventoryCardId));
  const lostCard = await t.run(async (ctx) => ctx.db.get(lostCardId));
  expect(inventoryCard).toBeNull();
  expect(lostCard).toBeNull();
});

test("deleteCards deletes allowed cards and reports skipped ids in a mixed batch", async () => {
  const t = convexTest(schema);
  const { userId, asAdmin } = await seedAdmin(t, "admin_clerk_id");
  const inventoryCardId = await seedCard(t, userId, "inventory", "inv-uuid-2");
  const activeCardId = await seedCard(t, userId, "active", "active-uuid-2");

  const result = await asAdmin.mutation(api.admin.deleteCards, {
    clerkId: "admin_clerk_id",
    cardIds: [inventoryCardId, activeCardId],
  });

  expect(result.success).toBe(true);
  expect(result.deletedCount).toBe(1);
  expect(result.totalRequested).toBe(2);
  expect(result.skippedIds).toEqual([activeCardId]);

  const inventoryCard = await t.run(async (ctx) => ctx.db.get(inventoryCardId));
  const activeCard = await t.run(async (ctx) => ctx.db.get(activeCardId));
  expect(inventoryCard).toBeNull();
  expect(activeCard).not.toBeNull();
  expect(activeCard?.status).toBe("active");
});

/**
 * Behavior-preservation tests for getAllUsers/getCards.
 *
 * getAllUsers (pre-conversion) collects the full `users` and `orders`
 * tables, then for every user runs two more per-user sub-queries (admins,
 * cards) — the N+1 pattern the audit flagged. getCards collects the whole
 * `cards` table unbounded. These tests seed rows on both sides of the
 * relevant boundaries (active vs. revoked admin grant, a subtle
 * revoke-then-regrant history, cards/orders belonging vs. not belonging to
 * a user) so a batched/capped conversion that quietly changes results fails
 * loudly.
 */

test("getAllUsers reports accurate per-user card/order counts and admin role for a plain admin grant", async () => {
  const t = convexTest(schema);
  const { userId: adminId, asAdmin } = await seedAdmin(t, "admin_clerk_id");

  const plainUserId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "plain@test.dev",
      clerkId: "plain_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );
  await seedCard(t, plainUserId, "inventory", "plain-card-1");
  await seedCard(t, plainUserId, "active", "plain-card-2");
  // A card owned by someone else must not leak into plainUser's count.
  await seedCard(t, adminId, "inventory", "admin-card-1");

  await t.run(async (ctx) => {
    await ctx.db.insert("orders", {
      orderNumber: "ORD-PLAIN-1",
      userId: plainUserId,
      status: "pending",
      items: [],
      subtotal: 100,
      tax: 0,
      shipping: 0,
      total: 100,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      shippingAddress: {
        fullName: "Plain User",
        addressLine1: "1 Test St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "09171234567",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // An order belonging to someone else must not count toward plainUser.
    await ctx.db.insert("orders", {
      orderNumber: "ORD-ADMIN-1",
      userId: adminId,
      status: "pending",
      items: [],
      subtotal: 50,
      tax: 0,
      shipping: 0,
      total: 50,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      shippingAddress: {
        fullName: "Admin",
        addressLine1: "1 Test St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "09171234567",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const result = await asAdmin.query(api.admin.getAllUsers, { clerkId: "admin_clerk_id" });

  const plainUserRow = result.find((u) => u.id === plainUserId);
  expect(plainUserRow).toBeDefined();
  expect(plainUserRow?.cardCount).toBe(2);
  expect(plainUserRow?.orderCount).toBe(1);
  expect(plainUserRow?.role).toBe("agent");
  expect(plainUserRow?.adminRole).toBeNull();

  const adminRow = result.find((u) => u.id === adminId);
  expect(adminRow?.role).toBe("admin");
  expect(adminRow?.adminRole).toBe("superadmin");
  expect(adminRow?.cardCount).toBe(1);
  expect(adminRow?.orderCount).toBe(1);
});

test("getAllUsers treats a user whose ONLY admin grant was revoked as a plain agent, not admin", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk_id2");

  const revokedUserId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      email: "revoked@test.dev",
      clerkId: "revoked_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    await ctx.db.insert("admins", {
      userId: id,
      role: "moderator",
      grantedBy: id,
      grantedAt: Date.now() - 1000,
      revokedAt: Date.now(),
      reason: "test revoke",
    });
    return id;
  });

  const result = await asAdmin.query(api.admin.getAllUsers, { clerkId: "admin_clerk_id2" });
  const row = result.find((u) => u.id === revokedUserId);
  expect(row?.role).toBe("agent");
  expect(row?.adminRole).toBeNull();
});

test("getAllUsers matches the by_user index's earliest-grant tie-break when a user has a revoked grant followed by a later active regrant", async () => {
  // Documents an existing edge case: the pre-conversion code does
  // `.withIndex("by_user", eq(userId)).first()`, which returns the
  // EARLIEST-created admins row for that user. If that earliest row was
  // later revoked and the user was then re-granted admin (a second, newer
  // admins row), `.first()` still returns the old revoked row — so the user
  // shows as a plain agent despite holding a currently-active grant. A
  // batched replacement must reproduce this exact tie-break, not "fix" it
  // silently as a side effect of the conversion.
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk_id3");

  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "regranted@test.dev",
      clerkId: "regranted_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );
  await t.run(async (ctx) => {
    await ctx.db.insert("admins", {
      userId,
      role: "moderator",
      grantedBy: userId,
      grantedAt: Date.now() - 10_000,
      revokedAt: Date.now() - 5_000,
      reason: "first grant, later revoked",
    });
    await ctx.db.insert("admins", {
      userId,
      role: "superadmin",
      grantedBy: userId,
      grantedAt: Date.now(),
      // active (no revokedAt) — this is the CURRENT grant.
    });
  });

  const result = await asAdmin.query(api.admin.getAllUsers, { clerkId: "admin_clerk_id3" });
  const row = result.find((u) => u.id === userId);
  // Matches pre-conversion `.first()` semantics: earliest row (revoked) wins.
  expect(row?.role).toBe("agent");
  expect(row?.adminRole).toBeNull();
});

test("getAllUsers caps the returned list at ADMIN_USER_LIST_CAP and keeps the newest rows", async () => {
  const t = convexTest(schema);
  const { asAdmin } = await seedAdmin(t, "admin_clerk_id4");

  const CAP = 500;
  const TOTAL = CAP + 10;
  const ids: Id<"users">[] = [];
  await t.run(async (ctx) => {
    for (let i = 0; i < TOTAL; i++) {
      const id = await ctx.db.insert("users", {
        email: `bulk${i}@test.dev`,
        clerkId: `bulk_clerk_${i}`,
        role: "agent",
        subscriptionStatus: "active",
        plan: "free",
      });
      ids.push(id);
    }
  });

  const result = await asAdmin.query(api.admin.getAllUsers, { clerkId: "admin_clerk_id4" });
  // Total users in the table = TOTAL bulk-seeded + 1 admin from seedAdmin —
  // well over the cap, so the returned list must be truncated. A length
  // check alone isn't enough: without ordering the same oldest N rows would
  // satisfy it forever, so also assert row IDENTITY — the newest CAP rows
  // (the tail of `ids`, inserted last) must all be present, and the oldest
  // TOTAL-CAP rows (the head of `ids`, inserted first — including the admin
  // row itself) must all be excluded.
  expect(result.length).toBe(CAP);
  const resultIds = new Set(result.map((u) => u.id));
  const newest = ids.slice(TOTAL - CAP);
  const oldest = ids.slice(0, TOTAL - CAP);
  for (const id of newest) {
    expect(resultIds.has(id)).toBe(true);
  }
  for (const id of oldest) {
    expect(resultIds.has(id)).toBe(false);
  }
}, 20000);

test("getCards caps the returned list at ADMIN_CARDS_LIST_CAP and keeps the newest rows across owners", async () => {
  const t = convexTest(schema);
  const { userId: owner1, asAdmin } = await seedAdmin(t, "admin_clerk_id5");
  const owner2 = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "owner2@test.dev",
      clerkId: "owner2_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    }),
  );

  const CAP = 500;
  const TOTAL = CAP + 10;
  const ids: Id<"cards">[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const owner = i % 2 === 0 ? owner1 : owner2;
    const id = await seedCard(t, owner, "inventory", `cap-test-${i}`);
    ids.push(id);
  }

  const result = await asAdmin.query(api.admin.getCards, { clerkId: "admin_clerk_id5" });
  // Same reasoning as the getAllUsers cap test above: assert row IDENTITY,
  // not just length, so truncation dropping the WRONG end (oldest rows
  // never rotating out) would be caught.
  expect(result.length).toBe(CAP);
  const resultIds = new Set(result.map((c) => c._id));
  const newest = ids.slice(TOTAL - CAP);
  const oldest = ids.slice(0, TOTAL - CAP);
  for (const id of newest) {
    expect(resultIds.has(id)).toBe(true);
  }
  for (const id of oldest) {
    expect(resultIds.has(id)).toBe(false);
  }
}, 20000);
