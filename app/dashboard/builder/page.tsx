"use client";

import { useState } from "react";
import { generateProfile } from "@/app/actions/generate-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, Save, Plus, Trash2, Smartphone, Monitor } from "lucide-react";
import HeroModern from "@/components/templates/HeroModern";
import HeroLuxury from "@/components/templates/HeroLuxury";
import AgentBio from "@/components/templates/AgentBio";
import PropertyGrid from "@/components/templates/PropertyGrid";
import ContactForm from "@/components/templates/ContactForm";
import { ProfileData } from "@/types/profile";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Default / Initial Data
const INITIAL_AGENT_INFO = {
    fullName: "Your Name",
    title: "Real Estate Agent",
    company: "Agency Name",
    phone: "",
    email: "",
    address: "", // Added Address Field
    website: "",
    avatarUrl: "",
    socialLinks: [],
};

export default function BuilderPage() {
    const router = useRouter();
    const createProfile = useMutation(api.profiles.createProfile);

    // UI State
    const [activeTab, setActiveTab] = useState("design");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Data State
    const [prompt, setPrompt] = useState("");
    const [agentInfo, setAgentInfo] = useState(INITIAL_AGENT_INFO);
    const [properties, setProperties] = useState<any[]>([]);

    // AI Configuration State (Theme, Colors, Order)
    const [generatedConfig, setGeneratedConfig] = useState<any>(null);

    // New Property Form State
    const [newProp, setNewProp] = useState({
        title: "", price: "", status: "for-sale", imageUrl: "", location: "", beds: "", baths: ""
    });

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        const result = await generateProfile(prompt);
        if (result.success) {
            setGeneratedConfig(result.data);
            setActiveTab("profile"); // Auto-switch to profile tab to encourage filling data
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
                name: agentInfo.fullName ? `${agentInfo.fullName}'s Profile` : "My Profile",
                agentInfo: agentInfo,
                layoutConfig: {
                    themeId: generatedConfig.themeId,
                    colorPalette: generatedConfig.colorPalette,
                    componentOrder: generatedConfig.componentOrder,
                    heroStyle: generatedConfig.heroStyle
                },
                featuredProperties: []
            });

            router.push(`/p/${profileId}`);
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save. Ensure you are logged in.");
        } finally {
            setIsSaving(false);
        }
    };

    const addProperty = () => {
        if (!newProp.title) return;
        const p = {
            id: Date.now().toString(),
            ...newProp,
            price: Number(newProp.price) || 0,
            beds: Number(newProp.beds) || 0,
            baths: Number(newProp.baths) || 0,
        };
        setProperties([...properties, p]);
        setNewProp({ title: "", price: "", status: "for-sale", imageUrl: "", location: "", beds: "", baths: "" });
    };

    const removeProperty = (id: string) => {
        setProperties(properties.filter(p => p.id !== id));
    };

    const renderComponent = (componentId: string) => {
        // Fallback for defaults if AI hasn't run
        const theme = generatedConfig?.colorPalette || { primary: "#000", background: "#fff", text: "#000" };

        const data: ProfileData = {
            agent: agentInfo,
            properties: properties,
            theme: {
                primaryColor: theme.primary,
                backgroundColor: theme.background,
                textColor: theme.text,
            }
        };

        const themeId = generatedConfig?.themeId || "modern";

        switch (componentId) {
            case "Hero":
                if (themeId === "luxury") return <HeroLuxury key="hero" data={data} />;
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
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] overflow-hidden bg-background text-foreground">
            {/* LEFT PANEL: EDITOR */}
            <div className="w-full lg:w-5/12 p-4 flex flex-col border-r border-border lg:overflow-y-auto h-auto lg:h-full bg-card">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-primary" />
                        Builder
                    </h1>
                    {generatedConfig && (
                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="font-bold">
                            {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Publish with {properties.length} Props
                        </Button>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid grid-cols-3 mb-4">
                        <TabsTrigger value="design">1. Design</TabsTrigger>
                        <TabsTrigger value="profile">2. Profile</TabsTrigger>
                        <TabsTrigger value="properties">3. Listings</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: DESIGN */}
                    <TabsContent value="design" className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-xl border border-border">
                            <Label className="mb-2 block text-muted-foreground">Describe your vibe</Label>
                            <Textarea
                                placeholder="e.g. Minimalist blue theme for a beachfront broker..."
                                className="h-32 resize-none"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <Button className="w-full mt-4" onClick={handleGenerate} disabled={isLoading}>
                                {isLoading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                Generate Theme
                            </Button>
                        </div>

                        {!generatedConfig && (
                            <Alert>
                                <AlertTitle>Waiting for Magic</AlertTitle>
                                <AlertDescription className="text-muted-foreground">
                                    Enter a prompt above to generate your site structure.
                                </AlertDescription>
                            </Alert>
                        )}

                        {generatedConfig && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Current Theme: <span className="text-foreground uppercase">{generatedConfig.themeId}</span></h3>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ background: generatedConfig.colorPalette.primary }}></div>
                                    <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ background: generatedConfig.colorPalette.background }}></div>
                                    <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ background: generatedConfig.colorPalette.text }}></div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* TAB 2: PROFILE INFO */}
                    <TabsContent value="profile" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={agentInfo.fullName} onChange={e => setAgentInfo({ ...agentInfo, fullName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={agentInfo.title} onChange={e => setAgentInfo({ ...agentInfo, title: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Company</Label>
                            <Input value={agentInfo.company} onChange={e => setAgentInfo({ ...agentInfo, company: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Full Address</Label>
                            <Input value={agentInfo.address} onChange={e => setAgentInfo({ ...agentInfo, address: e.target.value })} placeholder="123 Luxury Lane, Beverly Hills, CA" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={agentInfo.phone} onChange={e => setAgentInfo({ ...agentInfo, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={agentInfo.email} onChange={e => setAgentInfo({ ...agentInfo, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Website URL</Label>
                            <Input value={agentInfo.website} onChange={e => setAgentInfo({ ...agentInfo, website: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Avatar URL (Image Link)</Label>
                            <Input value={agentInfo.avatarUrl} onChange={e => setAgentInfo({ ...agentInfo, avatarUrl: e.target.value })} placeholder="https://..." />
                        </div>
                    </TabsContent>

                    {/* TAB 3: PROPERTIES */}
                    <TabsContent value="properties" className="space-y-6">
                        <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
                            <h3 className="font-bold text-sm">Add New Property</h3>
                            <Input placeholder="Property Title" value={newProp.title} onChange={e => setNewProp({ ...newProp, title: e.target.value })} />
                            <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Price ($)" type="number" value={newProp.price} onChange={e => setNewProp({ ...newProp, price: e.target.value })} />
                                <Input placeholder="Location" value={newProp.location} onChange={e => setNewProp({ ...newProp, location: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Input placeholder="Beds" type="number" value={newProp.beds} onChange={e => setNewProp({ ...newProp, beds: e.target.value })} />
                                <Input placeholder="Baths" type="number" value={newProp.baths} onChange={e => setNewProp({ ...newProp, baths: e.target.value })} />
                            </div>
                            <Input placeholder="Image URL" value={newProp.imageUrl} onChange={e => setNewProp({ ...newProp, imageUrl: e.target.value })} />
                            <Button onClick={addProperty} variant="secondary" className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add Listing
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-bold text-sm text-muted-foreground">Current Listings ({properties.length})</h3>
                            {properties.length === 0 && <p className="text-xs text-muted-foreground italic">No properties added yet.</p>}
                            {properties.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-card p-2 rounded border border-border">
                                    <div className="flex gap-2 items-center">
                                        {p.imageUrl && <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                                        <div className="text-sm">
                                            <div className="font-medium">{p.title}</div>
                                            <div className="text-xs text-muted-foreground">${p.price.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeProperty(p.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* RIGHT PANEL: PREVIEW */}
            <div className="flex-1 bg-muted/10 flex flex-col h-[500px] lg:h-full border-t lg:border-t-0 border-border">
                <div className="bg-muted/50 px-4 py-2 text-xs font-mono text-muted-foreground border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> LIVE PREVIEW</div>
                    <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Desktop View Available</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex justify-center bg-zinc-950/20">
                    {/* PHONE FRAME */}
                    <div className="w-full max-w-[400px] h-full bg-white rounded-3xl overflow-hidden shadow-2xl relative border-8 border-zinc-800 ring-1 ring-white/10" style={{ backgroundColor: generatedConfig?.colorPalette?.background || "#fff" }}>
                        {generatedConfig ? (
                            <div className="h-full overflow-y-auto no-scrollbar">
                                {generatedConfig.componentOrder.map((componentId: string) => renderComponent(componentId))}
                                {(!generatedConfig.componentOrder || generatedConfig.componentOrder.length === 0) && (
                                    <div className="p-8 text-center text-black">Generated config has no components.</div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-white">
                                <Wand2 className="w-12 h-12 mb-4 opacity-20 text-black" />
                                <h3 className="font-medium text-black">Preview Empty</h3>
                                <p className="text-sm text-zinc-500 mt-2">Generate a theme or save your profile to see it here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
