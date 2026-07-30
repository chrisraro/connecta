"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, use, useRef } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { profilePath } from "@/lib/profileUrl";

export default function TapRedirectPage({ params }: { params: Promise<{ uuid: string }> }) {
    const resolvedParams = use(params);
    const uuid = resolvedParams.uuid;
    const router = useRouter();
    const card = useQuery(api.cards.getCardByUuid, { uuid });
    const incrementTap = useMutation(api.cards.incrementTapCount);
    const [error, setError] = useState<string | null>(null);

    // Resolve the linked profile so we can redirect to its vanity slug
    // instead of the bare /p/<id> fallback whenever one is set.
    const linkedProfile = useQuery(
        api.profiles.getProfile,
        card?.linkedProfileId ? { profileId: card.linkedProfileId } : "skip"
    );

    const incrementedRef = useRef(false);

    useEffect(() => {
        if (card === null) {
            setError("This card ID was not found in our system.");
        } else if (card) {
            if (card.status === "inventory") {
                // Unactivated card - redirect to signup with card_uuid for activation flow
                router.replace(`/auth?mode=signup&card_uuid=${encodeURIComponent(uuid)}`);
            } else if (card.status !== "active") {
                setError("This card is not available.");
            } else if (!card.linkedProfileId) {
                setError("This card is activated but not linked to any profile yet.");
            } else if (linkedProfile !== undefined && !incrementedRef.current) {
                // Success! Increment count only once. Wait for the linked
                // profile query to settle so we redirect to its slug when it
                // has one, rather than firing immediately on the bare id.
                incrementedRef.current = true;
                incrementTap({ cardId: card._id });
                router.replace(
                    profilePath(linkedProfile ?? { _id: card.linkedProfileId, slug: undefined })
                );
            }
        }
    }, [card, linkedProfile, router, incrementTap, uuid]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                    <Smartphone className="w-10 h-10 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Card Not Ready</h1>
                <p className="text-muted-foreground max-w-xs mb-8">{error}</p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <a
                        href="/"
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        Learn More
                    </a>
                </div>
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
