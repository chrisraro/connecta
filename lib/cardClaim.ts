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
