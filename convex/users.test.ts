import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

/**
 * Seeds a user carrying the deprecated `credits` field — the orphan data that
 * live rows still have after the AI-generation feature was removed in 79d6e7c
 * without a migration.
 */
async function seedUserWithCredits(
  t: ReturnType<typeof convexTest>,
  clerkId: string,
  credits: number
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: `${clerkId}@test.dev`,
      clerkId,
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
      credits,
    })
  );
}

test("internalStripLegacyCredits removes the deprecated field and is a no-op on re-run", async () => {
  const t = convexTest(schema);
  const withCredits = await seedUserWithCredits(t, "legacy_user", 5);
  const clean = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "clean@test.dev",
      clerkId: "clean_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  const first = await t.mutation(internal.users.internalStripLegacyCredits, {});
  expect(first.stripped).toBe(1);
  expect(first.isDone).toBe(true);

  const after = await t.run(async (ctx) => ctx.db.get(withCredits));
  expect((after as { credits?: number } | null)?.credits).toBeUndefined();

  // The already-clean user must not be touched or corrupted.
  const untouched = await t.run(async (ctx) => ctx.db.get(clean));
  expect(untouched?.email).toBe("clean@test.dev");

  const second = await t.mutation(internal.users.internalStripLegacyCredits, {});
  expect(second.stripped).toBe(0);
});

test("internalStripLegacyCredits preserves every other user field", async () => {
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "rich@test.dev",
      clerkId: "rich_user",
      name: "Rich Record",
      role: "agent",
      subscriptionStatus: "active",
      plan: "pro",
      planExpiresAt: 1893456000000,
      onboardingCompleted: true,
      credits: 42,
    })
  );

  await t.mutation(internal.users.internalStripLegacyCredits, {});

  const after = await t.run(async (ctx) => ctx.db.get(userId));
  expect((after as { credits?: number } | null)?.credits).toBeUndefined();
  expect(after?.email).toBe("rich@test.dev");
  expect(after?.name).toBe("Rich Record");
  expect(after?.plan).toBe("pro");
  expect(after?.planExpiresAt).toBe(1893456000000);
  expect(after?.onboardingCompleted).toBe(true);
});

test("internalStripLegacyCredits pages through every user via its cursor", async () => {
  const t = convexTest(schema);
  const TOTAL = 7;
  for (let i = 0; i < TOTAL; i++) {
    await seedUserWithCredits(t, `paged_user_${i}`, i + 1);
  }

  let cursor: string | null = null;
  let stripped = 0;
  let pages = 0;
  for (;;) {
    const run: { stripped: number; isDone: boolean; cursor: string | null } =
      await t.mutation(internal.users.internalStripLegacyCredits, {
        cursor,
        batchSize: 3,
      });
    stripped += run.stripped;
    pages++;
    if (run.isDone) break;
    cursor = run.cursor;
    if (pages > 10) throw new Error("cursor did not terminate");
  }

  expect(pages).toBeGreaterThan(1);
  expect(stripped).toBe(TOTAL);

  const remaining = await t.run(async (ctx) => {
    const all = await ctx.db.query("users").collect();
    return all.filter((u) => (u as { credits?: number }).credits !== undefined).length;
  });
  expect(remaining).toBe(0);
});
