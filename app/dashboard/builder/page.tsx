"use client";

import { useState } from "react";
import { generateProfile } from "@/app/actions/generate-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Save } from "lucide-react";
import HeroModern from "@/components/templates/HeroModern";
import HeroLuxury from "@/components/templates/HeroLuxury";
import AgentBio from "@/components/templates/AgentBio";
import PropertyGrid from "@/components/templates/PropertyGrid";
import ContactForm from "@/components/templates/ContactForm";
import { ProfileData } from "@/types/profile";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

// Mock data for preview (since we haven't built the data entry forms yet)
// In a real app, this would also be editable or AI-generated
const DEFAULT_AGENT_INFO = {
    fullName: "Alexandra Sterling",
    title: "Senior Luxury Broker",
    company: "Portfolio Real Estate",
    phone: "+1 (555) 0123-4567",
    email: "alexandra@portfolio.re",
    website: "https://portfolio.re",
    avatarUrl: "", // Empty to trigger placeholder
    socialLinks: [],
};

const MOCK_PROPERTIES: any[] = [
    {
        id: "1", title: "Penthouse at The One", price: 4500000, status: "for-sale",
        imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000",
        detailsUrl: "#",
        location: "Downtown Skyline",
        beds: 3, baths: 3.5
    },
    {
        id: "2", title: "Modern Beachfront Villa", price: 2800000, status: "sold",
        imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=1000",
        detailsUrl: "#",
        location: "Malibu Coast",
        beds: 4, baths: 4
    }
];

export default function BuilderPage() {
    const router = useRouter();
    const createProfile = useMutation(api.profiles.createProfile);

    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedConfig, setGeneratedConfig] = useState<any>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);

        // Call Server Action
        const result = await generateProfile(prompt);

        if (result.success) {
            setGeneratedConfig(result.data);
        } else {
            alert("Failed to generate profile. Please try again.");
        }

        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!generatedConfig) return;
        setIsSaving(true);
        try {
            const profileId = await createProfile({
                name: "My AI Profile", // Could be dynamic
                agentInfo: DEFAULT_AGENT_INFO,
                layoutConfig: {
                    themeId: generatedConfig.themeId,
                    colorPalette: generatedConfig.colorPalette,
                    componentOrder: generatedConfig.componentOrder,
                    heroStyle: generatedConfig.heroStyle
                },
                featuredProperties: [] // No properties in DB yet, so sending empty
            });

            // Redirect to the public page (or dashboard)
            router.push(`/p/${profileId}`);
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save profile. Please ensure you are logged in.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderComponent = (componentId: string) => {
        const data: ProfileData = {
            agent: DEFAULT_AGENT_INFO,
            properties: MOCK_PROPERTIES,
            theme: {
                primaryColor: generatedConfig.colorPalette.primary,
                backgroundColor: generatedConfig.colorPalette.background,
                textColor: generatedConfig.colorPalette.text,
            }
        };

        switch (componentId) {
            case "Hero":
                if (generatedConfig.themeId === "luxury") return <HeroLuxury key="hero" data={data} />;
                return <HeroModern key="hero" data={data} />;
            case "Bio":
                return <AgentBio key="bio" data={data} />;
            case "Properties":
                return <PropertyGrid key="prop" data={data} />;
            case "Contact":
                return <ContactForm key="contact" data={data} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Left Panel: Controls */}
            <div className="w-1/3 flex flex-col gap-4">
                <h1 className="text-2xl font-bold">AI Profile Builder</h1>
                <p className="text-zinc-400 text-sm">Describe your desired style and our AI will build your site.</p>

                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-4">
                    <h3 className="font-medium text-sm">Your Vision</h3>
                    <Textarea
                        placeholder="e.g. I want a dark, mysterious luxury look with gold accents. I sell high-end condos."
                        className="bg-black border-zinc-700 min-h-[120px]"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-500 font-bold"
                        onClick={handleGenerate}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                        Generate Profile
                    </Button>
                </div>

                {generatedConfig && (
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-sm">Generated Configuration</h3>
                            <div className="text-xs px-2 py-1 bg-zinc-800 rounded uppercase">{generatedConfig.themeId}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="h-8 rounded" style={{ backgroundColor: generatedConfig.colorPalette.background }} title="Background"></div>
                            <div className="h-8 rounded" style={{ backgroundColor: generatedConfig.colorPalette.primary }} title="Primary"></div>
                            <div className="h-8 rounded" style={{ backgroundColor: generatedConfig.colorPalette.text }} title="Text"></div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full border-zinc-700 hover:bg-zinc-800 text-green-500"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save & Publish
                        </Button>
                    </div>
                )}
            </div>

            {/* Right Panel: Preview */}
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-zinc-800 px-4 py-2 text-xs font-mono text-zinc-400 border-b border-zinc-700 flex justify-between items-center">
                    <span>PREVIEW MODE</span>
                    <span>iPhone 15 Pro Max</span>
                </div>

                <div className="flex-1 overflow-y-auto bg-black relative">
                    {generatedConfig ? (
                        <div className="max-w-[440px] mx-auto min-h-full bg-white shadow-2xl overflow-hidden" style={{ backgroundColor: generatedConfig.colorPalette.background }}>
                            {generatedConfig.componentOrder.map((componentId: string) => renderComponent(componentId))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                            <Wand2 className="w-12 h-12 mb-4 opacity-20" />
                            <p>Enter a prompt to generate a preview</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
