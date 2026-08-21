import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
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
// URL, before the storageId is used anywhere else (onChange/onAdd in
// components/ui/image-uploader.tsx and the builder's GalleryUploader). This
// is what makes ALLOWED_CONTENT_TYPES/MAX_UPLOAD_BYTES actually enforced:
// generateUploadUrl's URL accepts any bytes the caller POSTs regardless of
// what the client-side compression step in lib/image-compression.ts claims
// — that check is UX only and trivially bypassable by posting directly to
// the upload URL (Security audit #2). Deletes the blob and throws
// (ConvexError, so the reason survives production's redaction of plain
// Error messages — see lib/errors.ts#toUserMessage) if it fails server-side
// validation.
//
// This is an ACTION, not a mutation: real server-side validation has to
// read the bytes actually sitting in storage, not metadata the client could
// have lied about — that's `ctx.storage.get()`, which returns the stored
// Blob (its `.type`/`.size` reflect what was really written, unlike a POST's
// self-reported Content-Type). `.get()` only exists on StorageActionWriter
// (actions/HTTP actions), not the StorageWriter mutations get — see
// convex/server's storage.d.ts. Client callers use useAction, not
// useMutation, but the calling convention is otherwise identical.
//
// Auth: an inline identity-subject check, NOT requireAdmin (the same bug
// Task 5 fixed on generateUploadUrl, this mutation's neighbour above) and
// not requireUserMatching either — actions don't have ctx.db, so there's no
// user document to look up here; verifying the caller IS who they claim
// (identity.subject === args.clerkId) is the whole of what this function
// needs to authorize deleting/keeping a storage blob.
export const validateUpload = action({
  args: { storageId: v.id("_storage"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in required to validate an upload.",
      });
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Upload not found" });
    }
    const result = validateMetadata(blob.type, blob.size);
    if (!result.valid) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "INVALID_UPLOAD", message: result.reason });
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
