import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { checkRateLimit } from "./rateLimit";

test("checkRateLimit allows calls under the max within the window", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await checkRateLimit(ctx, "test:key-a", { max: 3, windowMs: 60_000 });
    await checkRateLimit(ctx, "test:key-a", { max: 3, windowMs: 60_000 });
    await checkRateLimit(ctx, "test:key-a", { max: 3, windowMs: 60_000 });
  });
});

test("checkRateLimit throws once the max is exceeded within the window", async () => {
  const t = convexTest(schema);
  await expect(
    t.run(async (ctx) => {
      await checkRateLimit(ctx, "test:key-b", { max: 2, windowMs: 60_000 });
      await checkRateLimit(ctx, "test:key-b", { max: 2, windowMs: 60_000 });
      await checkRateLimit(ctx, "test:key-b", { max: 2, windowMs: 60_000 });
    }),
  ).rejects.toThrow(/too many requests/i);
});

test("checkRateLimit uses independent counters per key", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await checkRateLimit(ctx, "test:key-c1", { max: 1, windowMs: 60_000 });
    await checkRateLimit(ctx, "test:key-c2", { max: 1, windowMs: 60_000 });
  });
});
