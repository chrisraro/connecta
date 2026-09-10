import { v } from "convex/values";
import { internalMutation, mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireAdmin, getAuthedUser } from "./authz";
import { logAudit } from "./audit";
import { PlanId, PLAN_LIMITS, PLAN_GRACE_DAYS, DEFAULT_PLAN_PRICING } from "./plans";

/**
 * Billing & subscriptions (Phase 4).
 *
 * Plans are prepaid 30-day periods. There is no payment gateway and no
 * checkout: upgrades are arranged with the customer directly and applied by
 * setting `plan`/`planExpiresAt` on the user. This module owns what remains
 * server-side — the effective-plan rule (with its 3-day grace window),
 * admin-editable pricing, and the daily cron that downgrades expired plans
 * back to free.
 *
 * All monetary values are in PHP centavos.
 */

const PLAN_PRICING_KEY = "planPricing";
const DAY_MS = 24 * 60 * 60 * 1000;

export type PlanPricing = { pro: number; business: number };

// Read effective plan pricing (centavos), merging stored overrides with the
// defaults from convex/plans.ts. Admin-editable via updatePlanPricing.
export async function readPlanPricing(ctx: QueryCtx | MutationCtx): Promise<PlanPricing> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", PLAN_PRICING_KEY))
    .first();
  if (!row || typeof row.value !== "object" || row.value === null) {
    return { ...DEFAULT_PLAN_PRICING };
  }
  const stored = row.value as Partial<PlanPricing>;
  return {
    pro: typeof stored.pro === "number" && stored.pro >= 0 ? stored.pro : DEFAULT_PLAN_PRICING.pro,
    business:
      typeof stored.business === "number" && stored.business >= 0
        ? stored.business
        : DEFAULT_PLAN_PRICING.business,
  };
}

/**
 * Compute a user's EFFECTIVE plan, honoring the 3-day grace period. A stored
 * paid plan whose (planExpiresAt + grace) is in the past is treated as "free".
 * This is the single source of truth used by every enforcement point.
 */
export function effectivePlan(user: Doc<"users">, now = Date.now()): PlanId {
  const stored = (user.plan ?? "free") as PlanId;
  if (stored === "free") return "free";
  const expiry = user.planExpiresAt ?? 0;
  if (expiry + PLAN_GRACE_DAYS * DAY_MS < now) {
    return "free";
  }
  return stored;
}

// Convenience: effective plan + its limits object for a user doc.
export function planContext(user: Doc<"users">, now = Date.now()) {
  const plan = effectivePlan(user, now);
  return { plan, limits: PLAN_LIMITS[plan] };
}

export const getMyPlan = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, _args) => {
    // Trust ctx.auth; the clerkId arg is only to drive the React subscription.
    const user = await getAuthedUser(ctx);
    if (!user) {
      return {
        plan: "free" as PlanId,
        storedPlan: "free" as PlanId,
        planExpiresAt: null as number | null,
        inGrace: false,
        limits: PLAN_LIMITS.free,
        pricing: await readPlanPricing(ctx),
      };
    }

    const now = Date.now();
    const plan = effectivePlan(user, now);
    const storedPlan = (user.plan ?? "free") as PlanId;
    const expiry = user.planExpiresAt ?? null;
    const inGrace =
      storedPlan !== "free" &&
      expiry !== null &&
      expiry < now &&
      expiry + PLAN_GRACE_DAYS * DAY_MS >= now;

    return {
      plan,
      storedPlan,
      planExpiresAt: expiry,
      inGrace,
      limits: PLAN_LIMITS[plan],
      pricing: await readPlanPricing(ctx),
    };
  },
});

/**
 * Daily cron target: downgrade users whose plan expired more than the grace
 * window ago back to "free". teamId is preserved (team features simply gate off
 * the effective plan), so a renewal re-activates the existing workspace.
 */
export const internalDowngradeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - PLAN_GRACE_DAYS * DAY_MS;
    const users = await ctx.db.query("users").collect();
    let downgraded = 0;
    for (const user of users) {
      const stored = user.plan ?? "free";
      if (stored === "free") continue;
      const expiry = user.planExpiresAt ?? 0;
      if (expiry < cutoff) {
        await ctx.db.patch(user._id, { plan: "free" });
        downgraded++;
      }
    }
    return { downgraded };
  },
});

// Admin: update plan pricing (centavos) stored under settings.planPricing.
export const updatePlanPricing = mutation({
  args: { proCentavos: v.number(), businessCentavos: v.number() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.proCentavos < 0 || args.businessCentavos < 0) {
      throw new Error("Prices cannot be negative");
    }
    const value: PlanPricing = {
      pro: Math.round(args.proCentavos),
      business: Math.round(args.businessCentavos),
    };
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", PLAN_PRICING_KEY))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("settings", {
        key: PLAN_PRICING_KEY,
        value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }
    await logAudit(ctx, {
      userId: admin._id,
      action: "update",
      resourceType: "settings",
      resourceId: PLAN_PRICING_KEY,
      changes: value,
    });
    return { success: true, pricing: value };
  },
});

// Public query for the admin settings page to read current plan pricing.
export const getPlanPricing = query({
  args: {},
  handler: async (ctx) => {
    return await readPlanPricing(ctx);
  },
});

// Re-export for callers that want plan limits without a round trip.
export { PLAN_LIMITS, effectivePlan as _effectivePlan };
export type { PlanId };
