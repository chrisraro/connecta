/**
 * Pure decision logic for the Settings page's "Delete Account" flow (Task 4,
 * finding 1). `deleteMyAccount` (convex/users.ts) always erases Convex data
 * first — that part is atomic and unconditional — then attempts to delete
 * the Clerk identity itself, which can degrade (unset CLERK_SECRET_KEY, or
 * Clerk's API failing/unreachable) without the data erasure being rolled
 * back. `identityDeletion.status` tells the caller which happened.
 *
 * The Settings page's dialog promises deletion "per privacy regulations
 * (RA 10173)". Silently signing the user out and redirecting on a degraded
 * outcome is indistinguishable from full success — nobody without devtools
 * open would learn their Clerk identity is still live and they can sign
 * back in. This function decides what the page must show instead.
 */

export type IdentityDeletionStatus = "deleted" | "pending_configuration" | "failed";

export interface IdentityDeletionResult {
  status: IdentityDeletionStatus;
  message: string;
}

export interface DeletionOutcomeUI {
  /** True when the user must be warned before/instead of a silent redirect. */
  showWarningToast: boolean;
  /** Text to show in that warning — the server's own message. Null when no warning is needed. */
  toastMessage: string | null;
  /**
   * How long to hold the current screen before signing out and redirecting,
   * so a shown warning is actually readable rather than a flash before
   * navigation. 0 for the success path (redirect immediately, nothing to read).
   */
  redirectDelayMs: number;
}

// Long enough to read a full sentence of warning text before the tab
// navigates away and the toast (and everything on the page) disappears
// with it.
export const DEGRADED_REDIRECT_DELAY_MS = 4000;

export function decideDeletionOutcome(identityDeletion: IdentityDeletionResult): DeletionOutcomeUI {
  if (identityDeletion.status === "deleted") {
    return { showWarningToast: false, toastMessage: null, redirectDelayMs: 0 };
  }
  return {
    showWarningToast: true,
    toastMessage: identityDeletion.message,
    redirectDelayMs: DEGRADED_REDIRECT_DELAY_MS,
  };
}
