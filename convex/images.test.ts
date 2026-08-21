import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import schema from "./schema";
import { internal, api } from "./_generated/api";

async function seedNonAdminUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: "user@test.dev",
      clerkId: "user_clerk",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    });
  });
}

test("generateUploadUrl returns an upload URL for a non-admin authenticated user", async () => {
  // Regression test: generateUploadUrl used to call requireAdmin, which
  // broke avatar/gallery upload for every non-admin caller of
  // components/ui/image-uploader.tsx and the builder's GalleryUploader —
  // i.e. every regular user (Blocker #5 / production audit). This must
  // succeed for a plain, non-admin, authenticated user.
  const t = convexTest(schema);
  await seedNonAdminUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  const uploadUrl = await asUser.mutation(api.images.generateUploadUrl, {
    clerkId: "user_clerk",
  });

  expect(typeof uploadUrl).toBe("string");
  expect(uploadUrl.length).toBeGreaterThan(0);
});

test("generateUploadUrl rejects an unauthenticated caller", async () => {
  const t = convexTest(schema);
  await seedNonAdminUser(t);

  await expect(
    t.mutation(api.images.generateUploadUrl, { clerkId: "user_clerk" })
  ).rejects.toThrow();
});

test("generateUploadUrl rejects a caller whose clerkId doesn't match their token", async () => {
  const t = convexTest(schema);
  await seedNonAdminUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  await expect(
    asUser.mutation(api.images.generateUploadUrl, { clerkId: "someone_else" })
  ).rejects.toThrow();
});

test("generateUploadUrl still succeeds for an admin caller", async () => {
  // The fix must not trade one broken group for another: admins are also
  // just authenticated users of generateUploadUrl now (it no longer calls
  // requireAdmin at all), so an admin identity must keep working.
  const t = convexTest(schema);
  await t.run(async (ctx) => {
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
  });
  const asAdmin = t.withIdentity({ subject: "admin_clerk" });

  const uploadUrl = await asAdmin.mutation(api.images.generateUploadUrl, {
    clerkId: "admin_clerk",
  });

  expect(typeof uploadUrl).toBe("string");
  expect(uploadUrl.length).toBeGreaterThan(0);
});

test("generateUploadUrl rate-limits repeated calls from the same user", async () => {
  const t = convexTest(schema);
  await seedNonAdminUser(t);
  const asUser = t.withIdentity({ subject: "user_clerk" });

  // Exhaust the limit, then confirm the next call is rejected with a
  // structured ConvexError (not a redaction-prone plain Error — see
  // lib/errors.ts#toUserMessage, which prefers ConvexError.data because
  // plain Error messages get wiped to "Server Error" in production).
  let caught: unknown;
  try {
    for (let i = 0; i < 25; i++) {
      await asUser.mutation(api.images.generateUploadUrl, { clerkId: "user_clerk" });
    }
  } catch (err) {
    caught = err;
  }

  expect(caught).toBeInstanceOf(ConvexError);
  expect((caught as InstanceType<typeof ConvexError>).data).toMatchObject({
    code: "RATE_LIMITED",
  });
});

test("validateUpload rejects a file over the size limit", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/png",
    size: 6 * 1024 * 1024,
  });
  expect(result.valid).toBe(false);
  // Narrow the discriminated union — `reason` only exists on the invalid arm.
  if (result.valid) throw new Error("expected the oversized upload to be rejected");
  expect(result.reason).toMatch(/size/i);
});

test("validateUpload rejects a disallowed content type", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/svg+xml",
    size: 1024,
  });
  expect(result.valid).toBe(false);
  // Narrow the discriminated union — `reason` only exists on the invalid arm.
  if (result.valid) throw new Error("expected the disallowed content type to be rejected");
  expect(result.reason).toMatch(/type/i);
});

test("validateUpload accepts a small jpeg", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/jpeg",
    size: 512 * 1024,
  });
  expect(result.valid).toBe(true);
});
