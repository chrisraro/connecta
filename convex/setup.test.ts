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
