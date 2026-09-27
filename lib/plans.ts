/**
 * Plan definitions used across the app.
 *
 * There is no Convex anymore: enforcement of the real limits (profile count,
 * active card count, template lock, team leads) lives in Postgres functions
 * and triggers (see supabase/migrations, e.g. 20260911000009_business_rules,
 * 20260911000017_effective_plan). What lives here is the client-side mirror
 * of those limits -- used for cosmetic UI gating (dimming a locked template,
 * showing an upgrade CTA) -- plus the plan names, prices and feature copy
 * shown on the billing page and the paywall. Keep this file's limits in sync
 * with the database; a mismatch only ever shows the wrong CTA, since the
 * database is what actually enforces the paywall.
 *
 * DECISION (owner, 2026-09-27): the app adopted the homepage plan names.
 * "Pro" is now "Lead tools" and "Business" is now "Teams" -- same limits,
 * new ids and copy. Prices come from lib/pricing.ts, the single source of
 * truth shared with components/landing/Pricing.tsx.
 */

import { CONNECTA } from "@/lib/brand";
import { errorCode } from "@/lib/errors";
import { DEFAULT_CARD_SKIN, type CardSkinId } from "@/lib/cardSkins";
import { PRICING } from "@/lib/pricing";

export type PlanId = "free" | "lead_tools" | "teams";

export interface PlanLimits {
  id: PlanId;
  name: string;
  /** Standard (non-prelaunch) monthly price, in centavos. */
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
  lead_tools: {
    id: "lead_tools",
    name: "Lead tools",
    priceCentavos: PRICING.leadTools.monthly.standard * 100,
    maxProfiles: null,
    maxActiveCards: null,
    allowedTemplateIds: null,
    allowedCardSkins: null,
    leadViewCap: null,
    showBranding: false,
    canExportLeads: true,
    hasTeam: false,
    teamSeats: 0,
    // Honest about what exists today (2026-09-27): no follow-up reminders or
    // analytics yet, so they are not listed as included. They may return here
    // as clearly-labelled "Coming soon" items once built.
    features: [
      "Unlimited leads",
      "Export your leads",
      "All profile styles and card skins",
      "No product branding on your profile",
      "Unlimited profiles and cards",
    ],
  },
  teams: {
    id: "teams",
    name: "Teams",
    priceCentavos: PRICING.teams.monthly.standard * 100,
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
      "Everything in Lead tools",
      "Up to 5 seats",
      "Shared team branding",
      "One team lead pool",
    ],
  },
};

/**
 * Cosmetic UI gate for the builder's template picker: true when `templateId`
 * is NOT in the plan's `allowedTemplateIds` (`null` means "no restriction" --
 * every plan without a template allowlist, i.e. lead_tools/teams). This is
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
 *
 * Scope of the override (decided here, since there was no existing answer):
 * it replaces the STANDARD monthly price only. The prelaunch monthly price
 * and both yearly prices stay fixed constants in lib/pricing.ts. There is no
 * billing engine yet to recompute a yearly or prelaunch discount from an
 * arbitrary edited monthly number, and letting the admin edit only the one
 * price that every other price is quoted against (as a struck-through
 * "standard" beside the real prelaunch price) keeps the override meaningful
 * without inventing pricing rules nobody asked for.
 */
export type PlanPricing = Record<"lead_tools" | "teams", number>;

export const DEFAULT_PLAN_PRICING: PlanPricing = {
  lead_tools: PLAN_LIMITS.lead_tools.priceCentavos,
  teams: PLAN_LIMITS.teams.priceCentavos,
};
