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
