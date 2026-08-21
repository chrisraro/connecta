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
  uuid: string
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("cards", {
      ownerId,
      uuid,
      activationCode: uuid.toUpperCase().slice(0, 6),
      status,
      linkedProfileId: undefined,
      tapCount: 0,
    })
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
    t.mutation(api.admin.setupFirstAdmin, { clerkId: "victim_clerk_id" })
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
    asAttacker.mutation(api.admin.setupFirstAdmin, { clerkId: "victim_clerk_id" })
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
