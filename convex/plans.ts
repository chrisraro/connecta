/**
 * Plan definitions & limits (server-authoritative source of truth).
 *
 * Imported by Convex functions (billing/enforcement) AND re-exported for the
 * frontend via lib/plans.ts (a thin copy) so the Convex bundler never needs to
 * reach outside the convex/ directory. Keep the two files in sync.
 *
 * Monetary values are in PHP centavos. Default prices are overridable by admins
 * via the settings table key `planPricing`.
 */

import { CONNECTA } from "../lib/brand";

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  id: PlanId;
  name: string;
  /** Default monthly price in centavos (admin-overridable via settings). */
  priceCentavos: number;
  /** Max profiles. null = unlimited. */
  maxProfiles: number | null;
  /** Max active cards. null = unlimited. */
  maxActiveCards: number | null;
  /** Template ids this plan may select. null = all templates. */
  allowedTemplateIds: string[] | null;
  /** Cap on how many stored leads are viewable. null = unlimited. */
  leadViewCap: number | null;
  /** Whether "Powered by Connecta" branding shows on public profile. */
  showBranding: boolean;
  /** Whether lead CSV export is available. */
  canExportLeads: boolean;
  /** Whether team workspace (B2B) features are available. */
  hasTeam: boolean;
  /** Seats included with the plan's team (business only). */
  teamSeats: number;
  /** Human-readable feature bullets for marketing/billing UI. */
  features: string[];
}

// Prepaid billing period length, in days, and the post-expiry grace window.
export const PLAN_PERIOD_DAYS = 30;
export const PLAN_GRACE_DAYS = 3;

// The two "basic" templates available on the Free plan. The template registry
// (components/templates/registry.ts) exposes ids: editorial, kinetic,
// architectural. "kinetic" (the premium neon look) is gated to paid plans.
export const FREE_TEMPLATE_IDS = ["editorial", "architectural"];

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    priceCentavos: 0,
    maxProfiles: 1,
    maxActiveCards: 1,
    allowedTemplateIds: FREE_TEMPLATE_IDS,
    leadViewCap: 100,
    showBranding: true,
    canExportLeads: false,
    hasTeam: false,
    teamSeats: 0,
    features: [
      "1 digital profile",
      "1 active NFC card",
      "2 basic templates",
      "Up to 100 leads",
      "NFC + QR sharing",
      `${CONNECTA.name} branding`,
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCentavos: 29900,
    maxProfiles: null,
    maxActiveCards: null,
    allowedTemplateIds: null,
    leadViewCap: null,
    showBranding: false,
    canExportLeads: true,
    hasTeam: false,
    teamSeats: 0,
    features: [
      "Unlimited profiles & cards",
      "All premium templates",
      "Branding removed",
      "Lead CSV export",
      "Full analytics",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceCentavos: 99900,
    maxProfiles: null,
    maxActiveCards: null,
    allowedTemplateIds: null,
    leadViewCap: null,
    showBranding: false,
    canExportLeads: true,
    hasTeam: true,
    teamSeats: 5,
    features: [
      "Everything in Pro",
      "Team workspace (5 seats)",
      "Shared team branding",
      "Team lead pool",
      "White-label profiles",
    ],
  },
};

export const DEFAULT_PLAN_PRICING: Record<"pro" | "business", number> = {
  pro: PLAN_LIMITS.pro.priceCentavos,
  business: PLAN_LIMITS.business.priceCentavos,
};
