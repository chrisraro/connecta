import { newestProfileId } from "./builderEntry";

export interface ClaimState {
  isAuthLoaded: boolean;
  cardUuid: string | null | undefined;
  userId: string | null | undefined;
  cardClaimed: boolean;
  isClaiming: boolean;
  claimError: string | null;
}

/**
 * Whether the onboarding page should try to claim the card in its link.
 *
 * A failed claim stops here: retrying on its own looped until claim_card's
 * rate limit tripped. Clearing claimError is the way to try again.
 */
export function shouldAttemptClaim(s: ClaimState): boolean {
  return (
    s.isAuthLoaded &&
    Boolean(s.cardUuid) &&
    Boolean(s.userId) &&
    !s.cardClaimed &&
    !s.isClaiming &&
    s.claimError === null
  );
}

/**
 * The profile a freshly claimed card links to (confirmed 2026-09-25: link
 * automatically; the owner can change it on the Cards page). The newest
 * profile, the same one every other "which profile" choice uses.
 */
export function autoLinkTarget(
  profiles: readonly { id: string; created_at: string }[] | undefined,
): string | null {
  return profiles ? newestProfileId(profiles) : null;
}

export type LinkState = "idle" | "linking" | "linked" | "failed";

/**
 * Whether onboarding should link a card claimed by someone who already
 * finished setup. First-run and edit-mode setups link it on Finish instead.
 */
export function shouldAutoLinkReturningClaim(s: {
  claimedCardId: string | null;
  onboardingCompleted: boolean;
  isEditMode: boolean;
  profilesLoaded: boolean;
  linkState: LinkState;
}): boolean {
  return (
    Boolean(s.claimedCardId) &&
    s.onboardingCompleted &&
    !s.isEditMode &&
    s.profilesLoaded &&
    s.linkState === "idle"
  );
}

type ClaimNotice = "linked" | "unlinked";

/** Where the tap page sends a signed-in owner after claiming a card. */
export function claimedCardsHref(linked: boolean): string {
  return `/dashboard/cards?claimed=${linked ? "linked" : "unlinked"}`;
}

/** The Cards page's reading of that redirect. */
export function claimNotice(param: string | null): ClaimNotice | null {
  return param === "linked" || param === "unlinked" ? param : null;
}
