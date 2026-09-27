/**
 * The single source of truth for every price shown in the app.
 *
 * DECISION (owner, 2026-09-27): the homepage (components/landing/Pricing.tsx)
 * is where these numbers were first confirmed, and every other surface --
 * the dashboard billing page, the paywall, admin settings -- must read them
 * from here instead of keeping its own copy. Two constants for the same price
 * are two constants that will eventually disagree.
 *
 * Amounts are whole pesos, matching how a human reads a price tag. Multiply
 * by 100 when a database column or PlanPricing needs centavos.
 *
 * The NFC card is a one-time purchase, not a subscription tier -- it has no
 * monthly/yearly split.
 */
export const PRICING = {
  card: { standard: 888, prelaunch: 799 },
  leadTools: {
    monthly: { standard: 79, prelaunch: 49 },
    yearly: { standard: 799, prelaunch: 499 },
  },
  teams: {
    monthly: { standard: 299, prelaunch: 249 },
    yearly: { standard: 3199, prelaunch: 2699 },
  },
} as const;

export type BillingCycle = "monthly" | "yearly";
