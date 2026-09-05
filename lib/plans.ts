/**
 * Frontend re-export of the plan definitions in convex/plans.ts.
 *
 * The Convex bundler keeps its sources inside convex/; this thin copy lets
 * React components import plan limits without crossing that boundary. The two
 * files MUST be kept in sync. Server enforcement always uses convex/plans.ts —
 * anything here is for cosmetic UI gating only.
 */

import { ConvexError } from "convex/values";
import { CONNECTA } from "@/lib/brand";

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  id: PlanId;
  name: string;
  priceCentavos: number;
  maxProfiles: number | null;
  maxActiveCards: number | null;
  allowedTemplateIds: string[] | null;
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

/**
 * Cosmetic UI gate for the builder's template picker: true when `templateId`
 * is NOT in the plan's `allowedTemplateIds` (`null` means "no restriction" —
 * every plan without a template allowlist, i.e. pro/business). This is
 * UI-only; convex/profiles.ts's `createProfile` is the actual source of
 * truth and re-enforces the same rule server-side on save.
 */
export function isTemplateLocked(templateId: string, allowedTemplateIds: string[] | null): boolean {
  return allowedTemplateIds !== null && !allowedTemplateIds.includes(templateId);
}

/**
 * Detects a plan-limit rejection (profile count, active-card count, locked
 * template) from convex/cards.ts / convex/profiles.ts. Those throw
 * `ConvexError({ code: "PLAN_LIMIT", message })` specifically so the signal
 * survives production's redaction of plain Error messages — see
 * lib/errors.ts#toUserMessage and lib/nfc.ts#isDuplicateRegistrationError,
 * which establish the same "check ConvexError.data.code, never the message
 * text" pattern for the same reason. A regex against `.message` would only
 * ever fire in dev, where nothing redacts it.
 */
export function isPlanLimitError(err: unknown): boolean {
  if (!(err instanceof ConvexError)) return false;
  const data = err.data as { code?: unknown } | undefined;
  return typeof data === "object" && data !== null && data.code === "PLAN_LIMIT";
}
