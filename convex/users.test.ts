import { expect, test, vi } from "vitest";
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

  const result = await asUser.action(api.users.deleteMyAccount, {});
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
  const result = await asAttacker.action(api.users.deleteMyAccount, {});
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
    t.action(api.users.deleteMyAccount, {})
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

/**
 * Task 13 — the "individual" profile type's default componentOrder omitted
 * "Services" unconditionally, even though onboarding's own service-tag step
 * (app/dashboard/onboarding/page.tsx) is offered to every profile type and
 * writes real data into agentInfo.services. Combined with the (now-fixed)
 * save-time stripping bug in lib/profileSections.ts, this meant a fresh
 * individual profile's services were invisible from the moment onboarding
 * finished, and looked (from the Sections list) like a block the user had
 * chosen to hide — even though they never touched it. The block must be
 * included in the default layout whenever there's real data behind it, so
 * the user can actually see and manage what they just typed.
 */
test("updateOnboarding's individual-type default componentOrder includes Services when onboarding collected service tags", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "onboard_services_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "onboard_services@test.dev", clerkId: "onboard_services_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const result = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "onboard_services_user",
    profileCategory: "individual",
    email: "onboard_services@test.dev",
    fullName: "Services Person",
    title: "Freelancer",
    phone: "0917",
    services: ["Logo Design", "Web Design"],
    markCompleted: true,
  });

  const profile = await t.run(async (ctx) => ctx.db.get(result.profileId!));
  expect(profile?.layoutConfig.componentOrder).toContain("Services");
  // And the data itself is intact, not stripped.
  expect(profile?.agentInfo.services).toEqual(["Logo Design", "Web Design"]);
});

test("updateOnboarding's individual-type default componentOrder omits Services when onboarding collected none — unrelated defaults are unaffected", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "onboard_noservices_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "onboard_noservices@test.dev", clerkId: "onboard_noservices_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const result = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "onboard_noservices_user",
    profileCategory: "individual",
    email: "onboard_noservices@test.dev",
    fullName: "No Services Person",
    title: "Freelancer",
    phone: "0917",
    services: [],
    markCompleted: true,
  });

  const profile = await t.run(async (ctx) => ctx.db.get(result.profileId!));
  expect(profile?.layoutConfig.componentOrder).not.toContain("Services");
  expect(profile?.layoutConfig.componentOrder).toEqual([
    "Hero", "About", "Experience", "Education", "Projects", "Contact",
  ]);
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

/**
 * Task 17 / C3 — "Edit Profile Setup" (app/dashboard/onboarding/page.tsx's
 * `?edit=true` re-entry into the SAME wizard, after onboarding already
 * completed once) called `updateOnboarding` with `markCompleted: true` a
 * second time. The else branch at the old convex/users.ts:182-184 just
 * re-read `existingProfiles[0]._id` as `profileId` and returned it — never
 * patching agentInfo/profileType onto the live profile — so every field the
 * user just retyped (job title, phone, ...) was silently discarded while
 * the client still showed a success toast. These tests pin the fix: a
 * second `markCompleted: true` call against an existing profile must patch
 * that SAME row through the wizard's own data, not leave it untouched.
 */
test("updateOnboarding in edit mode patches the existing profile instead of leaving it untouched", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "edit_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "edit@test.dev", clerkId: "edit_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const first = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "edit_user",
    profileCategory: "individual",
    email: "edit@test.dev",
    fullName: "Edit Person",
    title: "Junior Designer",
    phone: "0917000001",
    services: [],
    markCompleted: true,
  });
  expect(first.profileId).not.toBeNull();

  // Re-enter the wizard via "Edit Profile Setup" and change title + phone —
  // exactly the brief's reproduction (C3).
  const second = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "edit_user",
    profileCategory: "individual",
    email: "edit@test.dev",
    fullName: "Edit Person",
    title: "Senior Designer",
    phone: "0917999999",
    services: [],
    markCompleted: true,
  });

  // Same profile, not a second one.
  expect(second.profileId).toBe(first.profileId);
  const allProfiles = await t.run(async (ctx) => ctx.db.query("profiles").collect());
  expect(allProfiles.length).toBe(1);

  const profile = await t.run(async (ctx) => ctx.db.get(second.profileId!));
  expect(profile?.agentInfo.title).toBe("Senior Designer");
  expect(profile?.agentInfo.phone).toBe("0917999999");
});

test("updateOnboarding in edit mode preserves agentInfo fields the wizard never collects (e.g. socialLinks added later in the builder)", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "edit_preserve_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "edit_preserve@test.dev", clerkId: "edit_preserve_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const first = await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "edit_preserve_user",
    profileCategory: "individual",
    email: "edit_preserve@test.dev",
    fullName: "Preserve Person",
    title: "Designer",
    phone: "0917000002",
    services: [],
    markCompleted: true,
  });

  // Simulate the builder adding data the onboarding wizard's UI never asks
  // for (app/dashboard/onboarding/page.tsx has no socialLinks field at all).
  await t.run(async (ctx) => {
    const profile = await ctx.db.get(first.profileId!);
    await ctx.db.patch(first.profileId!, {
      agentInfo: {
        ...profile!.agentInfo,
        socialLinks: [{ platform: "linkedin", url: "https://linkedin.com/in/preserve" }],
      },
    });
  });

  // Re-enter the wizard and change only the title.
  await asUser.mutation(api.users.updateOnboarding, {
    clerkId: "edit_preserve_user",
    profileCategory: "individual",
    email: "edit_preserve@test.dev",
    fullName: "Preserve Person",
    title: "Lead Designer",
    phone: "0917000002",
    services: [],
    markCompleted: true,
  });

  const profile = await t.run(async (ctx) => ctx.db.get(first.profileId!));
  expect(profile?.agentInfo.title).toBe("Lead Designer");
  // The wholesale-replace bug this test guards against: patching agentInfo
  // as a brand-new object (instead of merging onto the existing one) would
  // silently wipe socialLinks back to [] even though the wizard never
  // touched it.
  expect(profile?.agentInfo.socialLinks).toEqual([
    { platform: "linkedin", url: "https://linkedin.com/in/preserve" },
  ]);
});

test("deleteMyAccount rejects an unauthenticated caller", async () => {
  const t = convexTest(schema);
  await expect(
    t.action(api.users.deleteMyAccount, {})
  ).rejects.toThrow(/unauthorized/i);
});

test("deleteMyAccount returns physical cards to inventory instead of deleting them", async () => {
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "card_owner");
  const asUser = t.withIdentity({ subject: "card_owner" });

  const result = await asUser.action(api.users.deleteMyAccount, {});
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

  await asUser.action(api.users.deleteMyAccount, {});

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

/**
 * deleteMyAccount's Clerk identity deletion (Task 4 — the audit's Critical
 * finding: the Settings page claims permanent deletion "per privacy
 * regulations (RA 10173)" but never touched the Clerk identity, so signing
 * back in silently resurrected the "deleted" account via syncUser).
 *
 * deleteMyAccount is now an action: it erases Convex data through the same
 * internalEraseUserByClerkId mutation the webhook uses (atomic, idempotent),
 * then calls Clerk's Backend API to delete the identity itself. These tests
 * mock global fetch rather than hitting Clerk for real — there are live
 * accounts in this deployment and the test suite must never be able to
 * delete one.
 */
test("deleteMyAccount calls Clerk's Backend API DELETE /v1/users/{id} with the secret key when CLERK_SECRET_KEY is configured", async () => {
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_abc123");
  const t = convexTest(schema);
  await seedFullAccount(t, "clerk_delete_user");
  const asUser = t.withIdentity({ subject: "clerk_delete_user" });

  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(null, { status: 200 })
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await asUser.action(api.users.deleteMyAccount, {});

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.clerk.com/v1/users/clerk_delete_user");
  expect(init?.method).toBe("DELETE");
  expect((init?.headers as Record<string, string>)?.Authorization).toBe(
    "Bearer sk_test_abc123"
  );

  expect(result.success).toBe(true);
  expect(result.identityDeletion.status).toBe("deleted");

  vi.unstubAllGlobals();
});

test("deleteMyAccount degrades gracefully instead of reporting plain success when CLERK_SECRET_KEY is unset", async () => {
  // Empty string is falsy, same as an absent env var — this is the actual
  // production state today (CLERK_SECRET_KEY is unset in the deployment),
  // so this is the common path, not an edge case.
  vi.stubEnv("CLERK_SECRET_KEY", "");
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "no_secret_user");
  const asUser = t.withIdentity({ subject: "no_secret_user" });

  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const result = await asUser.action(api.users.deleteMyAccount, {});

  // Convex data must still be fully erased...
  expect(result.success).toBe(true);
  await t.run(async (ctx) => {
    expect(await ctx.db.get(seed.userId)).toBeNull();
  });

  // ...but the identity deletion must be surfaced as degraded, not silently
  // reported as a plain success — the Clerk identity is still live.
  expect(result.identityDeletion.status).toBe("pending_configuration");
  expect(result.identityDeletion.message.toLowerCase()).toContain("pending");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(errorSpy).toHaveBeenCalled();

  errorSpy.mockRestore();
  vi.unstubAllGlobals();
});

test("deleteMyAccount reports identity deletion as failed (not silent success) when Clerk's API call errors", async () => {
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_abc123");
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "clerk_fail_user");
  const asUser = t.withIdentity({ subject: "clerk_fail_user" });

  const fetchMock = vi.fn(
    async () => new Response("server error", { status: 500 })
  );
  vi.stubGlobal("fetch", fetchMock);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const result = await asUser.action(api.users.deleteMyAccount, {});

  // The Convex erasure already committed (it's a separate, prior mutation
  // call) — that must not be rolled back just because Clerk's API failed.
  expect(result.success).toBe(true);
  await t.run(async (ctx) => {
    expect(await ctx.db.get(seed.userId)).toBeNull();
  });
  expect(result.identityDeletion.status).toBe("failed");
  expect(errorSpy).toHaveBeenCalled();

  errorSpy.mockRestore();
  vi.unstubAllGlobals();
});

test("deleteMyAccount resolves with a failed identityDeletion (not a thrown exception) when the Clerk fetch call itself throws", async () => {
  // Distinct from the 500-response case above: here `fetch` never returns a
  // Response at all — it rejects, as it does for DNS failures, TLS errors,
  // timeouts, or Clerk being unreachable. Convex erasure already committed
  // in its own prior mutation call, so an uncaught throw here would leave
  // the action itself rejecting: the UI would show a generic failure and
  // never sign the user out, even though their data is already gone.
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_abc123");
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "clerk_network_error_user");
  const asUser = t.withIdentity({ subject: "clerk_network_error_user" });

  const fetchMock = vi.fn(async () => {
    throw new TypeError("fetch failed");
  });
  vi.stubGlobal("fetch", fetchMock);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const result = await asUser.action(api.users.deleteMyAccount, {});

  // The Convex erasure already committed — must not be treated as reverted
  // just because the network call afterward blew up.
  expect(result.success).toBe(true);
  await t.run(async (ctx) => {
    expect(await ctx.db.get(seed.userId)).toBeNull();
  });
  expect(result.identityDeletion.status).toBe("failed");
  expect(errorSpy).toHaveBeenCalled();

  errorSpy.mockRestore();
  vi.unstubAllGlobals();
});

test("deleteMyAccount treats a 404 from Clerk (identity already gone) as a completed deletion, not a failure", async () => {
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_abc123");
  const t = convexTest(schema);
  await seedFullAccount(t, "already_gone_user");
  const asUser = t.withIdentity({ subject: "already_gone_user" });

  const fetchMock = vi.fn(
    async () => new Response("not found", { status: 404 })
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await asUser.action(api.users.deleteMyAccount, {});

  expect(result.identityDeletion.status).toBe("deleted");

  vi.unstubAllGlobals();
});

/**
 * internalEraseUserByClerkId — the shared erasure primitive factored out of
 * deleteMyAccount so the Clerk webhook (convex/http.ts) can call the exact
 * same logic for accounts deleted outside the app (Clerk dashboard/API).
 * Idempotent: a clerkId with no matching Convex row is a no-op, not an
 * error, so a retried webhook delivery (or a clerkId that was never synced)
 * can't throw.
 */
test("internalEraseUserByClerkId is a no-op (not a throw) when no user row matches the clerkId", async () => {
  const t = convexTest(schema);

  const result = await t.mutation(internal.users.internalEraseUserByClerkId, {
    clerkId: "never_synced_user",
  });

  expect(result.success).toBe(true);
  expect(result.found).toBe(false);
  expect(result.cardsReturnedToInventory).toBe(0);
});

test("internalEraseUserByClerkId erases the matching user's data when called directly (the webhook's call shape)", async () => {
  const t = convexTest(schema);
  const seed = await seedFullAccount(t, "webhook_deleted_user");

  const result = await t.mutation(internal.users.internalEraseUserByClerkId, {
    clerkId: "webhook_deleted_user",
  });

  expect(result.found).toBe(true);
  await t.run(async (ctx) => {
    expect(await ctx.db.get(seed.userId)).toBeNull();
    expect(await ctx.db.get(seed.profileId)).toBeNull();
  });
});
