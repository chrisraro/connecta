"use client";

import { useRouter } from "next/navigation";
import { useEffect, use, useRef, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCardByUuid, useClaimCard, useLinkCardProfile, useRecordTap } from "@/hooks/useCards";
import { useMyProfiles, useProfile } from "@/hooks/useProfiles";
import { autoLinkTarget, claimedCardsHref } from "@/lib/cardClaim";
import { profilePath } from "@/lib/profileUrl";
import { toUserMessage } from "@/lib/errors";
import { isPlanLimitError } from "@/lib/plans";
import { UpgradeGate } from "@/components/billing/UpgradeGate";

/**
 * Where a physical tag lands.
 *
 * This is the cutover validation for the whole migration: tag 43:45:08:03 is
 * programmed with a URL that cannot be changed without physically rewriting
 * the tag, so /t/<uuid> must resolve.
 */
export default function TapRedirectPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid: rawUuid } = use(params);
  // Tag serials are colon-separated hex ("43:45:08:03"). If anything along
  // the way percent-encodes the colons, the database lookup would receive
  // "43%3A45..." -- which no normalization there can repair -- and a valid
  // card would read as "not found". Decoding is a no-op when nothing was
  // encoded; a malformed sequence falls back to the raw value.
  const uuid = (() => {
    try {
      return decodeURIComponent(rawUuid);
    } catch {
      return rawUuid;
    }
  })();
  const router = useRouter();

  const { data: card, isPending: cardPending, isError: cardError } = useCardByUuid(uuid);
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const claimCard = useClaimCard();
  const linkCard = useLinkCardProfile();
  const recordTap = useRecordTap();
  // A claimed card links straight to the owner's newest profile (B3). Only
  // fetched for a signed-in visitor; waited on so the link isn't skipped.
  const { data: myProfiles, isPending: myProfilesPending } = useMyProfiles();

  const [claimFailed, setClaimFailed] = useState<string | null>(null);
  // True when the rejection was a plan-limit one (the free plan cap of one
  // active card), so the same upgrade CTA every other gated surface uses is
  // rendered instead of a dead-end error page.
  const [claimFailedLocked, setClaimFailedLocked] = useState(false);
  const claimingRef = useRef(false);
  const tappedRef = useRef(false);

  // Only resolve the linked profile once there is one, so the redirect can use
  // the vanity slug instead of the bare /p/<id> fallback.
  const { data: linkedProfile, isPending: profilePending } = useProfile(card?.linked_profile_id);

  const errorMessage =
    claimFailed !== null
      ? claimFailed
      : cardError
        ? "We could not look up this card. Please try again."
        : !cardPending && card === null
          ? "This card ID was not found in our system."
          : card && card.status !== "inventory" && card.status !== "active"
            ? "This card is not available."
            : card && card.status === "active" && !card.linked_profile_id
              ? "This card is activated but not linked to any profile yet."
              : null;

  useEffect(() => {
    if (!card) return;

    if (card.status === "inventory") {
      /*
        Two paths, split on session state, and the split is load-bearing
        rather than an optimisation. Sending a SIGNED-IN user to the signup
        page never runs a signup flow -- the auth page sees the live session
        and bounces straight to /dashboard, and card_uuid only survives on a
        COMPLETED auth flow. So for signed-in users the detour silently
        dropped the uuid and the card was never claimed. Claim it right here
        instead; only signed-out visitors take the detour.
      */
      if (!authLoaded) return;

      if (isSignedIn) {
        if (claimingRef.current || claimFailed || myProfilesPending) return;
        claimingRef.current = true;
        claimCard
          .mutateAsync(uuid)
          .then(async (cardId) => {
            const target = autoLinkTarget(myProfiles);
            let linked = false;
            if (target) {
              try {
                await linkCard.mutateAsync({ cardId, profileId: target });
                linked = true;
              } catch {
                // The Cards page says it isn't linked and offers the picker.
              }
            }
            router.replace(claimedCardsHref(linked));
          })
          .catch((err: unknown) => {
            setClaimFailed(toUserMessage(err));
            setClaimFailedLocked(isPlanLimitError(err));
          });
      } else {
        router.replace(`/auth?mode=signup&card_uuid=${encodeURIComponent(uuid)}`);
      }
      return;
    }

    if (card.status === "active" && card.linked_profile_id && !tappedRef.current) {
      // Wait for the profile lookup to settle so the redirect uses the slug
      // when there is one, rather than firing immediately on the bare id.
      if (profilePending) return;
      tappedRef.current = true;
      // Deliberately not awaited: a failed vanity counter must never delay or
      // block the redirect a person is standing there waiting for.
      recordTap.mutate(uuid);
      router.replace(profilePath(linkedProfile ?? { id: card.linked_profile_id, slug: undefined }));
    }
  }, [
    card,
    linkedProfile,
    profilePending,
    router,
    uuid,
    authLoaded,
    isSignedIn,
    claimCard,
    linkCard,
    myProfiles,
    myProfilesPending,
    recordTap,
    claimFailed,
  ]);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <Smartphone className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Card Not Ready</h1>
        {claimFailed && claimFailedLocked ? (
          // The upgrade CTA already carries the message, so the plain
          // paragraph is skipped to avoid showing it twice.
          <div className="w-full max-w-xs mb-8">
            <UpgradeGate locked reason={claimFailed} variant="banner" />
          </div>
        ) : (
          <>
            <p className="text-muted-foreground max-w-xs mb-8">{errorMessage}</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Link
                href="/"
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-center"
              >
                Learn More
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground animate-pulse">Redirecting to profile...</p>
    </div>
  );
}
