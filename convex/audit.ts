import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    changes?: any;
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return [];

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
    // Verify user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) throw new Error("User not found");

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!admin || admin.revokedAt) {
      throw new Error("Unauthorized: Admin access required");
    }

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_resource", (q) => 
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .take(50);
  },
});
