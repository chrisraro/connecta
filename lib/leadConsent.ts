/*
 * Consent on the lead form (L-8; wording approved by the Data Protection
 * Officer, 2026-09-27). Under RA 10173 a visitor's details are collected on
 * their consent, so the form asks for it, /api/leads refuses a visitor
 * submission without it, and each lead records when consent was given and
 * to which wording (consent_at, consent_version).
 */

/** The approved wording's version. Change it whenever the wording changes. */
export const CONSENT_VERSION = "2026-09-27";

/**
 * Why a submission can't be accepted, or null. A visitor must have agreed.
 * An owner's own capture is not blocked here: leads queued offline before
 * consent existed must still sync (new captures ask the owner to confirm).
 */
export function consentProblem({
  selfCapture,
  consent,
}: {
  selfCapture: boolean;
  consent: unknown;
}): "CONSENT_REQUIRED" | null {
  if (selfCapture) return null;
  return consent === true ? null : "CONSENT_REQUIRED";
}

/** The version to record with a lead, only when consent was actually given. */
export function consentVersionFor(consent: unknown): string | undefined {
  return consent === true ? CONSENT_VERSION : undefined;
}
