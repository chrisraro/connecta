import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin } from "./admin";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — generous ceiling above the 1MB client-side compression target.

export const generateUploadUrl = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is an admin
    await requireAdmin(ctx, args.clerkId);

    // Generate upload URL for authenticated admin users
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return uploadUrl;
  },
});

// Pure validation logic, exposed as an internal mutation purely so it's
// independently testable; also called directly (not via ctx.runMutation)
// from validateUpload below.
export const validateUploadMetadata = internalMutation({
  args: { contentType: v.string(), size: v.number() },
  handler: async (_ctx, args) => {
    return validateMetadata(args.contentType, args.size);
  },
});

function validateMetadata(
  contentType: string,
  size: number
): { valid: true } | { valid: false; reason: string } {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return { valid: false, reason: `Unsupported content type: ${contentType}` };
  }
  if (size > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      reason: `File size too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`,
    };
  }
  return { valid: true };
}

// Called by the client immediately after a successful POST to the upload
// URL, before the storageId is used anywhere else. Deletes the blob and
// throws if it fails server-side validation — the client-side check in
// lib/image-compression.ts is UX only and is trivially bypassable by
// posting directly to the upload URL (Security audit #2).
export const validateUpload = mutation({
  args: { storageId: v.id("_storage"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error("Upload not found");
    }
    const result = validateMetadata(metadata.contentType ?? "", metadata.size);
    if (!result.valid) {
      await ctx.storage.delete(args.storageId);
      throw new Error(result.reason);
    }
    return { success: true };
  },
});

export const getImageUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        try {
            const url = await ctx.storage.getUrl(args.storageId);
            return url;
        } catch (error) {
            console.error("Failed to get image URL:", error);
            return null;
        }
    },
});
