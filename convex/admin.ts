import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
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

// Admin list views (getAllUsers, getCards) feed an admin table UI, not an
// export/report — a hard cap keeps a single page load bounded regardless of
// how large `users`/`cards` grow, instead of collecting the whole table on
// every visit.
const ADMIN_USER_LIST_CAP = 500;
const ADMIN_CARDS_LIST_CAP = 500;

export const getAllUsers = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    const users = await ctx.db.query("users").take(ADMIN_USER_LIST_CAP);

    // Batch the admin-grant lookup: one collect instead of one indexed
    // `by_user` query per user (was the N+1 half of this function). The
    // admins table is bounded by how many grants have ever been issued, not
    // by user count, so collecting it in full stays cheap regardless of how
    // large `users` grows. Keep the EARLIEST admins row per user to exactly
    // reproduce `.withIndex("by_user", eq(userId)).first()`'s tie-break
    // (ascending _creationTime within a userId) — including the edge case
    // where a user's very first (now-revoked) grant still wins over a later
    // active regrant.
    const allAdminGrants = await ctx.db.query("admins").collect();
    const adminGrantByUser = new Map<Id<"users">, Doc<"admins">>();
    for (const grant of allAdminGrants) {
      if (!adminGrantByUser.has(grant.userId)) {
        adminGrantByUser.set(grant.userId, grant);
      }
    }

    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const adminGrant = adminGrantByUser.get(user._id) ?? null;
        const isUserAdmin = !!adminGrant && !adminGrant.revokedAt;
        // cards/orders stay per-user indexed lookups (by_owner / by_user) —
        // each reads exactly the rows that belong to this user, unlike a
        // full-table collect. Replaces the old full `orders` collect +
        // in-JS filter, which read every order in the system on every call.
        const cards = await ctx.db
          .query("cards")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .collect();
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
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
          orderCount: orders.length,
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
    const cards = await ctx.db.query("cards").take(ADMIN_CARDS_LIST_CAP);
    return cards;
  },
});

/**
 * Alphabet for user-typed activation codes. Uppercase-only and stripped of
 * every lookalike pair (0/O, 1/I/L, 5/S, 8/B, 2/Z) because these codes are
 * transcribed by hand from a printed sticker — often from a phone screen or
 * small label. 24^6 ≈ 191M combinations; uniqueness is enforced by lookup.
 */
const ACTIVATION_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";

function randomActivationCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ACTIVATION_ALPHABET[Math.floor(Math.random() * ACTIVATION_ALPHABET.length)];
  }
  return code;
}

export const registerSingleCard = mutation({
  args: {
    clerkId: v.string(),
    uuid: v.string(),
    // Deprecated and ignored: codes are generated server-side now. The old
    // client generated `ACT-<serial>-<Date.now()>` — 30–55 chars with
    // lowercase hex — while the user-facing activation form promises a
    // 6-character code and uppercases input before an exact-match lookup,
    // so no client-generated code was ever enterable. Kept optional so a
    // stale deployed client doesn't get an ArgumentValidationError.
    activationCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdmin(ctx, args.clerkId);
    const uuidNormalized = args.uuid.trim().toLowerCase();
    const existingCard = await ctx.db
      .query("cards")
      .withIndex("by_uuid", (q) => q.eq("uuid", uuidNormalized))
      .first();
    if (existingCard) {
      // A plain `Error` here is the wrong shape for this: on a real
      // production Convex deployment, Error messages are redacted
      // client-side to the fixed string "Server Error" (ConvexError.data
      // is NOT redacted — it crosses the client/server boundary intact).
      // The admin factory page needs to distinguish "duplicate uuid" from
      // any other failure, so that has to travel as a structured data code,
      // not as message text a client can regex-match. `message` is kept in
      // the data payload purely for dev-console ergonomics (e.g. `npx
      // convex logs`); callers must key off `.data.code`, never `.message`.
      throw new ConvexError({
        code: "DUPLICATE_UUID",
        uuid: uuidNormalized,
        message: `Card with UUID ${uuidNormalized} already exists`,
      });
    }
    let activationCode = randomActivationCode();
    for (let attempt = 0; attempt < 10; attempt++) {
      const collision = await ctx.db
        .query("cards")
        .withIndex("by_activationCode", (q) => q.eq("activationCode", activationCode))
        .first();
      if (!collision) break;
      if (attempt === 9) throw new Error("Could not generate a unique activation code");
      activationCode = randomActivationCode();
    }
    const cardId = await ctx.db.insert("cards", {
      // Custodial: the card sits in the admin's inventory until claimed.
      // cards.ts:claimCardByUuid treats status "inventory" as claimable
      // regardless of this field — do not use ownerId as an ownership gate
      // for unactivated stock.
      ownerId: adminUser._id,
      uuid: uuidNormalized,
      activationCode,
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
    return { success: true, cardId, uuid: uuidNormalized, activationCode };
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
    // Physical cards are never deleted while "active" — same policy
    // enforced in users.ts/maintenance.ts's user-purge paths, which return
    // an active/linked card to inventory instead of hard-deleting it. An
    // admin destroying a real customer's paired card row here would
    // silently orphan their NFC tag/QR with no way to recover the link.
    // "inventory" (never issued) and "lost" (already reported gone, not
    // physically recoverable through the normal unpair flow) are the only
    // statuses safe to hard-delete.
    const skippedIds: Id<"cards">[] = [];
    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;
      if (card.status === "active") {
        skippedIds.push(cardId);
        continue;
      }
      await ctx.db.delete(cardId);
      deletedCount++;
    }
    await logAudit(ctx, {
      userId: adminUser._id,
      action: "delete",
      resourceType: "card",
      resourceId: args.cardIds.join(","),
      changes: { deletedCount, requested: args.cardIds.length, skipped: skippedIds.length },
    });
    return {
      success: true,
      deletedCount,
      totalRequested: args.cardIds.length,
      skippedIds,
    };
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

/**
 * Bootstrap an admin from the CLI:
 *   npx convex run admin:internalBootstrapAdmin '{"email":"you@example.com"}' --prod
 *
 * WHY THIS EXISTS
 * ---------------
 * setupFirstAdmin cannot bootstrap a fresh deployment. It calls
 * requireUserMatching, so it needs an authenticated session — but the reason
 * you are locked out is precisely that you have no admin grant yet. On the
 * production deployment that is a hard deadlock: the users table starts
 * empty, syncUser creates you as "agent", and the /admin shell redirects you
 * to /dashboard before you can reach anything that could promote you.
 *
 * internalMutation is the escape hatch: it is NOT part of the public API and
 * cannot be called from a browser, so it needs no auth check of its own — the
 * authority is possession of the deployment's admin key, which the Convex CLI
 * already proves. That is the same trust model as editing the row by hand in
 * the Convex dashboard, just reproducible and idempotent.
 *
 * It writes BOTH admin records on purpose:
 *   - users.role      — legacy field some UI still reads
 *   - `admins` row    — the real authority behind authz.ts:requireAdmin
 * Writing only one is what produced the drift this replaces.
 *
 * Requires the account to have signed in at least once, so a users row exists
 * to promote. Idempotent: re-running reports what already held.
 */
export const internalBootstrapAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .unique();

    if (!user) {
      const known = (await ctx.db.query("users").take(25)).map((u) => u.email);
      throw new Error(
        `No users row for "${email}". Sign in to the deployed app once so ` +
          `syncUser creates it, then re-run. Existing accounts: ${
            known.length ? known.join(", ") : "(none — the table is empty)"
          }`
      );
    }

    const roleChanged = user.role !== "admin";
    if (roleChanged) await ctx.db.patch(user._id, { role: "admin" });

    const existing = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    let grantId = existing?._id;
    let grantAction: string;
    if (!existing) {
      grantId = await ctx.db.insert("admins", {
        userId: user._id,
        role: "superadmin",
        grantedBy: user._id, // self-granted: this is the bootstrap case
        grantedAt: Date.now(),
        reason: "Bootstrapped via internalBootstrapAdmin (CLI)",
      });
      grantAction = "created superadmin grant";
    } else if (existing.revokedAt !== undefined) {
      await ctx.db.patch(existing._id, { revokedAt: undefined });
      grantAction = "reinstated previously revoked grant";
    } else {
      grantAction = "grant already active";
    }

    return {
      email: user.email,
      userId: user._id,
      grantId,
      usersRole: roleChanged ? 'patched "agent" -> "admin"' : 'already "admin"',
      adminsTable: grantAction,
    };
  },
});
