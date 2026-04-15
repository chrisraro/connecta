"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import HeroModern from "@/components/templates/HeroModern";
import HeroLuxury from "@/components/templates/HeroLuxury";
import AgentBio from "@/components/templates/AgentBio";
import PropertyGrid from "@/components/templates/PropertyGrid";
import ProjectGrid from "@/components/templates/ProjectGrid";
import ContactForm from "@/components/templates/ContactForm";
import { ProfileData } from "@/types/profile";
import { Loader2 } from "lucide-react";
import { use } from "react";

// Wrapper to handle params unwrapping for Next.js 15
// Note: In Next.js 15, params is a Promise that needs to be unwrapped.
// However, creating a separate client component for the logic is safer.

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

    // Mock properties for now since we haven't built the property manager
    const MOCK_PROPERTIES: any[] = [
        {
            id: "1", title: "Excluded Villa", price: 4500000, status: "for-sale",
            imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
            detailsUrl: "#",
        }
    ];

    const data: ProfileData = {
        agent: agentInfo,
        properties: MOCK_PROPERTIES, // In future: fetch via featuredProperties IDs
        projects: profile.featuredProjects ? [] : [], // In future: fetch via featuredProjects IDs
        theme: {
            primaryColor: layoutConfig.colorPalette.primary,
            backgroundColor: layoutConfig.colorPalette.background,
            textColor: layoutConfig.colorPalette.text,
        }
    };

    const renderComponent = (componentId: string) => {
        switch (componentId) {
            case "Hero":
                if (layoutConfig.themeId === "luxury") return <HeroLuxury key="hero" data={data} />;
                return <HeroModern key="hero" data={data} />;
            case "Bio":
                return <AgentBio key="bio" data={data} />;
            case "Properties":
                return <PropertyGrid key="prop" data={data} />;
            case "Projects":
                return <ProjectGrid key="proj" data={data} />;
            case "Contact":
                return <ContactForm key="contact" data={data} />;
            default:
                return null;
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: layoutConfig.colorPalette.background }}
        >
            {layoutConfig.componentOrder.map((compId: string) => renderComponent(compId))}

            <div className="py-6 text-center text-xs opacity-50" style={{ color: layoutConfig.colorPalette.text }}>
                Powered by TapFolio
            </div>
        </div>
    );
}
