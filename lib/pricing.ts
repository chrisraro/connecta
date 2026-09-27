/**
 * Prices shown to a visitor or a signed-in owner, in pesos.
 *
 * Single source (2026-09-27 owner decision): the landing page's Pricing
 * section and the onboarding plans/card-skin steps must show the exact same
 * numbers, so both read from here instead of keeping their own copies that
 * can drift. Confirmed 2026-09-24 (PRODUCT.md): a prelaunch price is shown as
 * the current price, with the standard price struck through next to it —
 * never the other way around.
 *
 * These are display constants. The actual, admin-overridable Pro/Business
 * plan prices used for billing come from lib/plans.ts DEFAULT_PLAN_PRICING /
 * hooks/useSettings.ts usePlanPricing — this file is for marketing copy and
 * the onboarding wizard's mention of card price, not billing enforcement.
 */

export interface PriceTier {
  standard: number;
  prelaunch: number;
}

export const PRICING = {
  card: { standard: 888, prelaunch: 799 } satisfies PriceTier,
  lead: {
    monthly: { standard: 79, prelaunch: 49 } satisfies PriceTier,
    yearly: { standard: 799, prelaunch: 499 } satisfies PriceTier,
  },
  team: {
    monthly: { standard: 299, prelaunch: 249 } satisfies PriceTier,
    yearly: { standard: 3199, prelaunch: 2699 } satisfies PriceTier,
  },
};

export function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH")}`;
}
