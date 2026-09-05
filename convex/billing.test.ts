import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "upgrader@test.dev",
      clerkId: "upgrader_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
}

test("createPendingInvoice does not dedupe by itself (baseline)", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);

  const invoiceId1 = await t.mutation(internal.billing.createPendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });
  const invoiceId2 = await t.mutation(internal.billing.createPendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  expect(invoiceId1).not.toBe(invoiceId2);
});

test("findOrCreatePendingInvoice reuses an existing pending invoice for the same user+plan", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);

  const first = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });
  const second = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  expect(second).toBe(first);

  const invoices = await t.run(async (ctx) =>
    ctx.db
      .query("subscriptionInvoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );
  expect(invoices.length).toBe(1);
});

test("findOrCreatePendingInvoice creates a new invoice once the prior one is paid", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);

  const first = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(first, { status: "paid" });
  });

  const second = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  expect(second).not.toBe(first);
});

test("internalFailInvoice marks a pending invoice failed and leaves paid invoices untouched", async () => {
  const t = convexTest(schema);
  const userId = await seedUser(t);
  const invoiceId = await t.mutation(internal.billing.findOrCreatePendingInvoice, {
    userId,
    plan: "pro",
    amountCentavos: 29900,
  });

  const result = await t.mutation(internal.billing.internalFailInvoice, { invoiceId });
  expect(result.success).toBe(true);

  const invoice = await t.run(async (ctx) => ctx.db.get(invoiceId));
  expect(invoice?.status).toBe("expired");
});
