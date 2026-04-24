import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

/**
 * Admin Role Management
 * 
 * Replaces hardcoded email-based admin check with proper RBAC.
 * Provides functions to check, grant, and revoke admin access.
 */

// Helper to check if user is admin
export async function isAdmin(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<boolean> {
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return !!admin && !admin.revokedAt;
}

// Helper to get current user and verify admin status
export async function requireAdmin(ctx: QueryCtx | MutationCtx, clerkId: string): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  const adminAccess = await isAdmin(ctx, user._id);
  if (!adminAccess) {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
}

// Query to check current user's admin status
export const checkAdminStatus = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return { isAdmin: false, role: null };

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      isAdmin: !!admin && !admin.revokedAt,
      role: admin?.role || null,
      userId: user._id,
    };
  },
});

// Mutation to grant admin role (requires existing admin)
export const grantAdminRole = mutation({
  args: {
    adminClerkId: v.string(), // Person granting admin
    targetUserId: v.id("users"), // Person receiving admin
    role: v.union(v.literal("superadmin"), v.literal("moderator")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the person granting is an admin
    const grantingUser = await requireAdmin(ctx, args.adminClerkId);

    // Check if target user already has admin role
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (existingAdmin && !existingAdmin.revokedAt) {
      throw new Error("User already has admin role");
    }

    // Grant admin role
    const adminId = await ctx.db.insert("admins", {
      userId: args.targetUserId,
      role: args.role,
      grantedBy: grantingUser._id,
      grantedAt: Date.now(),
      reason: args.reason,
    });

    return { success: true, adminId };
  },
});

// Mutation to revoke admin role
export const revokeAdminRole = mutation({
  args: {
    adminClerkId: v.string(), // Person revoking admin
    targetUserId: v.id("users"), // Person losing admin
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the person revoking is an admin
    await requireAdmin(ctx, args.adminClerkId);

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!admin || admin.revokedAt) {
      throw new Error("User does not have active admin role");
    }

    // Revoke by setting revokedAt timestamp
    await ctx.db.patch(admin._id, {
      revokedAt: Date.now(),
      reason: args.reason,
    });

    return { success: true };
  },
});

// Query to list all active admins (admin only)
export const listAdmins = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Verify requester is admin
    await requireAdmin(ctx, args.clerkId);

    const admins = await ctx.db
      .query("admins")
      .withIndex("by_active", (q) => q.eq("revokedAt", undefined))
      .collect();

    // Get user details for each admin
    const adminDetails = await Promise.all(
      admins.map(async (admin) => {
        const user = await ctx.db.get(admin.userId);
        return {
          adminId: admin._id,
          userId: admin.userId,
          role: admin.role,
          grantedAt: admin.grantedAt,
          grantedBy: admin.grantedBy,
          user: user ? { name: user.name, email: user.email } : null,
        };
      })
    );

    return adminDetails;
  },
});

// Special mutation for setting up the FIRST admin (no auth required)
// This should only be run once via CLI script
export const setupFirstAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error(`User not found with Clerk ID: ${args.clerkId}. Make sure the user has logged in at least once.`);
    }

    // Check if there are already admins (prevent abuse)
    const existingAdmins = await ctx.db
      .query("admins")
      .withIndex("by_active", (q) => q.eq("revokedAt", undefined))
      .collect();

    if (existingAdmins.length > 0) {
      throw new Error("Admin already exists. Use grantAdminRole mutation to add more admins.");
    }

    // Grant superadmin role
    const adminId = await ctx.db.insert("admins", {
      userId: user._id,
      role: "superadmin",
      grantedBy: user._id, // Self-granted for initial setup
      grantedAt: Date.now(),
      reason: "Initial admin setup via CLI script",
    });

    return {
      success: true,
      adminId,
      userId: user._id,
      email: user.email,
      message: `Superadmin role granted to ${user.email}`,
    };
  },
});

// Query to get dashboard statistics (admin only)
export const getDashboardStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Verify requester is admin
    await requireAdmin(ctx, args.clerkId);

    // Get total users
    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;

    // Get total cards (inventory + active)
    const cards = await ctx.db.query("cards").collect();
    const inventoryCards = cards.filter(card => card.status === "inventory").length;
    const activeCards = cards.filter(card => card.status === "active").length;

    // Get total leads
    const leads = await ctx.db.query("leads").collect();
    const totalLeads = leads.length;

    return {
      totalUsers,
      inventoryCards,
      activeCards,
      totalLeads,
    };
  },
});

// Query to get all users (admin only)
export const getAllUsers = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Verify requester is admin
    await requireAdmin(ctx, args.clerkId);

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Check admin status for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const adminStatus = await isAdmin(ctx, user._id);
        return {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          role: adminStatus ? "admin" : "agent",
          credits: user.credits || 0,
          onboardingCompleted: user.onboardingCompleted || false,
          createdAt: user._creationTime,
        };
      })
    );

    return usersWithRoles;
  },
});

// Query to get all NFC cards (admin only)
export const getCards = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Verify requester is admin
    await requireAdmin(ctx, args.clerkId);

    // Get all cards
    const cards = await ctx.db.query("cards").collect();

    return cards;
  },
});
