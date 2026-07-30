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
