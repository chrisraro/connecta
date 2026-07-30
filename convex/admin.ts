import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { isActiveAdmin, requireUserMatching, requireAdmin as requireAdminAuthed } from "./authz";
import { logAudit } from "./audit";

export async function isAdmin(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<boolean> {
  return isActiveAdmin(ctx, userId);
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx, clerkId: string): Promise<Doc<"users">> {
  await requireUserMatching(ctx, clerkId);
  return requireAdminAuthed(ctx);
}

// Requires the authenticated caller to be an active SUPERADMIN. Returns the
// admin grant + user doc. Used for sensitive operations (granting/revoking
// admin, suspending users).
export async function requireSuperadmin(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<{ user: Doc<"users">; adminId: Id<"admins"> }> {
  const user = await requireAdmin(ctx, clerkId);
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!admin || admin.revokedAt || admin.role !== "superadmin") {
    throw new Error("Unauthorized: Superadmin access required");
  }
  return { user, adminId: admin._id };
}

export const checkAdminStatus = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) {
      return { isAdmin: false, role: null };
    }
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

export const grantAdminRole = mutation({
  args: {
    adminClerkId: v.string(),
    targetUserId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("moderator")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Granting admin is a superadmin-only operation.
    const { user: grantingUser } = await requireSuperadmin(ctx, args.adminClerkId);
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();
    if (existingAdmin && !existingAdmin.revokedAt) {
      throw new Error("User already has admin role");
    }
    const adminId = await ctx.db.insert("admins", {
      userId: args.targetUserId,
      role: args.role,
      grantedBy: grantingUser._id,
      grantedAt: Date.now(),
      reason: args.reason,
    });
    await logAudit(ctx, {
      userId: grantingUser._id,
      action: "grant_admin",
      resourceType: "user",
      resourceId: args.targetUserId,
      changes: { role: args.role, reason: args.reason },
    });
    return { success: true, adminId };
  },
});

export const revokeAdminRole = mutation({
  args: {
    adminClerkId: v.string(),
    targetUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Revoking admin is a superadmin-only operation.
    const { user: actingUser } = await requireSuperadmin(ctx, args.adminClerkId);

    // Guard: an admin cannot revoke their own (superadmin) grant — this prevents
    // accidentally locking the platform out of all superadmin control.
    if (args.targetUserId === actingUser._id) {
      throw new Error("You cannot revoke your own admin access");
    }

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();
    if (!admin || admin.revokedAt) {
      throw new Error("User does not have active admin role");
    }
    await ctx.db.patch(admin._id, {
      revokedAt: Date.now(),
      reason: args.reason,
    });
    await logAudit(ctx, {
      userId: actingUser._id,
      action: "revoke_admin",
      resourceType: "user",
      resourceId: args.targetUserId,
      changes: { reason: args.reason },
    });
    return { success: true };
  },
});

export const listAdmins = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const admins = await ctx.db
      .query("admins")
      .withIndex("by_active", (q) => q.eq("revokedAt", undefined))
      .collect();
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

export const setupFirstAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: this bootstraps the platform's first superadmin — it must
    // never trust the clerkId argument alone (Auth audit #1).
    const user = await requireUserMatching(ctx, args.clerkId);
    const existingAdmins = await ctx.db
      .query("admins")
      .withIndex("by_active", (q) => q.eq("revokedAt", undefined))
      .collect();
    if (existingAdmins.length > 0) {
      throw new Error("Admin already exists. Use grantAdminRole mutation to add more admins.");
    }
    const adminId = await ctx.db.insert("admins", {
      userId: user._id,
      role: "superadmin",
      grantedBy: user._id,
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

export const getDashboardStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;
    const cards = await ctx.db.query("cards").collect();
    const inventoryCards = cards.filter(card => card.status === "inventory").length;
    const activeCards = cards.filter(card => card.status === "active").length;
    const leads = await ctx.db.query("leads").collect();
    const totalLeads = leads.length;
    return { totalUsers, inventoryCards, activeCards, totalLeads };
  },
});

/**
 * Single aggregated query powering the admin dashboard home stat cards.
 * Combines user/card/profile/order/lead/inventory metrics in one round trip.
 * Revenue is in centavos (PHP).
 */
export const getAdminDashboard = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const [users, cards, profiles, orders, leads, products] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("cards").collect(),
      ctx.db.query("profiles").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("leads").collect(),
      ctx.db.query("products").collect(),
    ]);

    const activeCards = cards.filter((c) => c.status === "active").length;
    const inventoryCards = cards.filter((c) => c.status === "inventory").length;

    const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
    const revenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    const lowStockCount = products.filter(
      (p) => p.trackInventory && p.inventory <= p.lowStockThreshold
    ).length;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newLeads7d = leads.filter((l) => l.createdAt >= sevenDaysAgo).length;

    return {
      totalUsers: users.length,
      activeCards,
      inventoryCards,
      totalProfiles: profiles.length,
      paidOrders: paidOrders.length,
      totalOrders: orders.length,
      revenue,
      currency: "PHP" as const,
      lowStockCount,
      totalLeads: leads.length,
      newLeads7d,
    };
  },
});

/**
 * Suspend or reactivate a user by toggling subscriptionStatus. Superadmin only.
 * A suspended user keeps their data but is flagged "suspended".
 */
export const setUserSuspended = mutation({
  args: {
    adminClerkId: v.string(),
    targetUserId: v.id("users"),
    suspended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user: actingUser } = await requireSuperadmin(ctx, args.adminClerkId);

    if (args.targetUserId === actingUser._id) {
      throw new Error("You cannot suspend your own account");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.targetUserId, {
      subscriptionStatus: args.suspended ? "suspended" : "active",
    });

    await logAudit(ctx, {
      userId: actingUser._id,
      action: args.suspended ? "suspend_user" : "reactivate_user",
      resourceType: "user",
      resourceId: args.targetUserId,
      changes: { subscriptionStatus: args.suspended ? "suspended" : "active" },
    });

    return { success: true };
  },
});

// Admin audit log feed for the audit page. Returns recent entries enriched
// with the acting user's name/email.
export const getAuditLogs = query({
  args: { clerkId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 200);
    return await Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.userId);
        return {
          _id: log._id,
          timestamp: log.timestamp,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          changes: log.changes,
          actorName: actor?.name ?? null,
          actorEmail: actor?.email ?? null,
        };
      })
    );
  },
});

export const getAllUsers = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const users = await ctx.db.query("users").collect();
    const allOrders = await ctx.db.query("orders").collect();
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const adminGrant = await ctx.db
          .query("admins")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        const isUserAdmin = !!adminGrant && !adminGrant.revokedAt;
        const cards = await ctx.db
          .query("cards")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .collect();
        const orderCount = allOrders.filter((o) => o.userId === user._id).length;
        return {
          id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          role: isUserAdmin ? "admin" : "agent",
          adminRole: isUserAdmin ? adminGrant!.role : null,
          subscriptionStatus: user.subscriptionStatus,
          plan: user.plan ?? "free",
          planExpiresAt: user.planExpiresAt ?? null,
          onboardingCompleted: user.onboardingCompleted || false,
          cardCount: cards.length,
          orderCount,
          createdAt: user._creationTime,
        };
      })
    );
    return usersWithRoles;
  },
});

export const getCards = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const cards = await ctx.db.query("cards").collect();
    return cards;
  },
});

export const registerSingleCard = mutation({
  args: {
    clerkId: v.string(),
    uuid: v.string(),
    activationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx, args.clerkId);
    const uuidNormalized = args.uuid.trim().toLowerCase();
    const existingCard = await ctx.db
      .query("cards")
      .withIndex("by_uuid", (q) => q.eq("uuid", uuidNormalized))
      .first();
    if (existingCard) {
      throw new Error(`Card with UUID ${uuidNormalized} already exists`);
    }
    const existingActivation = await ctx.db
      .query("cards")
      .withIndex("by_activationCode", (q) => q.eq("activationCode", args.activationCode))
      .first();
    if (existingActivation) {
      throw new Error(`Card with activation code ${args.activationCode} already exists`);
    }
    const cardId = await ctx.db.insert("cards", {
      ownerId: adminUser._id,
      uuid: uuidNormalized,
      activationCode: args.activationCode,
      status: "inventory",
      linkedProfileId: undefined,
      tapCount: 0,
    });
    await logAudit(ctx, {
      userId: adminUser._id,
      action: "create",
      resourceType: "card",
      resourceId: cardId,
      changes: { uuid: uuidNormalized },
    });
    return { success: true, cardId, uuid: uuidNormalized, activationCode: args.activationCode };
  },
});

export const deleteCards = mutation({
  args: {
    clerkId: v.string(),
    cardIds: v.array(v.id("cards")),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx, args.clerkId);
    let deletedCount = 0;
    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (card) {
        await ctx.db.delete(cardId);
        deletedCount++;
      }
    }
    await logAudit(ctx, {
      userId: adminUser._id,
      action: "delete",
      resourceType: "card",
      resourceId: args.cardIds.join(","),
      changes: { deletedCount, requested: args.cardIds.length },
    });
    return { success: true, deletedCount, totalRequested: args.cardIds.length };
  },
});

export const lowercaseExistingCardUuids = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const cards = await ctx.db.query("cards").collect();
    let updatedCount = 0;
    for (const card of cards) {
      const lowerUuid = card.uuid.trim().toLowerCase();
      if (card.uuid !== lowerUuid) {
        await ctx.db.patch(card._id, {
          uuid: lowerUuid,
        });
        updatedCount++;
      }
    }
    return { success: true, totalCards: cards.length, updated: updatedCount };
  },
});
