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
    await t.action(api.leads.createLead, {
      ownerId,
      inquirerName: `Visitor ${i}`,
      inquirerContact: `visitor${i}@test.dev`,
    });
  }

  await expect(
    t.action(api.leads.createLead, {
      ownerId,
      inquirerName: "Visitor 6",
      inquirerContact: "visitor6@test.dev",
    })
  ).rejects.toThrow(/too many requests/i);
});

/**
 * Task 17 / I2 — the rate limit used to be keyed ONLY on the profile owner
 * (`lead:${ownerId}`), so every anonymous visitor to one profile shared a
 * single 5/min bucket. Connecta's flagship scenario is NFC taps at a
 * networking event: ten different prospects tapping the same card and
 * submitting the contact form within a minute would throttle half of them,
 * even though each is a distinct, legitimate visitor who has never
 * submitted before. This test pins the fix: the cap must be scoped per
 * VISITOR (a client-generated id, see lib/offline-leads.ts's
 * getOrCreateLeadVisitorId), not shared across everyone who taps the card.
 */
test("createLead does not throttle distinct visitors sharing one owner — the booth scenario", async () => {
  const t = convexTest(schema);
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "booth-owner@test.dev",
      clerkId: "booth_owner_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  // Ten taps in a minute, ten different prospects — none has submitted
  // before, so none should be throttled.
  for (let i = 0; i < 10; i++) {
    await expect(
      t.action(api.leads.createLead, {
        ownerId,
        visitorId: `visitor_${i}`,
        inquirerName: `Prospect ${i}`,
        inquirerContact: `prospect${i}@test.dev`,
      })
    ).resolves.toBeDefined();
  }
});

/**
 * A visitor id is client-supplied and anyone can rotate it per request, so
 * the per-visitor cap alone is not real abuse protection against a scripted
 * attacker. The aggregate per-owner cap is the backstop: even with freshly
 * rotated visitor ids on every call, one owner's inbox cannot be flooded
 * past a ceiling sized well above any plausible legitimate event-traffic
 * peak (see convex/leads.ts's OWNER_AGGREGATE_MAX comment for the number's
 * justification).
 */
test("createLead still enforces an aggregate per-owner cap even when every call uses a fresh visitorId", async () => {
  const t = convexTest(schema);
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "flood-owner@test.dev",
      clerkId: "flood_owner_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  for (let i = 0; i < 30; i++) {
    await t.action(api.leads.createLead, {
      ownerId,
      visitorId: `flood_visitor_${i}`,
      inquirerName: `Flood ${i}`,
      inquirerContact: `flood${i}@test.dev`,
    });
  }

  await expect(
    t.action(api.leads.createLead, {
      ownerId,
      visitorId: "flood_visitor_30",
      inquirerName: "Flood 30",
      inquirerContact: "flood30@test.dev",
    })
  ).rejects.toThrow(/too many requests/i);
});

/**
 * Task 18 / I3 — the same atomic-rollback bug fixed for convex/cards.ts in
 * Task 1: `createLead` wrote its rate-limit counters, then threw on invalid
 * input (empty name/contact) a few lines later in the SAME mutation. Convex
 * mutations are atomic, so that later throw rolled the counter write back
 * out right along with it — repeated invalid-input calls never actually
 * accumulated toward the limit, leaving that path completely unmetered no
 * matter how many times it was retried. This pins the fix: invalid-input
 * attempts must still count toward VISITOR_MAX, and the 6th must be
 * rejected for being rate-limited, not for the input defect.
 */
test("createLead's rate limit still accumulates across repeated invalid-input attempts", async () => {
  const t = convexTest(schema);
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "invalid-input-owner@test.dev",
      clerkId: "invalid_input_owner_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  // Exhaust VISITOR_MAX (5) with genuinely invalid input — the input defect
  // (blank name) is what a naive "checkRateLimit inlined at the top of one
  // throwing mutation" cannot actually meter, since every one of these
  // rejects with "Name and contact are required" in the same transaction as
  // the counter write.
  for (let i = 0; i < 5; i++) {
    await expect(
      t.action(api.leads.createLead, {
        ownerId,
        visitorId: "invalid_input_visitor",
        inquirerName: "",
        inquirerContact: "",
      })
    ).rejects.toThrow(/name and contact are required/i);
  }

  await expect(
    t.action(api.leads.createLead, {
      ownerId,
      visitorId: "invalid_input_visitor",
      inquirerName: "",
      inquirerContact: "",
    })
  ).rejects.toThrow(/too many requests/i);
});
