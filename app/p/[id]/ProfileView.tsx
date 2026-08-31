"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileRenderer } from "@/components/templates/ProfileRenderer";
import { StorefrontView } from "@/components/templates/StorefrontView";
import { ProfileData, ProfileType, DigitalCardConfig } from "@/types/profile";
import { Loader2, SearchX, QrCode, Store, UserCheck } from "lucide-react";
import { DigitalCardModal } from "@/components/ui/DigitalCardModal";
import Link from "next/link";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";
import { Button } from "@/components/ui/button";

/**
 * Client renderer for a public profile, shared by both the `/p/<id>`
 * back-compat route and the `/<slug>` vanity route. The parent server
 * component owns data-fetching for `generateMetadata`; this component
 * re-fetches reactively via `useQuery` so edits made in the builder show
 * up live without a full page reload.
 */
export function ProfileView({ lookup }: { lookup: { by: "id"; profileId: string } | { by: "slug"; slug: string } }) {
    const [activeTab, setActiveTab] = useState<"portfolio" | "storefront">("portfolio");
    const [showCardModal, setShowCardModal] = useState(false);

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
                    <ConnectaMark className="h-4 w-4" />
                    Go to {CONNECTA.name}
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
        propertyListings: profile.propertyListings,
        inlineProjects: profile.inlineProjects,
        componentOrder: layoutConfig.componentOrder,
        resolvedImages: profile.resolvedImages,
        theme: {
            primaryColor: profile.teamBranding?.accentColor || layoutConfig.colorPalette.primary,
            backgroundColor: layoutConfig.colorPalette.background,
            textColor: layoutConfig.colorPalette.text,
            secondaryColor: layoutConfig.colorPalette.secondary,
            accentColor: profile.teamBranding?.accentColor || layoutConfig.colorPalette.accent,
        },
        digitalCard: profile.digitalCard as DigitalCardConfig | undefined,
        showStorefront: profile.showStorefront,
    };

    // `profile.services` (the top-level structured catalog) is never
    // populated by anything in the product — agentInfo.services (the
    // builder's actual "Services" tag editor) is the authoritative source
    // (Task 13 / audit-dataflow.md #1). Checking the dead field here meant a
    // profile with only tag-based services (no products) never auto-showed
    // its Storefront tab even though StorefrontView renders those tags fine.
    const hasCatalogItems = (profile.products && profile.products.length > 0) || (agentInfo.services && agentInfo.services.length > 0);
    const isStorefrontEnabled = profile.showStorefront !== false && (profile.showStorefront || hasCatalogItems);

    return (
        <div
            className="min-h-screen flex flex-col relative"
            style={{ backgroundColor: layoutConfig.colorPalette.background }}
        >
            {/* ─── Top Navigation Header (Portfolio vs. Storefront) ─── */}
            {isStorefrontEnabled && (
                <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/60 py-2.5 px-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-2xl border border-border/80 mx-auto">
                        <button
                            onClick={() => setActiveTab("portfolio")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                activeTab === "portfolio"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            Portfolio
                        </button>
                        <button
                            onClick={() => setActiveTab("storefront")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                                activeTab === "storefront"
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Store className="w-3.5 h-3.5" />
                            Storefront &amp; Services
                        </button>
                    </div>

                    <Button
                        onClick={() => setShowCardModal(true)}
                        size="sm"
                        className="hidden sm:flex items-center gap-1.5 text-xs font-bold rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black shadow-md"
                    >
                        <QrCode className="w-3.5 h-3.5" />
                        Digital Card
                    </Button>
                </div>
            )}



            {/* ─── Digital Card Modal ─────────────────────────────── */}
            <DigitalCardModal
                open={showCardModal}
                onOpenChange={setShowCardModal}
                agent={agentInfo}
                profileId={profileIdForCard}
                profileSlug={profile.slug}
                digitalCardConfig={profile.digitalCard}
                isOwner={false}
            />

            {/* ─── Content Render (Portfolio OR Storefront) ───────── */}
            {activeTab === "storefront" && isStorefrontEnabled ? (
                <StorefrontView data={data} />
            ) : (
                <ProfileRenderer data={data} templateId={layoutConfig.themeId} />
            )}

            {profile.showBranding !== false && (
                <div className="py-6 text-center text-xs mt-auto" style={{ color: layoutConfig.colorPalette.text }}>
                    <Link href="/" className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                        <span>Powered by</span>
                        <span className="font-bold">{CONNECTA.name}</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
