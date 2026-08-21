import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin } from "./admin";
import { requireUserMatching } from "./authz";
import { checkRateLimit } from "./rateLimit";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — generous ceiling above the 1MB client-side compression target.

// Any authenticated user may request an upload URL for their OWN
// avatar/gallery images — this is not, and never should have been, an
// admin-only action. It used to call requireAdmin, which broke upload for
// every non-admin caller of components/ui/image-uploader.tsx (onboarding
// photo step, builder Hero avatar) and app/dashboard/builder/page.tsx's
// GalleryUploader (Blocker #5, production audit). `clerkId` is an existing
// call-site convention (see authz.ts) — requireUserMatching authenticates
// AND verifies it against the real token subject, so it can't be spoofed.
export const generateUploadUrl = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    let user;
    try {
      user = await requireUserMatching(ctx, args.clerkId);
    } catch (error) {
      // Rethrow as ConvexError so a useful message survives production's
      // redaction of plain Error messages (see lib/errors.ts#toUserMessage,
      // which reads ConvexError.data first because it's the one channel
      // that crosses the client/server boundary intact).
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: error instanceof Error ? error.message : "Sign in required to upload images.",
      });
    }

    // Uploads are abuse-prone (storage cost, spam content) — throttle per
    // authenticated user, keyed by their trusted Convex id (not the
    // client-supplied clerkId string).
    //
    // This is a PLAIN mutation, not split into an action + internalMutation
    // the way convex/cards.ts's activation/claim flows are. That split
    // exists there because THOSE mutations can still throw, on
    // attacker-controlled input, AFTER the rate-limit write (a wrong
    // activation code, an already-claimed card) — and because Convex
    // mutations are atomic, that later throw would roll the rate-limit
    // write back out with it, so repeated guesses would never actually
    // accumulate toward the limit. Here, the only step left after the
    // rate-limit check is `ctx.storage.generateUploadUrl()`, which takes no
    // caller-supplied data and has no failure mode an attacker can trigger
    // — so there is nothing left in this handler that could roll the
    // rate-limit write back, and the plain-mutation form is safe.
    try {
      await checkRateLimit(ctx, `upload:${user._id}`, { max: 10, windowMs: 60_000 });
    } catch (error) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message:
          error instanceof Error
            ? error.message
            : "Too many uploads. Please try again in a moment.",
      });
    }

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
