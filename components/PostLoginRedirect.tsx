"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";

/**
 * Post-login redirect component
 * Checks if user is admin and redirects accordingly:
 * - Admins → /admin
 * - Regular users → /dashboard
 * - Regular users arriving from a card QR scan (card_uuid present) →
 *   /dashboard/onboarding, whose claim effect activates the card.
 *
 * card_uuid forwarding is load-bearing: this component is the middle link of
 * the QR activation chain (/t/<uuid> → /auth → here → claim). It used to
 * hard-code its destinations, which dropped the param and broke QR
 * activation end-to-end even though every other link worked.
 */
function PostLoginRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const cardUuid = searchParams.get("card_uuid");

  // Check admin status
  const adminStatus = useQuery(
    api.admin.checkAdminStatus,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    // If admin status check is complete
    if (adminStatus !== undefined && adminStatus !== null) {
      if (adminStatus.isAdmin) {
        router.push("/admin");
      } else if (cardUuid) {
        router.push(
          `/dashboard/onboarding?card_uuid=${encodeURIComponent(cardUuid)}`
        );
      } else {
        router.push("/dashboard");
      }
    }
  }, [isLoaded, adminStatus, router, cardUuid]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
      <p className="text-sm text-muted-foreground">
        Checking your account...
      </p>
    </div>
  );
}

// useSearchParams requires a Suspense boundary during prerender.
export default function PostLoginRedirect() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
        </div>
      }
    >
      <PostLoginRedirectInner />
    </Suspense>
  );
}
