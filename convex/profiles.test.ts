import { expect, test } from "vitest";
import { convexTest } from "convex-test";
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
      email: "slug1@test.dev", clerkId: "slug_user_1", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const { id } = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "slug_user_1",
    name: "Christian Raro",
    agentInfo: {
      fullName: "Christian Raro", title: "Founder", company: "Herald",
      phone: "0917", email: "c@herald.ph", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"], heroStyle: "default",
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
        email: `dup${n}@test.dev`, clerkId: `dup_user_${n}`, role: "agent",
        subscriptionStatus: "active", plan: "free",
      });
    });
  }
  const mk = async (clerkId: string) => {
    const { id } = await t.withIdentity({ subject: clerkId }).mutation(api.profiles.createProfile, {
      clerkId,
      name: "Same Name",
      agentInfo: {
        fullName: "Same Name", title: "T", company: "C",
        phone: "0917", email: "s@test.dev", services: [], socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"], heroStyle: "default",
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
      email: "bs@test.dev", clerkId: "bs_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });
  const { id } = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "bs_user",
    name: "Bridget Solano",
    agentInfo: {
      fullName: "Bridget Solano", title: "Architect", company: "Solano",
      phone: "0917", email: "b@test.dev", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "architectural",
      colorPalette: { primary: "#1f3d5c", background: "#f7f8f9", text: "#16191c" },
      componentOrder: ["Hero"], heroStyle: "default",
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
      email: "legacy@test.dev", clerkId: "legacy_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
    // Simulate a pre-slug-feature row: inserted directly, bypassing
    // createProfile, so it has no `slug` — exactly like every profile that
    // existed before this feature shipped.
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Legacy Profile",
      agentInfo: {
        fullName: "Legacy Person", title: "Agent", company: "Old Co",
        phone: "0917", email: "legacy@old.dev", services: [], socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"], heroStyle: "default",
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
      fullName: "Legacy Person", title: "Agent", company: "Old Co",
      phone: "0917", email: "legacy@old.dev", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"], heroStyle: "default",
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
      email: "stable@test.dev", clerkId: "stable_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
  });

  const created = await asUser.mutation(api.profiles.createProfile, {
    clerkId: "stable_user",
    name: "Stable Name",
    agentInfo: {
      fullName: "Stable Name", title: "T", company: "C",
      phone: "0917", email: "stable@test.dev", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"], heroStyle: "default",
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
      fullName: "A Totally Different Name", title: "T", company: "C",
      phone: "0917", email: "stable@test.dev", services: [], socialLinks: [],
    },
    layoutConfig: {
      themeId: "editorial",
      colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
      componentOrder: ["Hero"], heroStyle: "default",
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
      email: "backfill@test.dev", clerkId: "backfill_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
    return await ctx.db.insert("profiles", {
      ownerId,
      name: "Needs A Slug",
      agentInfo: {
        fullName: "Needs A Slug", title: "Agent", company: "Old Co",
        phone: "0917", email: "needs@old.dev", services: [], socialLinks: [],
      },
      layoutConfig: {
        themeId: "editorial",
        colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
        componentOrder: ["Hero"], heroStyle: "default",
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
      email: "pager@test.dev", clerkId: "pager_user", role: "agent",
      subscriptionStatus: "active", plan: "free",
    });
    for (let i = 0; i < TOTAL; i++) {
      await ctx.db.insert("profiles", {
        ownerId,
        name: `Pager Person ${i}`,
        agentInfo: {
          fullName: `Pager Person ${i}`, title: "Agent", company: "Co",
          phone: "0917", email: `p${i}@old.dev`, services: [], socialLinks: [],
        },
        layoutConfig: {
          themeId: "editorial",
          colorPalette: { primary: "#7a5c34", background: "#fbf9f4", text: "#1f1d18" },
          componentOrder: ["Hero"], heroStyle: "default",
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
    const run: { backfilled: number; isDone: boolean; cursor: string | null } =
      await t.mutation(internal.profiles.internalBackfillSlugs, {
        cursor,
        batchSize: 3,
      });
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
