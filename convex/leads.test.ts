import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

test("createLead throttles more than 5 leads per owner within a minute", async () => {
  const t = convexTest(schema);
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "recipient@test.dev",
      clerkId: "recipient_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  for (let i = 0; i < 5; i++) {
    await t.mutation(api.leads.createLead, {
      ownerId,
      inquirerName: `Visitor ${i}`,
      inquirerContact: `visitor${i}@test.dev`,
    });
  }

  await expect(
    t.mutation(api.leads.createLead, {
      ownerId,
      inquirerName: "Visitor 6",
      inquirerContact: "visitor6@test.dev",
    })
  ).rejects.toThrow(/too many requests/i);
});
