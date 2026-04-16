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
import { ServicesGrid, ProductsGrid } from "@/components/templates/DynamicContent";
import { ProfileData, Property, ProfileType } from "@/types/profile";
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

    // Mock properties for now since we haven't built the property manager
    const MOCK_PROPERTIES: Property[] = [
        {
            id: "1", 
            ownerId: profile.ownerId,
            title: "Excluded Villa", 
            price: 4500000, 
            status: "for-sale",
            images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750"],
            detailsUrl: "#",
        }
    ];

    const data: ProfileData = {
        ownerId: profile.ownerId,
        name: profile.name,
        profileType: (profile.profileType || "individual") as ProfileType,
        agent: agentInfo,
        properties: MOCK_PROPERTIES, 
        projects: [], 
        products: profile.products,
        services: profile.services,
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
            case "Services":
                return <ServicesGrid key="services" data={data} />;
            case "Products":
                return <ProductsGrid key="products" data={data} />;
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
