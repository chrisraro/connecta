/**
 * Frontend re-export of the plan definitions in convex/plans.ts.
 *
 * The Convex bundler keeps its sources inside convex/; this thin copy lets
 * React components import plan limits without crossing that boundary. The two
 * files MUST be kept in sync. Server enforcement always uses convex/plans.ts —
 * anything here is for cosmetic UI gating only.
 */

import { CONNECTA } from "@/lib/brand";
import { errorCode } from "@/lib/errors";
import { DEFAULT_CARD_SKIN, type CardSkinId } from "@/lib/cardSkins";

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  id: PlanId;
  name: string;
  priceCentavos: number;
  maxProfiles: number | null;
  maxActiveCards: number | null;
  allowedTemplateIds: string[] | null;
  /** Card skins the plan may pick; null = every skin. Free keeps only the default. */
  allowedCardSkins: CardSkinId[] | null;
  leadViewCap: number | null;
  showBranding: boolean;
  canExportLeads: boolean;
  hasTeam: boolean;
  teamSeats: number;
  features: string[];
}

export const PLAN_PERIOD_DAYS = 30;
export const PLAN_GRACE_DAYS = 3;
export const FREE_TEMPLATE_IDS = ["editorial", "architectural"];

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    priceCentavos: 0,
    maxProfiles: 1,
    maxActiveCards: 1,
    allowedTemplateIds: FREE_TEMPLATE_IDS,
    allowedCardSkins: [DEFAULT_CARD_SKIN],
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
    allowedCardSkins: null,
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
    allowedCardSkins: null,
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

/**
 * Cosmetic UI gate for the builder's template picker: true when `templateId`
 * is NOT in the plan's `allowedTemplateIds` (`null` means "no restriction" —
 * every plan without a template allowlist, i.e. pro/business). This is
 * UI-only: the Supabase backend does not re-enforce it on save (the Convex
 * createProfile check it once relied on is gone).
 */
export function isTemplateLocked(templateId: string, allowedTemplateIds: string[] | null): boolean {
  return allowedTemplateIds !== null && !allowedTemplateIds.includes(templateId);
}

/**
 * Cosmetic UI gate for the card skin picker (confirmed 2026-09-24: every skin
 * except the default is subscription-only, on the digital card as well as
 * print). Like isTemplateLocked, this is UI-only today; no database check
 * re-enforces it yet.
 */
export function isCardSkinLocked(skin: CardSkinId, allowedCardSkins: CardSkinId[] | null): boolean {
  return allowedCardSkins !== null && !allowedCardSkins.includes(skin);
}

/**
 * Detects a plan-limit rejection (profile count, active-card count, locked
 * template).
 *
 * The database raises these with `detail = PLAN_LIMIT` -- a stable machine
 * code alongside the human sentence in `message` -- so the UI can show its
 * upgrade CTA instead of a dead-end error. Matching on the message text would
 * break the first time somebody rewords it, which is exactly the kind of
 * change nobody expects to alter behaviour.
 */
export function isPlanLimitError(err: unknown): boolean {
  return errorCode(err) === "PLAN_LIMIT";
}

/**
 * Plan prices in centavos, overridable from the settings table.
 *
 * These constants are the fallback, not the source of truth: an admin can
 * change pricing without a deploy, and a missing or malformed settings row
 * falls back here rather than rendering a blank or NaN price.
 */
export type PlanPricing = Record<"pro" | "business", number>;

export const DEFAULT_PLAN_PRICING: PlanPricing = {
  pro: PLAN_LIMITS.pro.priceCentavos,
  business: PLAN_LIMITS.business.priceCentavos,
};
