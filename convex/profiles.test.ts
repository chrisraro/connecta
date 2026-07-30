import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

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

  const id = await asUser.mutation(api.profiles.createProfile, {
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
  const mk = (clerkId: string) =>
    t.withIdentity({ subject: clerkId }).mutation(api.profiles.createProfile, {
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
  const id = await asUser.mutation(api.profiles.createProfile, {
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
