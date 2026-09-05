"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, use, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, Smartphone } from "lucide-react";
import { profilePath } from "@/lib/profileUrl";
import { toUserMessage } from "@/lib/errors";
import { isPlanLimitError } from "@/lib/plans";
import { UpgradeGate } from "@/components/billing/UpgradeGate";
import Link from "next/link";

export default function TapRedirectPage({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = use(params);
  const uuid = resolvedParams.uuid;
  const router = useRouter();
  const card = useQuery(api.cards.getCardByUuid, { uuid });
  const incrementTap = useMutation(api.cards.incrementTapCount);
  const { isSignedIn, isLoaded: authLoaded, user } = useUser();
  // claimCardByUuid is a Convex action (not a mutation) so its rate-limit
  // bookkeeping survives a "card not found" rejection instead of being
  // rolled back with it — see convex/cards.ts. useAction keeps the same
  // calling convention as useMutation, so the .then()/.catch() below is
  // unchanged.
  const claimCard = useAction(api.cards.claimCardByUuid);
  const [claimFailed, setClaimFailed] = useState<string | null>(null);
  // True when claimFailed is a plan-limit rejection (e.g. the free plan's
  // 1-active-card cap) — renders the same "Get Pro" CTA as every other
  // gated surface instead of a dead-end error page.
  const [claimFailedLocked, setClaimFailedLocked] = useState(false);
  const claimingRef = useRef(false);

  // Resolve the linked profile so we can redirect to its vanity slug
  // instead of the bare /p/<id> fallback whenever one is set.
  const linkedProfile = useQuery(
    api.profiles.getProfile,
    card?.linkedProfileId ? { profileId: card.linkedProfileId } : "skip",
  );

  const incrementedRef = useRef(false);

  const errorMessage =
    claimFailed !== null
      ? claimFailed
      : card === null
        ? "This card ID was not found in our system."
        : card && card.status !== "inventory" && card.status !== "active"
          ? "This card is not available."
          : card && card.status === "active" && !card.linkedProfileId
            ? "This card is activated but not linked to any profile yet."
            : null;

  useEffect(() => {
    if (!card) return;

    if (card.status === "inventory") {
      /*
              Two paths, split on session state — and the split is
              load-bearing, not an optimization. A signed-in user routed to
              the signup page never RUNS a sign-up flow: Clerk sees the
              active session and bounces straight to fallbackRedirectUrl
              ("/dashboard"), and forceRedirectUrl — the only place
              card_uuid survives — fires exclusively on a COMPLETED auth
              flow. So for signed-in users the auth detour silently dropped
              the uuid and the card was never claimed. Claim it right here
              instead; only signed-out visitors take the auth detour.
            */
      if (!authLoaded) return;
      if (isSignedIn && user) {
        if (claimingRef.current || claimFailed) return;
        claimingRef.current = true;
        claimCard({ clerkId: user.id, uuid })
          .then(() => {
            router.replace("/dashboard/cards?claimed=1");
          })
          .catch((err: unknown) => {
            // toUserMessage handles the Convex transport-noise
            // unwrapping (and, on a real production deployment,
            // the further redaction of plain Error text down to
            // a bare "Server Error") — see lib/errors.ts. The
            // old inline regex here only ever worked in dev.
            setClaimFailed(toUserMessage(err));
            setClaimFailedLocked(isPlanLimitError(err));
          });
      } else {
        router.replace(`/auth?mode=signup&card_uuid=${encodeURIComponent(uuid)}`);
      }
    } else if (
      card.status === "active" &&
      card.linkedProfileId &&
      linkedProfile !== undefined &&
      !incrementedRef.current
    ) {
      // Success! Increment count only once. Wait for the linked
      // profile query to settle so we redirect to its slug when it
      // has one, rather than firing immediately on the bare id.
      incrementedRef.current = true;
      incrementTap({ cardId: card._id });
      router.replace(profilePath(linkedProfile ?? { _id: card.linkedProfileId, slug: undefined }));
    }
  }, [
    card,
    linkedProfile,
    router,
    incrementTap,
    uuid,
    authLoaded,
    isSignedIn,
    user,
    claimCard,
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
          // The upgrade CTA already carries the message — skip
          // the plain paragraph so it isn't shown twice.
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
