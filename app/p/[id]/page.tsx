"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Editorial from "@/components/templates/Editorial";
import Kinetic from "@/components/templates/Kinetic";
import Architectural from "@/components/templates/Architectural";
import { ProfileData, ProfileType } from "@/types/profile";
import { Loader2 } from "lucide-react";
import { use } from "react";

// Template component map
const TEMPLATE_COMPONENTS = {
    editorial: Editorial,
    kinetic: Kinetic,
    architectural: Architectural,
};

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    return <PublicProfileContent profileId={resolvedParams.id} />;
}

function PublicProfileContent({ profileId }: { profileId: string }) {
    const profile = useQuery(api.profiles.getProfile, { profileId: profileId as Id<"profiles"> });

    if (profile === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (profile === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <h1 className="text-2xl font-bold text-gray-800">Profile Not Found</h1>
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

    // Get the template component based on themeId, fallback to Editorial
    const templateId = layoutConfig.themeId as keyof typeof TEMPLATE_COMPONENTS;
    const TemplateComponent = TEMPLATE_COMPONENTS[templateId] || Editorial;

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: layoutConfig.colorPalette.background }}
        >
            <TemplateComponent data={data} />

            <div className="py-6 text-center text-xs opacity-50" style={{ color: layoutConfig.colorPalette.text }}>
                Powered by TapFolio
            </div>
        </div>
    );
}
