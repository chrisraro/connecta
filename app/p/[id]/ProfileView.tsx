"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileRenderer } from "@/components/templates/ProfileRenderer";
import { ProfileData, ProfileType } from "@/types/profile";
import { Loader2, SmartphoneNfc, SearchX } from "lucide-react";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import Link from "next/link";
import { HERALD } from "@/lib/brand";

/**
 * Client renderer for a public profile, shared by both the `/p/<id>`
 * back-compat route and the `/<slug>` vanity route. The parent server
 * component owns data-fetching for `generateMetadata`; this component
 * re-fetches reactively via `useQuery` so edits made in the builder show
 * up live without a full page reload.
 */
export function ProfileView({ lookup }: { lookup: { by: "id"; profileId: string } | { by: "slug"; slug: string } }) {
    const byId = useQuery(
        api.profiles.getProfile,
        lookup.by === "id" ? { profileId: lookup.profileId as Id<"profiles"> } : "skip"
    );
    const bySlug = useQuery(
        api.profiles.getProfileBySlug,
        lookup.by === "slug" ? { slug: lookup.slug } : "skip"
    );
    const profile = lookup.by === "id" ? byId : bySlug;
    const profileIdForCard = lookup.by === "id" ? lookup.profileId : (profile?._id as string | undefined) ?? "";

    if (profile === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="sr-only">Loading profile…</span>
            </div>
        );
    }

    if (profile === null) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center text-foreground">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                    <SearchX className="h-8 w-8" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Profile not found</h1>
                <p className="mt-2 max-w-sm text-muted-foreground">
                    This profile may have been removed or the link is incorrect.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    <SmartphoneNfc className="h-4 w-4" aria-hidden="true" />
                    Go to {HERALD.name}
                </Link>
            </div>
        );
    }

    const { layoutConfig, agentInfo } = profile;

    const data: ProfileData = {
        ownerId: profile.ownerId,
        name: profile.name,
        profileType: (profile.profileType || "individual") as ProfileType,
        agent: agentInfo,
        properties: [],
        projects: [],
        products: profile.products,
        services: profile.services,
        propertyListings: (profile as any).propertyListings,
        inlineProjects: (profile as any).inlineProjects,
        componentOrder: layoutConfig.componentOrder,
        resolvedImages: (profile as any).resolvedImages,
        theme: {
            primaryColor: profile.teamBranding?.accentColor || layoutConfig.colorPalette.primary,
            backgroundColor: layoutConfig.colorPalette.background,
            textColor: layoutConfig.colorPalette.text,
            secondaryColor: (layoutConfig.colorPalette as any).secondary,
            accentColor: profile.teamBranding?.accentColor || (layoutConfig.colorPalette as any).accent,
        },
        digitalCard: (profile as any).digitalCard,
    };

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ backgroundColor: layoutConfig.colorPalette.background }}
        >
            {(profile as any).digitalCard && (
                <div className="w-full max-w-lg mx-auto px-4 pt-6 flex justify-center">
                    <DigitalBusinessCard
                        fullName={agentInfo.fullName}
                        title={agentInfo.title}
                        company={agentInfo.company}
                        phone={agentInfo.phone}
                        email={agentInfo.email}
                        additionalPhones={(agentInfo as any).additionalPhones}
                        additionalEmails={(agentInfo as any).additionalEmails}
                        services={agentInfo.services}
                        about={agentInfo.about}
                        profileId={profileIdForCard}
                        profileSlug={profile.slug}
                        config={(profile as any).digitalCard}
                    />
                </div>
            )}

            <ProfileRenderer data={data} templateId={layoutConfig.themeId} />

            {(profile as { showBranding?: boolean }).showBranding !== false && (
                <div className="py-6 text-center text-xs mt-auto" style={{ color: layoutConfig.colorPalette.text }}>
                    <Link
                        href="/"
                        className="opacity-50 transition-opacity hover:opacity-90"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Powered by {HERALD.name}
                    </Link>
                </div>
            )}
        </div>
    );
}
