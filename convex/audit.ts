import { v } from "convex/values";
import { query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUserMatching, requireAdmin } from "./authz";

/**
 * Audit Logging Utility
 * 
 * Provides centralized audit logging for all critical mutations.
 * Tracks who did what, when, and what changed.
 */

// Helper to create audit log entry
export async function logAudit(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    action: string;
    resourceType: string;
    resourceId: string;
    changes?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Id<"auditLogs">> {
  return await ctx.db.insert("auditLogs", {
    userId: args.userId,
    action: args.action,
    resourceType: args.resourceType,
    resourceId: args.resourceId,
    changes: args.changes,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
    timestamp: Date.now(),
  });
}

// Query to get audit logs for a user
export const getMyAuditLogs = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Only the authenticated user can read their own audit logs.
    const user = await requireUserMatching(ctx, args.clerkId);

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100); // Last 100 actions
  },
});

// Query to get audit logs for a specific resource (admin only)
export const getResourceAuditLogs = query({
  args: { 
    clerkId: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the authenticated caller is an active admin (clerkId must match token).
    await requireUserMatching(ctx, args.clerkId);
    await requireAdmin(ctx);

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_resource", (q) => 
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .take(50);
  },
});
