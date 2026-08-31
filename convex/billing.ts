import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireUser, requireAdmin, getAuthedUser } from "./authz";
import { logAudit } from "./audit";
import {
  PlanId,
  PLAN_LIMITS,
  PLAN_PERIOD_DAYS,
  PLAN_GRACE_DAYS,
  DEFAULT_PLAN_PRICING,
} from "./plans";
import { CONNECTA } from "../lib/brand";

/**
 * Billing & subscriptions (Phase 4).
 *
 * Plans are prepaid 30-day periods. There is no auto-recurring billing with
 * PayRex here: the user upgrades/renews via a PayRex hosted checkout, the
 * webhook (convex/http.ts) activates the invoice, and a daily cron downgrades
 * expired plans (after a 3-day grace period) back to free.
 *
 * All monetary values are in PHP centavos.
 */

const PLAN_PRICING_KEY = "planPricing";
const DAY_MS = 24 * 60 * 60 * 1000;

export type PlanPricing = { pro: number; business: number };

// Read effective plan pricing (centavos), merging stored overrides with the
// defaults from convex/plans.ts. Admin-editable via updatePlanPricing.
export async function readPlanPricing(
  ctx: QueryCtx | MutationCtx
): Promise<PlanPricing> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", PLAN_PRICING_KEY))
    .first();
  if (!row || typeof row.value !== "object" || row.value === null) {
    return { ...DEFAULT_PLAN_PRICING };
  }
  const stored = row.value as Partial<PlanPricing>;
  return {
    pro:
      typeof stored.pro === "number" && stored.pro >= 0
        ? stored.pro
        : DEFAULT_PLAN_PRICING.pro,
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
        invoices: [],
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

    const invoices = await ctx.db
      .query("subscriptionInvoices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return {
      plan,
      storedPlan,
      planExpiresAt: expiry,
      inGrace,
      limits: PLAN_LIMITS[plan],
      invoices: invoices.map((inv) => ({
        _id: inv._id,
        plan: inv.plan,
        amountCentavos: inv.amountCentavos,
        status: inv.status,
        periodStart: inv.periodStart ?? null,
        periodEnd: inv.periodEnd ?? null,
        createdAt: inv.createdAt,
      })),
      pricing: await readPlanPricing(ctx),
    };
  },
});

// Internal query for the PayRex action to load the invoice user + pricing.
export const getInvoiceContext = internalQuery({
  args: { userId: v.id("users"), plan: v.union(v.literal("pro"), v.literal("business")) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const pricing = await readPlanPricing(ctx);
    return { user, pricing };
  },
});

// Internal mutation: create the pending invoice row. Returns its id.
export const createPendingInvoice = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("business")),
    amountCentavos: v.number(),
  },
  handler: async (ctx, args) => {
    const invoiceId = await ctx.db.insert("subscriptionInvoices", {
      userId: args.userId,
      plan: args.plan,
      amountCentavos: args.amountCentavos,
      periodDays: PLAN_PERIOD_DAYS,
      status: "pending",
      createdAt: Date.now(),
    });
    return invoiceId;
  },
});

// Idempotent version of createPendingInvoice: reuses an existing PENDING
// invoice for the same (userId, plan) instead of always inserting a new one.
// This closes the double-charge hole where a double-click / tab reload /
// network retry on the upgrade button created two independent invoices that
// could both be paid (Payments audit #2).
export const findOrCreatePendingInvoice = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("business")),
    amountCentavos: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptionInvoices")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("plan"), args.plan),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("subscriptionInvoices", {
      userId: args.userId,
      plan: args.plan,
      amountCentavos: args.amountCentavos,
      periodDays: PLAN_PERIOD_DAYS,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Attach the PayRex session ids to the pending invoice (after creation).
export const attachInvoiceSession = internalMutation({
  args: {
    invoiceId: v.id("subscriptionInvoices"),
    payrexCheckoutId: v.string(),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId);
    if (!inv) throw new Error("Invoice not found");
    await ctx.db.patch(args.invoiceId, {
      payrexCheckoutId: args.payrexCheckoutId,
      paymentIntentId: args.paymentIntentId ?? inv.paymentIntentId,
    });
    return { success: true };
  },
});

/**
 * Create a PayRex hosted checkout for a plan upgrade/renewal. Mirrors the
 * fetch/form-encoding approach of convex/payrex.ts.
 */
export const createUpgradeCheckout = action({
  args: { plan: v.union(v.literal("pro"), v.literal("business")) },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const secretKey = process.env.PAYREX_SECRET_KEY;
    if (!secretKey) throw new Error("PAYREX_SECRET_KEY is not configured");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");

    // Resolve the authenticated user id via an internal query path.
    const me = await ctx.runQuery(internal.billing.getMeForCheckout, {});
    if (!me) throw new Error("Unauthorized: sign in to upgrade");

    const { user, pricing } = await ctx.runQuery(
      internal.billing.getInvoiceContext,
      { userId: me.userId, plan: args.plan }
    );
    if (!user) throw new Error("User not found");

    const amount = args.plan === "pro" ? pricing.pro : pricing.business;
    const planName = PLAN_LIMITS[args.plan].name;

    const invoiceId = await ctx.runMutation(
      internal.billing.findOrCreatePendingInvoice,
      { userId: me.userId, plan: args.plan, amountCentavos: amount }
    );

    const pairs: Array<[string, string]> = [
      ["currency", "PHP"],
      ["success_url", `${appUrl}/dashboard/billing?paid=1`],
      ["cancel_url", `${appUrl}/dashboard/billing?cancelled=1`],
      ["billing_details_collection", "auto"],
    ];
    for (const method of ["gcash", "maya", "card", "qrph"]) {
      pairs.push(["payment_methods[]", method]);
    }
    pairs.push(["line_items[][name]", `${CONNECTA.name} ${planName} — 30 days`]);
    pairs.push(["line_items[][amount]", String(amount)]);
    pairs.push(["line_items[][quantity]", "1"]);
    pairs.push(["metadata[invoice_id]", invoiceId]);

    const body = pairs
      .map(([k, val]) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`)
      .join("&");

    const res = await fetch("https://api.payrexhq.com/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${secretKey}:`),
        "Idempotency-Key": `upgrade-invoice-${invoiceId}`,
      },
      body,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `PayRex checkout session creation failed (${res.status}): ${errText}`
      );
    }
    const session = (await res.json()) as {
      id: string;
      url: string;
      payment_intent?: string | { id?: string };
    };
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    await ctx.runMutation(internal.billing.attachInvoiceSession, {
      invoiceId,
      payrexCheckoutId: session.id,
      paymentIntentId,
    });

    return { url: session.url };
  },
});

// Internal query: resolve the authenticated caller's userId for the action.
export const getMeForCheckout = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ userId: Id<"users"> } | null> => {
    const user = await getAuthedUser(ctx);
    if (!user) return null;
    return { userId: user._id };
  },
});

/**
 * Activate a paid invoice (called by the PayRex webhook). Marks the invoice
 * paid, sets the user's plan and planExpiresAt = max(now, currentExpiry) + 30d,
 * and auto-creates a team for business upgrades. Idempotent.
 */
export const internalActivateInvoice = internalMutation({
  args: {
    invoiceId: v.optional(v.id("subscriptionInvoices")),
    payrexCheckoutId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let invoice: Doc<"subscriptionInvoices"> | null = null;
    if (args.invoiceId) {
      invoice = await ctx.db.get(args.invoiceId);
    }
    if (!invoice && args.payrexCheckoutId) {
      invoice = await ctx.db
        .query("subscriptionInvoices")
        .withIndex("by_checkoutId", (q) =>
          q.eq("payrexCheckoutId", args.payrexCheckoutId)
        )
        .first();
    }
    if (!invoice && args.paymentIntentId) {
      invoice = await ctx.db
        .query("subscriptionInvoices")
        .withIndex("by_paymentIntentId", (q) =>
          q.eq("paymentIntentId", args.paymentIntentId)
        )
        .first();
    }
    if (!invoice) {
      return { success: false, reason: "invoice_not_found" };
    }
    if (invoice.status === "paid") {
      return { success: true, alreadyProcessed: true };
    }

    const user = await ctx.db.get(invoice.userId);
    if (!user) {
      return { success: false, reason: "user_not_found" };
    }

    const now = Date.now();
    const currentExpiry = user.planExpiresAt ?? 0;
    // Renewals extend from the later of now / current expiry (no lost days).
    const base = Math.max(now, currentExpiry);
    const periodStart = now;
    const periodEnd = base + invoice.periodDays * DAY_MS;

    await ctx.db.patch(invoice._id, {
      status: "paid",
      paymentIntentId: args.paymentIntentId ?? invoice.paymentIntentId,
      periodStart,
      periodEnd,
    });

    const userPatch: Partial<Doc<"users">> = {
      plan: invoice.plan,
      planExpiresAt: periodEnd,
    };

    // Business upgrade with no team yet → auto-create a workspace.
    if (invoice.plan === "business" && !user.teamId) {
      const teamName = `${user.name || user.email || "My"}'s team`;
      const teamId = await ctx.db.insert("teams", {
        name: teamName,
        ownerId: user._id,
        seats: PLAN_LIMITS.business.teamSeats,
        companyName: user.onboardingData?.company,
        createdAt: now,
      });
      userPatch.teamId = teamId;
    }

    await ctx.db.patch(user._id, userPatch);

    return { success: true, plan: invoice.plan, periodEnd };
  },
});

// Called by the webhook when PayRex reports a failed/expired checkout for a
// subscription invoice, so the invoice stops showing as permanently
// "pending" and the user can see (and retry) the failure (Payments #1).
export const internalFailInvoice = internalMutation({
  args: { invoiceId: v.id("subscriptionInvoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.status !== "pending") {
      return { success: false, reason: "not_pending" };
    }
    await ctx.db.patch(args.invoiceId, { status: "expired" });
    return { success: true };
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

// Silence unused import lint (requireUser used by other modules via shared
// patterns); keep available for future billing mutations.
void requireUser;
