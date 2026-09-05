import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import schema from "./schema";
import { api, internal } from "./_generated/api";

test("getProfile resolves storage-id avatar and gallery images into resolvedImages", async () => {
  const t = convexTest(schema);
  const { profileId, storageId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner@test.dev",
      clerkId: "owner_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    const blob = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const storageId = await ctx.storage.store(blob);
    const profileId = await ctx.db.insert("profiles", {
      ownerId,
      name: "Test Profile",
      agentInfo: {
        fullName: "Jane Doe",
        title: "Designer",
        company: "Acme",
        phone: "0917",
        email: "jane@acme.test",
        avatarUrl: storageId,
        services: [],
        socialLinks: [],
        gallery: [storageId],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#000", background: "#fff", text: "#000" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
    return { profileId, storageId };
  });

  const profile = await t.query(api.profiles.getProfile, { profileId });

  expect(profile?.resolvedImages).toBeDefined();
  expect(profile?.resolvedImages?.[storageId]).toMatch(/^https?:\/\//);
});

test("getProfile leaves http/data/blob URLs out of resolvedImages (nothing to resolve)", async () => {
  const t = convexTest(schema);
  const profileId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "owner2@test.dev",
      clerkId: "owner2_clerk_id",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Test Profile 2",
      agentInfo: {
        fullName: "Jane Doe",
        title: "Designer",
        company: "Acme",
        phone: "0917",
        email: "jane@acme.test",
        avatarUrl: "https://example.com/avatar.jpg",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#000", background: "#fff", text: "#000" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  });

  const profile = await t.query(api.profiles.getProfile, { profileId });

  expect(Object.keys(profile?.resolvedImages ?? {}).length).toBe(0);
});

test("createProfile assigns a unique slug derived from the profile name", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "slug_user_1" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "slug1@test.dev",
      clerkId: "slug_user_1",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });

  const { id } = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "slug_user_1",
    name: "Christian Raro",
    agentInfo: {
      fullName: "Christian Raro",
      title: "Founder",
      company: "Riverside Media",
      phone: "0917",
      email: "c@connecta.example",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });

  const profile = await t.run(async (ctx) => ctx.db.get(id));
  expect(profile?.slug).toBeDefined();
  expect(profile?.slug).toMatch(/^christian-raro/);
});

test("a second profile with the same name gets a distinct slug", async () => {
  const t = convexTest(schema);
  for (const n of ["1", "2"]) {
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: `dup${n}@test.dev`,
        clerkId: `dup_user_${n}`,
        role: "agent",
        subscriptionStatus: "active",
        plan: "free",
      });
    });
  }
  const mk = async (clerkId: string) => {
    const { id } = await t.withIdentity({ subject: clerkId }).mutation(api.profiles.createProfile, {
      clerkId,
      name: "Same Name",
      agentInfo: {
        fullName: "Same Name",
        title: "T",
        company: "C",
        phone: "0917",
        email: "s@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
    return id;
  };

  const a = await mk("dup_user_1");
  const b = await mk("dup_user_2");
  const [pa, pb] = await t.run(async (ctx) => [await ctx.db.get(a), await ctx.db.get(b)]);
  expect(pa?.slug).toBeDefined();
  expect(pb?.slug).toBeDefined();
  expect(pa?.slug).not.toBe(pb?.slug);
});

test("getProfileBySlug resolves the same profile as getProfile", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "bs_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "bs@test.dev",
      clerkId: "bs_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  const { id } = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "bs_user",
    name: "Bridget Solano",
    agentInfo: {
      fullName: "Bridget Solano",
      title: "Architect",
      company: "Solano",
      phone: "0917",
      email: "b@test.dev",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "architectural",
      colorPalette: { primary: "#1f3d5c", background: "#f7f8f9", text: "#16191c" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });
  const profile = await t.run(async (ctx) => ctx.db.get(id));
  const bySlug = await t.query(api.profiles.getProfileBySlug, { slug: profile!.slug! });
  expect(bySlug?._id).toBe(id);
});

test("createProfile UPDATE assigns a slug to a legacy profile that has none", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "legacy_user" });
  const profileId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "legacy@test.dev",
      clerkId: "legacy_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    // Simulate a pre-slug-feature row: inserted directly, bypassing
    // createProfile, so it has no `slug` — exactly like every profile that
    // existed before this feature shipped.
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Legacy Profile",
      agentInfo: {
        fullName: "Legacy Person",
        title: "Agent",
        company: "Old Co",
        phone: "0917",
        email: "legacy@old.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  });

  const before = await t.run(async (ctx) => ctx.db.get(profileId));
  expect(before?.slug).toBeUndefined();

  const result = await asUser.mutation(api.profiles.createProfile, {
    id: profileId,
    clerkId: "legacy_user",
    name: "Legacy Profile",
    agentInfo: {
      fullName: "Legacy Person",
      title: "Agent",
      company: "Old Co",
      phone: "0917",
      email: "legacy@old.dev",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });

  expect(result.slug).toBeDefined();
  const after = await t.run(async (ctx) => ctx.db.get(profileId));
  expect(after?.slug).toBe(result.slug);
});

test("createProfile UPDATE never changes a slug that already exists", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "stable_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "stable@test.dev",
      clerkId: "stable_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });

  const created = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "stable_user",
    name: "Stable Name",
    agentInfo: {
      fullName: "Stable Name",
      title: "T",
      company: "C",
      phone: "0917",
      email: "stable@test.dev",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });
  const originalSlug = created.slug;
  expect(originalSlug).toBeDefined();

  // A published /<slug> URL may already be printed on a physical card — an
  // edit must never move it, even when the profile's name changes (which
  // would otherwise produce a different slugify() result).
  const updated = await asUser.mutation(api.profiles.createProfile, {
    id: created.id,
    clerkId: "stable_user",
    name: "A Totally Different Name",
    agentInfo: {
      fullName: "A Totally Different Name",
      title: "T",
      company: "C",
      phone: "0917",
      email: "stable@test.dev",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });

  expect(updated.slug).toBe(originalSlug);
  const profile = await t.run(async (ctx) => ctx.db.get(created.id));
  expect(profile?.slug).toBe(originalSlug);
});

test("internalBackfillSlugs assigns a slug to a slugless profile and is a no-op on the second run", async () => {
  const t = convexTest(schema);
  const profileId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "backfill@test.dev",
      clerkId: "backfill_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Needs A Slug",
      agentInfo: {
        fullName: "Needs A Slug",
        title: "Agent",
        company: "Old Co",
        phone: "0917",
        email: "needs@old.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  });

  const firstRun = await t.mutation(internal.profiles.internalBackfillSlugs, {});
  expect(firstRun.backfilled).toBe(1);

  const afterFirst = await t.run(async (ctx) => ctx.db.get(profileId));
  expect(afterFirst?.slug).toBeDefined();
  expect(afterFirst?.slug).toMatch(/^needs-a-slug/);

  const secondRun = await t.mutation(internal.profiles.internalBackfillSlugs, {});
  expect(secondRun.backfilled).toBe(0);

  const afterSecond = await t.run(async (ctx) => ctx.db.get(profileId));
  expect(afterSecond?.slug).toBe(afterFirst?.slug);
});

test("internalBackfillSlugs pages through every profile via its cursor", async () => {
  const t = convexTest(schema);
  const TOTAL = 7;
  await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "pager@test.dev",
      clerkId: "pager_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    for (let i = 0; i < TOTAL; i++) {
      await ctx.db.insert("profiles", {
        ownerId,
        name: `Pager Person ${i}`,
        agentInfo: {
          fullName: `Pager Person ${i}`,
          title: "Agent",
          company: "Co",
          phone: "0917",
          email: `p${i}@old.dev`,
          services: [],
          socialLinks: [],
        },
        layoutConfig: {
          themeId: "editorial",
          colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
          componentOrder: ["Hero"],
          heroStyle: "default",
        },
        featuredProperties: [],
      });
    }
  });

  // Batch size below TOTAL, so completing requires following the cursor.
  let cursor: string | null = null;
  let backfilled = 0;
  let pages = 0;
  for (;;) {
    const run: { backfilled: number; isDone: boolean; cursor: string | null } = await t.mutation(
      internal.profiles.internalBackfillSlugs,
      {
        cursor,
        batchSize: 3,
      },
    );
    backfilled += run.backfilled;
    pages++;
    if (run.isDone) break;
    cursor = run.cursor;
    if (pages > 10) throw new Error("cursor did not terminate");
  }

  expect(pages).toBeGreaterThan(1);
  expect(backfilled).toBe(TOTAL);

  const slugs = await t.run(async (ctx) => {
    const all = await ctx.db.query("profiles").collect();
    return all.map((p) => p.slug);
  });
  expect(slugs.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
  expect(new Set(slugs).size).toBe(TOTAL);
});

test("slug derives from the person's name, not the \"X's Profile\" record label", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "derive_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "derive@test.dev",
      clerkId: "derive_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });

  const { slug } = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "derive_user",
    // Exactly what the builder writes: "<fullName>'s Profile".
    name: "Christian Raro's Profile",
    agentInfo: {
      fullName: "Christian Raro",
      title: "Developer",
      company: "Riverside Media",
      phone: "0917",
      email: "c@test.dev",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });

  expect(slug).toBe("christian-raro");
  expect(slug).not.toContain("profile");
});

test("internalBackfillSlugs re-slugs a stale possessive slug only when asked", async () => {
  const t = convexTest(schema);
  const profileId = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "stale@test.dev",
      clerkId: "stale_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Judy Ann Balilla's Profile",
      slug: "judy-ann-balillas-profile", // legacy derivation
      agentInfo: {
        fullName: "Judy Ann Balilla",
        title: "Teacher",
        company: "NCF",
        phone: "0917",
        email: "j@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  });

  // Default run must NOT touch an existing slug.
  const noop = await t.mutation(internal.profiles.internalBackfillSlugs, {});
  expect(noop.reslugged).toBe(0);
  const unchanged = await t.run(async (ctx) => ctx.db.get(profileId));
  expect(unchanged?.slug).toBe("judy-ann-balillas-profile");

  // Explicit opt-in rewrites it.
  const run = await t.mutation(internal.profiles.internalBackfillSlugs, {
    reslugExisting: true,
  });
  expect(run.reslugged).toBe(1);
  const after = await t.run(async (ctx) => ctx.db.get(profileId));
  expect(after?.slug).toBe("judy-ann-balilla");

  // Second opt-in run is a no-op — already ideal.
  const second = await t.mutation(internal.profiles.internalBackfillSlugs, {
    reslugExisting: true,
  });
  expect(second.reslugged).toBe(0);
});

// Profile-count gating (createProfile, convex/profiles.ts:304-313): a free
// plan's `maxProfiles: 1` is enforced only when `!args.id` — i.e. only when
// the caller is creating a brand-new profile, never when patching an
// existing one. Before this pair, NOTHING in the suite ever asserted the
// reject path actually throws, or that the `!args.id` guard is what keeps
// edits of an existing at-limit profile working. Without this coverage, a
// refactor that dropped or inverted the `!args.id` condition would either
// silently re-enable unlimited free profiles (reject path lost) or silently
// lock a free user out of ever editing their own single profile again
// (patch path broken) — and the test suite would stay green either way.
test("createProfile REJECTS creating a second profile for a free-plan user already at the 1-profile limit", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "limit_user_reject" });
  const ownerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "limit_reject@test.dev",
      clerkId: "limit_user_reject",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
  // Seed ONE existing profile directly, so the free plan's maxProfiles:1
  // is already consumed before the mutation under test runs.
  await t.run(async (ctx) => {
    await ctx.db.insert("profiles", {
      ownerId,
      name: "Existing Profile",
      agentInfo: {
        fullName: "Existing Person",
        title: "Agent",
        company: "Co",
        phone: "0917",
        email: "existing_reject@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  });

  // No `id` supplied -> createProfile treats this as a request to create a
  // NEW (second) profile -> must be rejected. Asserted as a ConvexError
  // (not a message regex) for the same reason cards.test.ts's
  // DUPLICATE_UUID test does: a plain `Error` here would be redacted to
  // "Server Error" on a real production deployment, and the billing UI's
  // "Get Pro" CTA (lib/plans.ts#isPlanLimitError) keys off
  // `ConvexError.data.code`, never message text.
  let caught: unknown;
  try {
    await asUser.mutation(api.profiles.createProfile, {
      clerkId: "limit_user_reject",
      name: "Second Profile",
      agentInfo: {
        fullName: "Second Person",
        title: "Agent",
        company: "Co",
        phone: "0917",
        email: "second_reject@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(ConvexError);
  expect((caught as InstanceType<typeof ConvexError>).data).toMatchObject({
    code: "PLAN_LIMIT",
    message: "Upgrade to Pro for unlimited profiles.",
  });
});

test("createProfile REJECTS a free-plan user selecting a Pro-only template, with a ConvexError PLAN_LIMIT data code", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "template_lock_user" });
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email: "template_lock@test.dev",
      clerkId: "template_lock_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });

  let caught: unknown;
  try {
    await asUser.mutation(api.profiles.createProfile, {
      clerkId: "template_lock_user",
      name: "Kinetic Profile",
      agentInfo: {
        fullName: "Kinetic Person",
        title: "Agent",
        company: "Co",
        phone: "0917",
        email: "kinetic@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        // "kinetic" is Pro/Business-only — free's allowedTemplateIds is
        // ["editorial", "architectural"] (convex/plans.ts).
        themeId: "kinetic",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(ConvexError);
  expect((caught as InstanceType<typeof ConvexError>).data).toMatchObject({
    code: "PLAN_LIMIT",
    message: "This template is available on Pro & Business. Upgrade to unlock all templates.",
  });
});

test("createProfile does NOT reject the SAME at-limit free-plan user patching their existing profile (WITH id)", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "limit_user_patch" });
  const { ownerId, profileId } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", {
      email: "limit_patch@test.dev",
      clerkId: "limit_user_patch",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
    const profileId = await ctx.db.insert("profiles", {
      ownerId,
      name: "Existing Profile",
      agentInfo: {
        fullName: "Existing Person",
        title: "Agent",
        company: "Co",
        phone: "0917",
        email: "existing_patch@test.dev",
        services: [],
        socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"],
        heroStyle: "default",
      },
      featuredProperties: [],
    });
    return { ownerId, profileId };
  });

  // Same user, same at-limit account, but `id` IS supplied -> this is a
  // patch of the existing profile, not a new one -> the count-check must
  // stay open (complement of the reject test above).
  const result = await asUser.mutation(api.profiles.createProfile, {
    id: profileId,
    clerkId: "limit_user_patch",
    name: "Existing Profile (edited)",
    agentInfo: {
      fullName: "Existing Person",
      title: "Agent",
      company: "Co",
      phone: "0917",
      email: "existing_patch@test.dev",
      services: [],
      socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"],
      heroStyle: "default",
    },
    featuredProperties: [],
  });

  expect(result.id).toBe(profileId);
  const stillOne = await t.run(async (ctx) =>
    ctx.db
      .query("profiles")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect(),
  );
  expect(stillOne.length).toBe(1);
});
