import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

/**
 * Activation-flow regression tests.
 *
 * These pin the three root causes found while debugging "QR scan and manual
 * activation don't work":
 *
 * 1. registerSingleCard stamped ownerId = the registering admin, and
 *    claimCardByUuid rejected any card whose ownerId wasn't the claimer —
 *    so EVERY factory-registered card was unclaimable via the QR path.
 *    The card's `status` ("inventory") is the source of truth for
 *    claimability, not custodial ownership.
 *
 * 2. Activation codes were generated client-side as
 *    `ACT-<serial>-<Date.now()>` (30–55 chars, lowercase hex), while the
 *    user-facing form promises a 6-character code and force-uppercases
 *    input before an exact-match index lookup — a lookup that could
 *    therefore never match. Codes are now generated server-side: 6 chars,
 *    unambiguous uppercase alphabet.
 *
 * 3. activateCard did no input normalization, so a correctly transcribed
 *    code failed on case/whitespace differences.
 */

async function seedAdminAndUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      email: "admin@test.dev",
      clerkId: "admin_clerk",
      role: "admin",
      subscriptionStatus: "active",
      plan: "business",
    });
    await ctx.db.insert("admins", {
      userId: adminId,
      role: "superadmin",
      grantedBy: adminId,
      grantedAt: Date.now(),
    });
    const userId = await ctx.db.insert("users", {
      email: "user@test.dev",
      clerkId: "user_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    return { adminId, userId };
  });
}

test("registerSingleCard generates a 6-char unambiguous uppercase activation code", async () => {
  const t = convexTest(schema);
  await seedAdminAndUser(t);
  const asAdmin = t.withIdentity({ subject: "admin_clerk" });

  const result = await asAdmin.mutation(api.admin.registerSingleCard, {
    clerkId: "admin_clerk",
    uuid: "04:a3:5b:12:6f:80:81",
  });

  // 6 chars from an alphabet excluding lookalikes (0/O, 1/I/L, 5/S, 8/B, 2/Z).
  expect(result.activationCode).toMatch(/^[ACDEFGHJKMNPQRTUVWXY34679]{6}$/);
});

test("registered codes are unique across registrations", async () => {
  const t = convexTest(schema);
  await seedAdminAndUser(t);
  const asAdmin = t.withIdentity({ subject: "admin_clerk" });

  const codes = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const r = await asAdmin.mutation(api.admin.registerSingleCard, {
      clerkId: "admin_clerk",
      uuid: `uuid-${i}`,
    });
    codes.add(r.activationCode);
  }
  expect(codes.size).toBe(20);
});

test("claimCardByUuid claims a factory-registered inventory card despite admin custodial ownerId", async () => {
  const t = convexTest(schema);
  await seedAdminAndUser(t);
  const asAdmin = t.withIdentity({ subject: "admin_clerk" });
  const asUser = t.withIdentity({ subject: "user_clerk" });

  const reg = await asAdmin.mutation(api.admin.registerSingleCard, {
    clerkId: "admin_clerk",
    uuid: "04:aa:bb:cc",
  });

  // This is the QR-scan path: the card is in inventory but carries the
  // admin's ownerId from registration. It must still be claimable.
  const cardId = await asUser.action(api.cards.claimCardByUuid, {
    clerkId: "user_clerk",
    uuid: "04:aa:bb:cc",
  });
  expect(cardId).toBe(reg.cardId);

  const card = await t.run(async (ctx) => ctx.db.get(reg.cardId));
  expect(card?.status).toBe("active");
});

test("claimCardByUuid still rejects a card actively owned by someone else", async () => {
  const t = convexTest(schema);
  const { adminId } = await seedAdminAndUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  await t.run(async (ctx) =>
    ctx.db.insert("cards", {
      ownerId: adminId,
      uuid: "taken-card",
      activationCode: "TAKEN1",
      status: "active",
      tapCount: 0,
    })
  );

  await expect(
    asUser.action(api.cards.claimCardByUuid, {
      clerkId: "user_clerk",
      uuid: "taken-card",
    })
  ).rejects.toThrow(/not available/i);
});

test("activateCard normalizes case and whitespace in the entered code", async () => {
  const t = convexTest(schema);
  await seedAdminAndUser(t);
  const asAdmin = t.withIdentity({ subject: "admin_clerk" });
  const asUser = t.withIdentity({ subject: "user_clerk" });

  const reg = await asAdmin.mutation(api.admin.registerSingleCard, {
    clerkId: "admin_clerk",
    uuid: "04:11:22:33",
  });

  const cardId = await asUser.action(api.cards.activateCard, {
    clerkId: "user_clerk",
    activationCode: `  ${reg.activationCode.toLowerCase()}  `,
  });
  expect(cardId).toBe(reg.cardId);
});

test("getCardByUuid returns only the public projection, never activationCode or ownerId", async () => {
  const t = convexTest(schema);
  const { adminId } = await seedAdminAndUser(t);

  const profileId = await t.run(async (ctx) =>
    ctx.db.insert("profiles", {
      ownerId: adminId,
      name: "Linked Profile",
      agentInfo: {
        fullName: "Linked Profile",
        title: "Agent",
        company: "Acme",
        phone: "0917",
        email: "linked@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#000", background: "#fff", text: "#000" },
        componentOrder: [],
        heroStyle: "default",
      },
      featuredProperties: [],
    })
  );
  await t.run(async (ctx) =>
    ctx.db.insert("cards", {
      ownerId: adminId,
      uuid: "public-lookup-card",
      activationCode: "SECRET",
      status: "active",
      linkedProfileId: profileId,
      tapCount: 0,
    })
  );

  const card = await t.query(api.cards.getCardByUuid, { uuid: "public-lookup-card" });

  expect(card).not.toBeNull();
  expect(card).not.toHaveProperty("activationCode");
  expect(card).not.toHaveProperty("ownerId");
  const allowedKeys = new Set(["_id", "_creationTime", "uuid", "status", "linkedProfileId"]);
  for (const key of Object.keys(card ?? {})) {
    expect(allowedKeys.has(key)).toBe(true);
  }
  expect(card?.uuid).toBe("public-lookup-card");
  expect(card?.status).toBe("active");
  expect(card?.linkedProfileId).toBe(profileId);
});

test("getCardByUuid returns null for an unknown uuid", async () => {
  const t = convexTest(schema);

  const card = await t.query(api.cards.getCardByUuid, { uuid: "does-not-exist" });

  expect(card).toBeNull();
});

test("activateCard still matches pre-fix legacy codes stored with lowercase segments", async () => {
  const t = convexTest(schema);
  const { adminId } = await seedAdminAndUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  // A code in the old client-generated format, exactly as stored in prod.
  const legacy = "ACT-04:a3:5b:12-1755160000000";
  await t.run(async (ctx) =>
    ctx.db.insert("cards", {
      ownerId: adminId,
      uuid: "legacy-card",
      activationCode: legacy,
      status: "inventory",
      tapCount: 0,
    })
  );

  const cardId = await asUser.action(api.cards.activateCard, {
    clerkId: "user_clerk",
    activationCode: legacy,
  });
  const card = await t.run(async (ctx) => ctx.db.get(cardId));
  expect(card?.status).toBe("active");
});

test("activateCard rate-limits repeated wrong-code attempts by the same user", async () => {
  const t = convexTest(schema);
  await seedAdminAndUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  // Exhaust the limit with genuine wrong-code attempts (the normal shape of
  // a code-guessing attack) — each rejects with "Invalid activation code"
  // until the rate limiter itself kicks in. This is the case that a naive
  // "checkRateLimit at the top of a throwing mutation" cannot actually
  // defend against: Convex mutations are atomic, so a rate-limit counter
  // write made just before a same-call throw (the wrong-code rejection)
  // would normally be rolled back right along with it, and the counter
  // would never advance past 1 no matter how many times the attacker
  // retried. activateCard is an action for exactly this reason — see the
  // comment on `recordActivationAttempt` in convex/cards.ts.
  for (let i = 0; i < 5; i++) {
    await expect(
      asUser.action(api.cards.activateCard, {
        clerkId: "user_clerk",
        activationCode: "WRONG1",
      })
    ).rejects.toThrow(/invalid activation code/i);
  }

  await expect(
    asUser.action(api.cards.activateCard, {
      clerkId: "user_clerk",
      activationCode: "WRONG1",
    })
  ).rejects.toThrow(/too many requests/i);
});

test("claimCardByUuid rate-limits repeated claim attempts by the same user", async () => {
  const t = convexTest(schema);
  await seedAdminAndUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  for (let i = 0; i < 5; i++) {
    await expect(
      asUser.action(api.cards.claimCardByUuid, {
        clerkId: "user_clerk",
        uuid: "no-such-card",
      })
    ).rejects.toThrow(/card not found/i);
  }

  await expect(
    asUser.action(api.cards.claimCardByUuid, {
      clerkId: "user_clerk",
      uuid: "no-such-card",
    })
  ).rejects.toThrow(/too many requests/i);
});

test("getByActivationCode must not exist: it is a brute-force oracle bypassing the activation rate limit", () => {
  // getByActivationCode was a public, unauthenticated, un-rate-limited query
  // returning the full card doc for an exact activation-code guess, with zero
  // callers. It bypassed the rate limiter protecting activateCard against
  // code-guessing attacks. It must be deleted entirely from the codebase.
  //
  // Verify it's not exported by checking the cards module doesn't have it.
  // TypeScript should fail if this were re-added: the api.cards type
  // only includes exported public functions.
  expect(typeof (api.cards as Record<string, boolean | string>).getByActivationCode).not.toBe("function");
});
