"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Default from "@/components/templates/Default";
import { ProfileData, ProfileType } from "@/types/profile";
import { Loader2 } from "lucide-react";
import { use } from "react";

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    return <PublicProfileContent profileId={resolvedParams.id} />;
}

function PublicProfileContent({ profileId }: { profileId: string }) {
    const profile = useQuery(api.profiles.getProfile, { profileId: profileId as Id<"profiles"> });

    if (profile === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (profile === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <h1 className="text-2xl font-bold">Profile Not Found</h1>
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
        theme: {
            primaryColor: layoutConfig.colorPalette.primary,
            backgroundColor: layoutConfig.colorPalette.background,
            textColor: layoutConfig.colorPalette.text,
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: layoutConfig.colorPalette.background }}
        >
            <Default data={data} />

            <div className="py-6 text-center text-xs opacity-50" style={{ color: layoutConfig.colorPalette.text }}>
                Powered by TapFolio
            </div>
        </div>
    );
}
