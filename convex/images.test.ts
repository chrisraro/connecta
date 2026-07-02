import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

test("validateUpload rejects a file over the size limit", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/png",
    size: 6 * 1024 * 1024,
  });
  expect(result.valid).toBe(false);
  expect(result.reason).toMatch(/size/i);
});

test("validateUpload rejects a disallowed content type", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.images.validateUploadMetadata, {
    contentType: "image/svg+xml",
    size: 1024,
  });
  expect(result.valid).toBe(false);
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
