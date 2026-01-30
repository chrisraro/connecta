"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
    Loader2, Save, Plus, Trash2, Smartphone, Monitor, X,
    Palette, LayoutTemplate, User, List, GripVertical as DragHandleIcon
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

// Templates
import HeroModern from "@/components/templates/HeroModern";
import HeroLuxury from "@/components/templates/HeroLuxury";
import AgentBio from "@/components/templates/AgentBio";
import PropertyGrid from "@/components/templates/PropertyGrid";
import ContactForm from "@/components/templates/ContactForm";
import { ProfileData, AgentInfo } from "@/types/profile";
import { ImageUploader } from "@/components/ui/image-uploader";

// --- Types & Defaults ---

const INITIAL_AGENT_INFO: AgentInfo = {
    fullName: "Your Name",
    title: "Real Estate Agent",
    company: "Agency Name",
    phone: "",
    email: "",
    address: "",
    about: "",
    website: "",
    avatarUrl: "",
    socialLinks: [],
};

type Block = {
    id: string; // "Hero", "Bio", "Properties", "Contact"
    label: string;
    isEnabled: boolean;
};

const INITIAL_BLOCKS: Block[] = [
    { id: "Hero", label: "Hero Section", isEnabled: true },
    { id: "Bio", label: "Agent Bio", isEnabled: true },
    { id: "Properties", label: "Featured Listings", isEnabled: true },
    { id: "Contact", label: "Contact Form", isEnabled: true },
];

const THEMES = [
    { id: "modern", name: "Modern", primary: "#000000", background: "#FFFFFF", text: "#000000" },
    { id: "luxury", name: "Luxury", primary: "#C5A059", background: "#1A1A1A", text: "#FFFFFF" },
    { id: "minimal", name: "Minimal", primary: "#52525B", background: "#F4F4F5", text: "#18181B" },
];

// --- Sortable Item Component ---

function SortableBlockItem({ block, onToggle }: { block: Block, onToggle: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg mb-2">
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
                    <DragHandleIcon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{block.label}</span>
            </div>
            <Switch checked={block.isEnabled} onCheckedChange={() => onToggle(block.id)} />
        </div>
    );
}

// --- Main Page Component ---

export default function BuilderPage() {
    const router = useRouter();
    const createProfile = useMutation(api.profiles.createProfile);

    // UI State
    const [activeTab, setActiveTab] = useState("blocks");
    const [isSaving, setIsSaving] = useState(false);
    const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

    // Config State
    const [selectedThemeId, setSelectedThemeId] = useState("modern");
    const [customColors, setCustomColors] = useState({ primary: "#000000", background: "#FFFFFF", text: "#000000" }); // initialized with Modern defaults
    const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);

    // Content State
    const [agentInfo, setAgentInfo] = useState<AgentInfo>(INITIAL_AGENT_INFO);
    const [properties, setProperties] = useState<any[]>([]);
    const [newProp, setNewProp] = useState({
        title: "",
        price: "",
        status: "for-sale",
        type: "house-lot",
        description: "",
        images: [] as string[],
        currentImageInput: "",
        location: "",
        bedrooms: "",
        bathrooms: "",
        floorArea: "",
        lotArea: "",
        floors: "",
        dateSold: ""
    });

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handlers
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setBlocks((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleBlock = (id: string) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, isEnabled: !b.isEnabled } : b));
    };

    const applyTheme = (themeId: string) => {
        const theme = THEMES.find(t => t.id === themeId);
        if (theme) {
            setSelectedThemeId(themeId);
            setCustomColors({ primary: theme.primary, background: theme.background, text: theme.text });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const profileId = await createProfile({
                name: agentInfo.fullName ? `${agentInfo.fullName}'s Profile` : "My Profile",
                agentInfo: agentInfo,
                layoutConfig: {
                    themeId: selectedThemeId,
                    colorPalette: customColors,
                    componentOrder: blocks.filter(b => b.isEnabled).map(b => b.id),
                    heroStyle: "default"
                },
                featuredProperties: [] // Keeping empty as per schema/mock plan
            });
            router.push(`/p/${profileId}`);
        } catch (error) {
            console.error(error);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };


    const addProperty = () => {
        if (!newProp.title) return;
        const p = {
            id: Date.now().toString(),
            title: newProp.title,
            price: Number(newProp.price) || 0,
            status: newProp.status as any,
            type: newProp.type as any,
            description: newProp.description,
            images: newProp.images,
            location: newProp.location,
            bedrooms: Number(newProp.bedrooms) || 0,
            bathrooms: Number(newProp.bathrooms) || 0,
            floorArea: Number(newProp.floorArea) || 0,
            lotArea: Number(newProp.lotArea) || 0,
            floors: Number(newProp.floors) || 0
        };
        setProperties([...properties, p]);
        setNewProp({
            title: "", price: "", status: "for-sale", type: "house-lot", description: "",
            images: [], currentImageInput: "", location: "",
            bedrooms: "", bathrooms: "", floorArea: "", lotArea: "", floors: "", dateSold: ""
        });
    };
    const removeProperty = (id: string) => setProperties(properties.filter(p => p.id !== id));

    const addImage = (base64: string) => {
        if (base64) {
            setNewProp({ ...newProp, images: [...newProp.images, base64] });
        }
    };

    // Render Preview
    const renderComponent = (componentId: string) => {
        const data: ProfileData = {
            agent: agentInfo,
            properties: properties,
            theme: { primaryColor: customColors.primary, backgroundColor: customColors.background, textColor: customColors.text }
        };
        switch (componentId) {
            case "Hero": return selectedThemeId === "luxury" ? <HeroLuxury key="hero" data={data} /> : <HeroModern key="hero" data={data} />;
            case "Bio": return <AgentBio key="bio" data={data} />;
            case "Properties": return <PropertyGrid key="prop" data={data} />;
            case "Contact": return <ContactForm key="contact" data={data} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background text-foreground">
            {/* --- MOBILE PREVIEW TOGGLE --- */}
            <div className="lg:hidden p-2 border-b bg-muted/40 flex justify-center gap-2">
                <Button
                    variant={mobileView === "editor" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMobileView("editor")}
                    className="w-32"
                >
                    <List className="w-4 h-4 mr-2" /> Editor
                </Button>
                <Button
                    variant={mobileView === "preview" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMobileView("preview")}
                    className="w-32"
                >
                    <Smartphone className="w-4 h-4 mr-2" /> Preview
                </Button>
            </div>

            {/* --- LEFT PANEL: CONFIGURATOR --- */}
            <div className={`w-full lg:w-4/12 p-4 flex flex-col border-r border-border bg-card h-full overflow-y-auto ${mobileView === "preview" ? "hidden lg:flex" : "flex"}`}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-primary" />
                        Builder
                    </h1>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Publish
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid grid-cols-3 mb-6">
                        <TabsTrigger value="blocks"><List className="w-4 h-4 mr-2" /> Blocks</TabsTrigger>
                        <TabsTrigger value="design"><Palette className="w-4 h-4 mr-2" /> Design</TabsTrigger>
                        <TabsTrigger value="content"><User className="w-4 h-4 mr-2" /> Content</TabsTrigger>
                    </TabsList>

                    {/* TAB: BLOCKS (Ordering & Toggles) */}
                    <TabsContent value="blocks" className="space-y-4">
                        <div className="p-4 bg-muted/20 border border-border rounded-xl">
                            <h3 className="text-sm font-semibold mb-3">Reorder & Toggle Sections</h3>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
                                    {blocks.map(block => (
                                        <SortableBlockItem key={block.id} block={block} onToggle={toggleBlock} />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </TabsContent>

                    {/* TAB: DESIGN (Themes & Colors) */}
                    <TabsContent value="design" className="space-y-6">
                        <div className="space-y-3">
                            <Label>Preset Themes</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {THEMES.map(theme => (
                                    <div
                                        key={theme.id}
                                        className={`cursor-pointer border rounded-lg p-2 text-center text-xs font-medium hover:bg-accent ${selectedThemeId === theme.id ? "border-primary ring-1 ring-primary" : "border-border"}`}
                                        onClick={() => applyTheme(theme.id)}
                                    >
                                        <div className="h-6 w-full rounded mb-2" style={{ background: theme.background }}></div>
                                        {theme.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <Label>Custom Colors</Label>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Background</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded border overflow-hidden">
                                            <input type="color" className="w-full h-full p-0 border-0 cursor-pointer" value={customColors.background} onChange={e => setCustomColors({ ...customColors, background: e.target.value })} />
                                        </div>
                                        <Input className="h-8 text-xs font-mono" value={customColors.background} onChange={e => setCustomColors({ ...customColors, background: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Primary</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded border overflow-hidden">
                                            <input type="color" className="w-full h-full p-0 border-0 cursor-pointer" value={customColors.primary} onChange={e => setCustomColors({ ...customColors, primary: e.target.value })} />
                                        </div>
                                        <Input className="h-8 text-xs font-mono" value={customColors.primary} onChange={e => setCustomColors({ ...customColors, primary: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Text</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded border overflow-hidden">
                                            <input type="color" className="w-full h-full p-0 border-0 cursor-pointer" value={customColors.text} onChange={e => setCustomColors({ ...customColors, text: e.target.value })} />
                                        </div>
                                        <Input className="h-8 text-xs font-mono" value={customColors.text} onChange={e => setCustomColors({ ...customColors, text: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* TAB: CONTENT (Forms) */}
                    <TabsContent value="content" className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Profile Details</h3>
                            <Input placeholder="Full Name" value={agentInfo.fullName} onChange={e => setAgentInfo({ ...agentInfo, fullName: e.target.value })} />
                            <Input placeholder="Title" value={agentInfo.title} onChange={e => setAgentInfo({ ...agentInfo, title: e.target.value })} />
                            <Input placeholder="Company" value={agentInfo.company} onChange={e => setAgentInfo({ ...agentInfo, company: e.target.value })} />

                            <h3 className="font-semibold text-sm pt-2">Contact Info</h3>
                            <Input placeholder="Phone Number" value={agentInfo.phone} onChange={e => setAgentInfo({ ...agentInfo, phone: e.target.value })} />
                            <Input placeholder="Email Address" value={agentInfo.email} onChange={e => setAgentInfo({ ...agentInfo, email: e.target.value })} />
                            <Input placeholder="Physical Address" value={agentInfo.address || ""} onChange={e => setAgentInfo({ ...agentInfo, address: e.target.value })} />
                            <Input placeholder="Website URL" value={agentInfo.website || ""} onChange={e => setAgentInfo({ ...agentInfo, website: e.target.value })} />

                            <div className="space-y-2">
                                <Label>Profile Picture</Label>
                                <ImageUploader
                                    value={agentInfo.avatarUrl || ""}
                                    onChange={(val) => setAgentInfo({ ...agentInfo, avatarUrl: val })}
                                    onRemove={() => setAgentInfo({ ...agentInfo, avatarUrl: "" })}
                                    placeholder="Upload Photo"
                                />
                            </div>


                            <div className="space-y-2">
                                <Label>About Me</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Tell your story..."
                                    value={agentInfo.about || ""}
                                    onChange={e => setAgentInfo({ ...agentInfo, about: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <h3 className="font-semibold text-sm">Social Profiles</h3>
                            <div className="grid grid-cols-[1fr_2fr] gap-2">
                                <select
                                    id="social-platform"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="Instagram">Instagram</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Twitter">Twitter/X</option>
                                    <option value="TikTok">TikTok</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Website">Other Website</option>
                                </select>
                                <Input placeholder="Username (or full URL)" id="social-username" />
                            </div>
                            <Button size="sm" variant="outline" onClick={() => {
                                const platformSelect = (document.getElementById('social-platform') as HTMLSelectElement);
                                const usernameInput = (document.getElementById('social-username') as HTMLInputElement);
                                const platform = platformSelect.value;
                                let username = usernameInput.value.trim();

                                if (platform && username) {
                                    let finalUrl = username;
                                    // Auto-prefix logic if user didn't paste a full link
                                    if (!username.startsWith('http')) {
                                        const prefixes: Record<string, string> = {
                                            "Instagram": "https://instagram.com/",
                                            "Facebook": "https://facebook.com/",
                                            "LinkedIn": "https://linkedin.com/in/",
                                            "Twitter": "https://x.com/",
                                            "TikTok": "https://tiktok.com/@",
                                            "YouTube": "https://youtube.com/@"
                                        };
                                        if (prefixes[platform]) {
                                            finalUrl = prefixes[platform] + username;
                                        }
                                    }

                                    setAgentInfo({ ...agentInfo, socialLinks: [...(agentInfo.socialLinks || []), { platform, url: finalUrl }] });
                                    usernameInput.value = "";
                                }
                            }} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add {agentInfo.socialLinks?.length === 0 ? "First Social" : "Another"}
                            </Button>

                            <div className="space-y-2">
                                {agentInfo.socialLinks?.map((link, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded border">
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-medium flex items-center gap-2">
                                                {link.platform}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</span>
                                        </div>
                                        <Trash2 className="w-4 h-4 text-destructive cursor-pointer shrink-0" onClick={() => {
                                            const newLinks = [...agentInfo.socialLinks];
                                            newLinks.splice(idx, 1);
                                            setAgentInfo({ ...agentInfo, socialLinks: newLinks });
                                        }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <h3 className="font-semibold text-sm">Listings</h3>
                            <div className="bg-muted p-3 rounded-lg space-y-3">
                                <Input placeholder="Property Title (e.g. Modern Villa)" value={newProp.title} onChange={e => setNewProp({ ...newProp, title: e.target.value })} className="bg-background" />

                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newProp.type}
                                        onChange={e => setNewProp({ ...newProp, type: e.target.value })}
                                    >
                                        <option value="lot-only">Lot Only</option>
                                        <option value="house-lot">House & Lot</option>
                                        <option value="townhouse">Townhouse</option>
                                        <option value="condo">Condo</option>
                                        <option value="commercial">Commercial</option>
                                    </select>
                                    <select
                                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newProp.status}
                                        onChange={e => setNewProp({ ...newProp, status: e.target.value })}
                                    >
                                        <option value="for-sale">For Sale</option>
                                        <option value="for-rent">For Rent</option>
                                        <option value="sold">Sold</option>
                                    </select>
                                </div>

                                {newProp.status === "sold" && (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                        <Label className="text-xs">Date Sold</Label>
                                        <Input
                                            type="date"
                                            value={newProp.dateSold || ""}
                                            onChange={e => setNewProp({ ...newProp, dateSold: e.target.value })}
                                            className="bg-background"
                                        />
                                    </div>
                                )}

                                <Input placeholder="Price (PHP)" type="number" value={newProp.price} onChange={e => setNewProp({ ...newProp, price: e.target.value })} className="bg-background" />

                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="Floor Area (sqm)" type="number" value={newProp.floorArea} onChange={e => setNewProp({ ...newProp, floorArea: e.target.value })} className="bg-background" />
                                    <Input placeholder="Lot Area (sqm)" type="number" value={newProp.lotArea} onChange={e => setNewProp({ ...newProp, lotArea: e.target.value })} className="bg-background" />
                                </div>

                                <div className="space-y-2 mb-6">
                                    <Label className="text-xs">Property Images</Label>
                                    <div className="flex gap-2 items-start flex-wrap">
                                        <div className="w-24 h-24 shrink-0">
                                            <ImageUploader
                                                onChange={addImage}
                                                placeholder="Add Photo"
                                                className="w-full h-full"
                                            />
                                        </div>
                                        {newProp.images.map((img, i) => (
                                            <div key={i} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border group">
                                                <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        className="h-6 w-6 rounded-full"
                                                        onClick={() => setNewProp({ ...newProp, images: newProp.images.filter((_, idx) => idx !== i) })}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Input placeholder="Beds" type="number" value={newProp.bedrooms} onChange={e => setNewProp({ ...newProp, bedrooms: e.target.value })} className="bg-background" />
                                    <Input placeholder="CRs" type="number" value={newProp.bathrooms} onChange={e => setNewProp({ ...newProp, bathrooms: e.target.value })} className="bg-background" />
                                    <Input placeholder="Floors" type="number" value={newProp.floors} onChange={e => setNewProp({ ...newProp, floors: e.target.value })} className="bg-background" />
                                </div>

                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Description..."
                                    value={newProp.description}
                                    onChange={e => setNewProp({ ...newProp, description: e.target.value })}
                                />

                                <Button size="sm" onClick={addProperty} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Listing</Button>
                            </div>
                            <div className="space-y-2">
                                {properties.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded border">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{p.title}</span>
                                            <span className="text-xs text-muted-foreground">{p.type} • {p.price.toLocaleString()}</span>
                                        </div>
                                        <Trash2 className="w-4 h-4 text-destructive cursor-pointer" onClick={() => removeProperty(p.id)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* --- RIGHT PANEL: PREVIEW --- */}
            <div className={`flex-1 bg-muted/20 flex flex-col h-full overflow-hidden ${mobileView === "editor" ? "hidden lg:flex" : "flex"}`}>
                <div className="bg-card border-b border-border p-2 flex justify-between items-center text-xs text-muted-foreground shadow-sm z-10">
                    <div className="flex gap-2 items-center px-4"><Monitor className="w-4 h-4" /> Live Preview</div>
                    <div className="px-4">Auto-updating</div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-zinc-100 dark:bg-zinc-950/50">
                    <div className="w-full max-w-[420px] bg-white shadow-2xl rounded-3xl overflow-hidden border-8 border-zinc-900 ring-1 ring-black/10 flex flex-col h-fit min-h-[800px]" style={{ backgroundColor: customColors.background }}>
                        {blocks.filter(b => b.isEnabled).map(block => (
                            <div key={block.id}>
                                {renderComponent(block.id)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
}
