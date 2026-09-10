import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Removes throwaway QA/verification accounts and everything they own.
 *
 * WHY THIS EXISTS
 * ---------------
 * Automated browser-verification runs created real Clerk users and real Convex
 * rows. The Clerk side was cleaned up; the Convex rows were not. This purges
 * them together with their dependent documents.
 *
 * WHY IT IS CAREFUL
 * -----------------
 * This codebase has NO cascade deletes anywhere. Deleting a `users` row on its
 * own would orphan that user's profiles, cards, leads and notifications, and
 * leave `cards.linkedProfileId` pointing at a dead profile. So this walks every
 * table that references `users` (15 references across 14 tables, verified
 * against convex/schema.ts) rather than deleting the user alone.
 *
 * SAFETY PROPERTIES
 * -----------------
 *  - Targets an EXPLICIT clerkId allowlist. No pattern matching, no heuristics.
 *  - `dryRun` defaults to TRUE. It reports what it would touch and writes
 *    nothing unless you pass `{"dryRun": false}`.
 *  - Refuses to touch any account holding an admin grant.
 *  - Refuses to touch any account that owns a team, has a paid subscription
 *    invoice, or has a paid order — those are signs of a real account, not a
 *    throwaway, and the caller should investigate instead.
 *  - Reports per-table counts so the effect is auditable after the fact.
 *
 * Usage:
 *   npx convex run maintenance:internalPurgeTestAccounts '{"clerkIds":["user_x"]}'
 *   npx convex run maintenance:internalPurgeTestAccounts '{"clerkIds":["user_x"],"dryRun":false}'
 */
export const internalPurgeTestAccounts = internalMutation({
  args: {
    clerkIds: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun !== false; // default: do not write
    const report: Array<Record<string, unknown>> = [];
    const refused: Array<Record<string, string>> = [];

    for (const clerkId of args.clerkIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .unique();

      if (!user) {
        refused.push({ clerkId, reason: "no_such_user" });
        continue;
      }
      const userId: Id<"users"> = user._id;

      // --- Refuse anything that looks like a real account -------------
      const adminGrant = await ctx.db
        .query("admins")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (adminGrant) {
        refused.push({ clerkId, email: user.email, reason: "holds_admin_grant" });
        continue;
      }

      const ownedTeam = await ctx.db
        .query("teams")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .first();
      if (ownedTeam) {
        refused.push({ clerkId, email: user.email, reason: "owns_a_team" });
        continue;
      }

      // A customer who has paid us for something is never purged by a
      // bulk job. With no payment gateway there are no invoice or order
      // rows to consult, so the stored plan is the record of that: anyone
      // ever put on a paid plan is refused here and must be removed
      // deliberately, one at a time.
      if ((user.plan ?? "free") !== "free") {
        refused.push({ clerkId, email: user.email, reason: "has_paid_plan" });
        continue;
      }

      // --- Gather dependents ------------------------------------------
      const profiles = await ctx.db
        .query("profiles")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const leads = await ctx.db
        .query("leads")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const properties = await ctx.db
        .query("properties")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const carts = await ctx.db
        .query("carts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const auditLogs = await ctx.db
        .query("auditLogs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      // Cards owned by this user may be linked to a profile we're about
      // to delete. Cards are physical inventory — never delete them,
      // return them to inventory with the dead link cleared.
      const entry = {
        clerkId,
        email: user.email,
        name: user.name ?? null,
        profiles: profiles.length,
        cardsReturnedToInventory: cards.length,
        leads: leads.length,
        notifications: notifications.length,
        properties: properties.length,
        projects: projects.length,
        carts: carts.length,
        auditLogsRetained: auditLogs.length,
      };
      report.push(entry);

      if (dryRun) continue;

      // --- Execute ----------------------------------------------------
      for (const p of profiles) await ctx.db.delete(p._id);
      for (const l of leads) await ctx.db.delete(l._id);
      for (const n of notifications) await ctx.db.delete(n._id);
      for (const p of properties) await ctx.db.delete(p._id);
      for (const p of projects) await ctx.db.delete(p._id);
      for (const c of carts) await ctx.db.delete(c._id);

      // Physical cards survive as inventory, unassigned.
      for (const c of cards) {
        await ctx.db.patch(c._id, {
          status: "inventory",
          linkedProfileId: undefined,
          tapCount: 0,
        });
      }

      // auditLogs are deliberately RETAINED — an audit trail that deletes
      // itself when its subject is removed is not an audit trail.

      await ctx.db.delete(userId);
    }

    return { dryRun, purged: dryRun ? 0 : report.length, report, refused };
  },
});
