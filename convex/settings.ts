import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireAdmin } from "./authz";
import { logAudit } from "./audit";

/**
 * Shop Settings
 *
 * Single source of truth for tax rate, shipping cost, and free-shipping
 * threshold. Stored in the `settings` table under the "shop" key. Both the
 * storefront (cart/checkout display) and the server-side order creation read
 * from `getShopSettings` so the numbers never drift apart.
 *
 * All monetary values are in centavos (PHP cents). Defaults:
 *   - 0% tax
 *   - ₱500 flat shipping = 50000 centavos
 *   - free shipping over ₱2500 = 250000 centavos
 */

export type ShopSettings = {
  taxRatePercent: number;
  shippingFlatRateCentavos: number;
  freeShippingThresholdCentavos: number;
  currency: "PHP";
};

const SHOP_SETTINGS_KEY = "shop";

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  taxRatePercent: 0,
  shippingFlatRateCentavos: 50000,
  freeShippingThresholdCentavos: 250000,
  currency: "PHP",
};

// Internal helper usable from other Convex functions (e.g. checkout.createOrder)
// to read the effective shop settings, merging stored overrides with defaults.
export async function readShopSettings(
  ctx: QueryCtx | MutationCtx
): Promise<ShopSettings> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", SHOP_SETTINGS_KEY))
    .first();

  if (!row || typeof row.value !== "object" || row.value === null) {
    return { ...DEFAULT_SHOP_SETTINGS };
  }

  const stored = row.value as Partial<ShopSettings>;
  return {
    taxRatePercent:
      typeof stored.taxRatePercent === "number"
        ? stored.taxRatePercent
        : DEFAULT_SHOP_SETTINGS.taxRatePercent,
    shippingFlatRateCentavos:
      typeof stored.shippingFlatRateCentavos === "number"
        ? stored.shippingFlatRateCentavos
        : DEFAULT_SHOP_SETTINGS.shippingFlatRateCentavos,
    freeShippingThresholdCentavos:
      typeof stored.freeShippingThresholdCentavos === "number"
        ? stored.freeShippingThresholdCentavos
        : DEFAULT_SHOP_SETTINGS.freeShippingThresholdCentavos,
    currency: "PHP",
  };
}

// Compute tax + shipping for a given subtotal (centavos) from the settings.
// Centralized so checkout (server) and the storefront agree exactly.
export function computeTotals(
  settings: ShopSettings,
  subtotalCentavos: number
): { tax: number; shipping: number } {
  const tax = Math.round(subtotalCentavos * (settings.taxRatePercent / 100));
  const shipping =
    subtotalCentavos >= settings.freeShippingThresholdCentavos
      ? 0
      : settings.shippingFlatRateCentavos;
  return { tax, shipping };
}

// Public query: storefront reads this to display shipping/tax and totals.
export const getShopSettings = query({
  args: {},
  handler: async (ctx): Promise<ShopSettings> => {
    return await readShopSettings(ctx);
  },
});

// Admin-only mutation to update shop settings.
export const updateShopSettings = mutation({
  args: {
    taxRatePercent: v.number(),
    shippingFlatRateCentavos: v.number(),
    freeShippingThresholdCentavos: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (args.taxRatePercent < 0 || args.taxRatePercent > 100) {
      throw new Error("Tax rate must be between 0 and 100 percent");
    }
    if (args.shippingFlatRateCentavos < 0 || args.freeShippingThresholdCentavos < 0) {
      throw new Error("Shipping values cannot be negative");
    }

    const value: ShopSettings = {
      taxRatePercent: args.taxRatePercent,
      shippingFlatRateCentavos: Math.round(args.shippingFlatRateCentavos),
      freeShippingThresholdCentavos: Math.round(args.freeShippingThresholdCentavos),
      currency: "PHP",
    };

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SHOP_SETTINGS_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("settings", {
        key: SHOP_SETTINGS_KEY,
        value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }

    await logAudit(ctx, {
      userId: admin._id,
      action: "update",
      resourceType: "settings",
      resourceId: SHOP_SETTINGS_KEY,
      changes: value,
    });

    return { success: true, settings: value };
  },
});
