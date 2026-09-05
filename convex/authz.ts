import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Centralized Authorization Helpers
 *
 * SECURITY MODEL
 * --------------
 * The client historically passed a `clerkId` argument to most functions. That
 * is inherently spoofable: any caller can pass any clerkId. These helpers close
 * that hole by ALWAYS deriving the trusted identity from `ctx.auth` (the Clerk
 * JWT verified by Convex) and rejecting any request whose claimed clerkId does
 * not match the authenticated subject.
 *
 * Prefer `requireUser(ctx)` (no args, fully trusted) for new code. For existing
 * call sites that still pass `clerkId`, use `requireUserMatching(ctx, clerkId)`
 * which both authenticates AND verifies the claimed id matches the token.
 */

// Returns the authenticated user document, or throws if not signed in / not synced.
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("Unauthorized: user record not found");
  }

  return user;
}

// Authenticated user, but also verifies any client-supplied clerkId matches the
// real token subject. Use at call sites that still accept a clerkId argument.
export async function requireUserMatching(
  ctx: QueryCtx | MutationCtx,
  claimedClerkId: string,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: authentication required");
  }
  if (identity.subject !== claimedClerkId) {
    throw new Error("Unauthorized: identity mismatch");
  }
  return requireUser(ctx);
}

// Returns the authenticated user, or null if not signed in (does not throw).
// Useful for queries that should silently return empty rather than error.
export async function getAuthedUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

// True if the given user currently holds an active (non-revoked) admin grant.
export async function isActiveAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return !!admin && !admin.revokedAt;
}

// Requires the AUTHENTICATED caller to be an active admin. Returns the user doc.
// This ignores any client-passed identity and always trusts ctx.auth.
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  const admin = await isActiveAdmin(ctx, user._id);
  if (!admin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}
