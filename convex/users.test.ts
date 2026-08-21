import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal, api } from "./_generated/api";
import { DEFAULT_DIGITAL_CARD } from "../lib/digitalCard";

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

/**
 * deleteMyAccount — RA 10173 erasure right.
 *
 * Seeds one user with a document in every table `deleteMyAccount` is
 * supposed to touch (plus one it must never touch — auditLogs), and a
 * second, untouched user, so cross-account leakage is provable rather than
 * assumed.
 */
async function seedFullAccount(
  t: ReturnType<typeof convexTest>,
  clerkId: string
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `${clerkId}@test.dev`,
      clerkId,
      name: "Delete Me",
      role: "agent",
      subscriptionStatus: "active",
      plan: "pro",
    });

    const profileId = await ctx.db.insert("profiles", {
      ownerId: userId,
      name: "Delete Me's Profile",
      agentInfo: {
        fullName: "Delete Me",
        title: "Agent",
        company: "Acme",
        phone: "0917",
        email: `${clerkId}@test.dev`,
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
    });

    const cardId = await ctx.db.insert("cards", {
      ownerId: userId,
      uuid: `uuid-${clerkId}`,
      activationCode: `code-${clerkId}`,
      status: "active",
      linkedProfileId: profileId,
      tapCount: 42,
    });

    const leadId = await ctx.db.insert("leads", {
      ownerId: userId,
      inquirerName: "A Stranger",
      inquirerContact: "stranger@test.dev",
      status: "new",
      createdAt: Date.now(),
    });

    const notificationId = await ctx.db.insert("notifications", {
      userId,
      type: "new_lead",
      read: false,
      title: "New lead",
      message: "Someone tapped your card",
      createdAt: Date.now(),
    });

    const propertyId = await ctx.db.insert("properties", {
      ownerId: userId,
      title: "Nice Lot",
      price: 1000000,
      status: "for-sale",
      type: "lot-only",
      images: [],
    });

    const projectId = await ctx.db.insert("projects", {
      ownerId: userId,
      title: "A Project",
      category: "other",
      tags: [],
      images: [],
      featured: false,
      createdAt: Date.now(),
    });

    const cartId = await ctx.db.insert("carts", {
      userId,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const invoiceId = await ctx.db.insert("subscriptionInvoices", {
      userId,
      plan: "pro",
      amountCentavos: 29900,
      periodDays: 30,
      status: "paid",
      createdAt: Date.now(),
    });

    const orderId = await ctx.db.insert("orders", {
      orderNumber: `TF-${clerkId}`,
      userId,
      status: "delivered",
      items: [],
      subtotal: 100,
      tax: 0,
      shipping: 0,
      total: 100,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "paid",
      shippingAddress: {
        fullName: "Delete Me",
        addressLine1: "123 Street",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "0917",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const adminId = await ctx.db.insert("admins", {
      userId,
      role: "moderator",
      grantedBy: userId,
      grantedAt: Date.now(),
    });

    const priorAuditLogId = await ctx.db.insert("auditLogs", {
      userId,
      action: "update",
      resourceType: "profile",
      resourceId: String(profileId),
      timestamp: Date.now(),
    });

    return {
      userId,
      profileId,
      cardId,
      leadId,
      notificationId,
      propertyId,
      projectId,
      cartId,
      invoiceId,
      orderId,
      adminId,
      priorAuditLogId,
    };
  });
}

test("deleteMyAccount erases the caller's own data across every referencing table", async () => {
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "delete_self");
  const asUser = t.withIdentity({ subject: "delete_self" });

  const result = await asUser.mutation(api.users.deleteMyAccount, {});
  expect(result.success).toBe(true);

  await t.run(async (ctx) => {
    expect(await ctx.db.get(seed.userId)).toBeNull();
    expect(await ctx.db.get(seed.profileId)).toBeNull();
    expect(await ctx.db.get(seed.leadId)).toBeNull();
    expect(await ctx.db.get(seed.notificationId)).toBeNull();
    expect(await ctx.db.get(seed.propertyId)).toBeNull();
    expect(await ctx.db.get(seed.projectId)).toBeNull();
    expect(await ctx.db.get(seed.cartId)).toBeNull();
    expect(await ctx.db.get(seed.invoiceId)).toBeNull();
    expect(await ctx.db.get(seed.orderId)).toBeNull();
    expect(await ctx.db.get(seed.adminId)).toBeNull();
  });
});

test("deleteMyAccount cannot delete another user's account or data", async () => {
  const t = convexTest(schema);
  const victim = await seedFullAccount(t, "victim_user");
  const attacker = await seedFullAccount(t, "attacker_user");

  // The mutation takes no target-id argument at all — the caller can only
  // ever be resolved from their own authenticated identity. Calling it as
  // the attacker must leave the victim completely untouched.
  const asAttacker = t.withIdentity({ subject: "attacker_user" });
  const result = await asAttacker.mutation(api.users.deleteMyAccount, {});
  expect(result.success).toBe(true);

  await t.run(async (ctx) => {
    // Attacker's own data is gone.
    expect(await ctx.db.get(attacker.userId)).toBeNull();
    expect(await ctx.db.get(attacker.profileId)).toBeNull();

    // Victim is completely unaffected.
    expect(await ctx.db.get(victim.userId)).not.toBeNull();
    expect(await ctx.db.get(victim.profileId)).not.toBeNull();
    expect(await ctx.db.get(victim.leadId)).not.toBeNull();
    expect(await ctx.db.get(victim.cardId)).not.toBeNull();
    expect(await ctx.db.get(victim.orderId)).not.toBeNull();
  });

  // And a follow-up call cannot reach the victim by any means — there is no
  // id argument to pass, so the only way to delete the victim is to
  // authenticate as the victim.
  await expect(
    t.mutation(api.users.deleteMyAccount, {})
  ).rejects.toThrow(/unauthorized/i);
});

/**
 * updateOnboarding's first-completion profile auto-create — Task 12.
 *
 * Before this fix, `updateOnboarding` inserted the user's first profile
 * directly (`ctx.db.insert("profiles", …)`), bypassing `createProfile`
 * entirely. That produced a profile with no `slug` (public link stuck at
 * `/p/<convexId>`) and no `digitalCard`, structurally different from any
 * profile the builder itself creates. These tests pin the fix: onboarding
 * completion must go through the same write path (`insertNewProfile`,
 * shared with `createProfile`) and produce an identically-shaped row.
 */
test("updateOnboarding's first-completion profile gets a real slug, not the blank onboarding default", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "onboard_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "onboard@test.dev", clerkId: "onboard_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const result = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "onboard_user",
    profileCategory: "individual",
    email: "onboard@test.dev",
    fullName: "Onboard Person",
    title: "Designer",
    phone: "0917",
    services: [],
    markCompleted: true,
  });

  expect(result.profileId).not.toBeNull();
  const profile = await t.run(async (ctx) => ctx.db.get(result.profileId!));
  expect(profile?.slug).toBeDefined();
  expect(profile?.slug).toMatch(/^onboard-person/);
});

test("updateOnboarding's first-completion profile gets a seeded digitalCard, matching a builder-created profile's shape", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "onboard_card_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "onboard_card@test.dev", clerkId: "onboard_card_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const result = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "onboard_card_user",
    profileCategory: "business",
    email: "onboard_card@test.dev",
    fullName: "Card Person",
    title: "Owner",
    phone: "0917",
    services: [],
    markCompleted: true,
  });

  const profile = await t.run(async (ctx) => ctx.db.get(result.profileId!));
  expect(profile?.digitalCard).toEqual(DEFAULT_DIGITAL_CARD);
});

test("updateOnboarding does not consume a second profile slot when the builder later edits the same profile", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "chain_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "chain@test.dev", clerkId: "chain_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const { profileId } = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "chain_user",
    profileCategory: "individual",
    email: "chain@test.dev",
    fullName: "Chain Person",
    title: "Freelancer",
    phone: "0917",
    services: [],
    markCompleted: true,
  });
  expect(profileId).not.toBeNull();

  // The builder's first Save after onboarding — exactly what used to throw
  // "Upgrade to Pro for unlimited profiles." when the auto-created profile
  // (uncounted-for by the caller) plus this "new" one exceeded the free
  // plan's maxProfiles: 1. Passing the real id (Task 12 fix #2) makes this
  // an EDIT, not a second create, so it must succeed.
  await expect(
    asUser.mutation(api.profiles.createProfile, {
      id: profileId! as never,
      clerkId: "chain_user",
      name: "Chain Person's Profile",
      profileType: "individual",
      agentInfo: {
        fullName: "Chain Person", title: "Freelancer", company: "",
        phone: "0917", email: "chain@test.dev", services: [], socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#705838", background: "#fbf9f4", text: "#1b1c19" },
        componentOrder: ["Hero", "About", "Experience", "Education", "Projects", "Contact"],
        heroStyle: "default",
      },
      featuredProperties: [],
    })
  ).resolves.not.toThrow();

  const allProfiles = await t.run(async (ctx) =>
    ctx.db.query("profiles").collect()
  );
  expect(allProfiles.length).toBe(1);
});

test("deleteMyAccount rejects an unauthenticated caller", async () => {
  const t = convexTest(schema);
  await expect(
    t.mutation(api.users.deleteMyAccount, {})
  ).rejects.toThrow(/unauthorized/i);
});

test("deleteMyAccount returns physical cards to inventory instead of deleting them", async () => {
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "card_owner");
  const asUser = t.withIdentity({ subject: "card_owner" });

  const result = await asUser.mutation(api.users.deleteMyAccount, {});
  expect(result.cardsReturnedToInventory).toBe(1);

  const card = await t.run(async (ctx) => ctx.db.get(seed.cardId));
  expect(card).not.toBeNull();
  expect(card?.status).toBe("inventory");
  expect(card?.linkedProfileId).toBeUndefined();
  expect(card?.tapCount).toBe(0);
  // The card is no longer owned by a deleted user's foreign key in spirit,
  // but the row itself (and its uuid/activation code) survives untouched.
  expect(card?.uuid).toBe("uuid-card_owner");
});

test("deleteMyAccount retains auditLogs, including a new entry for the deletion itself", async () => {
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "audited_user");
  const asUser = t.withIdentity({ subject: "audited_user" });

  await asUser.mutation(api.users.deleteMyAccount, {});

  const logs = await t.run(async (ctx) =>
    ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", seed.userId))
      .collect()
  );

  // The pre-existing log survives...
  expect(logs.some((l) => l._id === seed.priorAuditLogId)).toBe(true);
  // ...and a new "delete" entry for the account itself was added, not
  // skipped, even though its own subject is about to be removed.
  const deletionLog = logs.find(
    (l) => l.action === "delete" && l.resourceType === "user"
  );
  expect(deletionLog).toBeDefined();
  expect(deletionLog?.resourceId).toBe(String(seed.userId));
});
