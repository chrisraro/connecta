"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
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

// Templates
import HeroModern from "@/components/templates/HeroModern";
import HeroLuxury from "@/components/templates/HeroLuxury";
import AgentBio from "@/components/templates/AgentBio";
import PropertyGrid from "@/components/templates/PropertyGrid";
import ProjectGrid from "@/components/templates/ProjectGrid";
import ContactForm from "@/components/templates/ContactForm";
import { ProfileData, ProfileInfo, ProjectItem, ProjectCategory, PROJECT_CATEGORY_LABELS, Property } from "@/types/profile";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Id } from "@/convex/_generated/dataModel";

// --- Types & Defaults ---

const INITIAL_AGENT_INFO: ProfileInfo = {
    fullName: "Your Name",
    title: "Your Title",
    company: "Company Name",
    phone: "",
    email: "",
    address: "",
    about: "",
    website: "",
    avatarUrl: "",
    services: [],
    socialLinks: [],
};

type Block = {
    id: string; // "Hero", "Bio", "Properties", "Contact"
    label: string;
    isEnabled: boolean;
};

const INITIAL_BLOCKS: Block[] = [
    { id: "Hero", label: "Hero Section", isEnabled: true },
    { id: "Bio", label: "About / Bio", isEnabled: true },
    { id: "Projects", label: "Portfolio Projects", isEnabled: true },
    { id: "Properties", label: "Property Listings", isEnabled: false },
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

function BuilderContent() {
    const router = useRouter();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const editingId = searchParams.get("id");

    const createProfile = useMutation(api.profiles.createProfile);
    const onboarding = useQuery(api.users.getOnboardingStatus, user?.id ? { clerkId: user.id } : "skip");
    const existingProfile = useQuery(api.profiles.getProfile, editingId ? { profileId: editingId as Id<"profiles"> } : "skip");

    // UI State
    const [activeTab, setActiveTab] = useState("blocks");
    const [isSaving, setIsSaving] = useState(false);
    const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

    // Config State
    const [selectedThemeId, setSelectedThemeId] = useState("modern");
    const [customColors, setCustomColors] = useState({ primary: "#000000", background: "#FFFFFF", text: "#000000" });
    const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);

    // Content State
    const [agentInfo, setAgentInfo] = useState<ProfileInfo>(INITIAL_AGENT_INFO);
    const [properties, setProperties] = useState<Property[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    
    const [newProp, setNewProp] = useState({
        title: "", price: "", status: "for-sale", type: "house-lot", description: "",
        images: [] as string[], currentImageInput: "", location: "",
        bedrooms: "", bathrooms: "", floorArea: "", lotArea: "", floors: "", dateSold: ""
    });
    
    const [newProject, setNewProject] = useState<{
        title: string; description: string; category: ProjectCategory;
        tags: string; externalUrl: string; images: string[];
    }>({
        title: "", description: "", category: "other", tags: "", externalUrl: "", images: [],
    });

    // Prefill logic
    const [hasPrefilled, setHasPrefilled] = useState(false);
    useEffect(() => {
        if (hasPrefilled) return;

        if (editingId) {
            if (existingProfile) {
                setAgentInfo(existingProfile.agentInfo);
                setSelectedThemeId(existingProfile.layoutConfig.themeId);
                setCustomColors(existingProfile.layoutConfig.colorPalette);
                const order = existingProfile.layoutConfig.componentOrder;
                setBlocks(prev => {
                    const updated = prev.map(b => ({ ...b, isEnabled: order.includes(b.id) }));
                    return [...updated].sort((a, b) => {
                        const idxA = order.indexOf(a.id);
                        const idxB = order.indexOf(b.id);
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });
                });
                setHasPrefilled(true);
            }
        } else {
            const data = onboarding?.data;
            if (data) {
                setAgentInfo(prev => ({
                    ...prev,
                    fullName: data.fullName || prev.fullName,
                    title: data.title || prev.title,
                    phone: data.phone || prev.phone,
                    email: data.email || user?.primaryEmailAddress?.emailAddress || prev.email,
                    company: data.company || prev.company,
                    website: data.website || prev.website,
                    about: data.about || prev.about,
                    avatarUrl: data.avatarUrl || prev.avatarUrl,
                    services: data.services || prev.services,
                    socialLinks: data.socialLinks || prev.socialLinks,
                }));
                setHasPrefilled(true);
            }
        }
    }, [onboarding, hasPrefilled, user, existingProfile, editingId]);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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

    const toggleBlock = (id: string) => setBlocks(blocks.map(b => b.id === id ? { ...b, isEnabled: !b.isEnabled } : b));

    const applyTheme = (themeId: string) => {
        const theme = THEMES.find(t => t.id === themeId);
        if (theme) {
            setSelectedThemeId(themeId);
            setCustomColors({ primary: theme.primary, background: theme.background, text: theme.text });
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            const profileId = await createProfile({
                id: editingId ? (editingId as Id<"profiles">) : undefined,
                clerkId: user.id,
                name: agentInfo.fullName ? `${agentInfo.fullName}'s Profile` : "My Profile",
                agentInfo: { ...agentInfo, company: agentInfo.company ?? "", services: agentInfo.services ?? [] },
                layoutConfig: {
                    themeId: selectedThemeId, colorPalette: customColors,
                    componentOrder: blocks.filter(b => b.isEnabled).map(b => b.id),
                    heroStyle: "default"
                },
                featuredProperties: [],
                featuredProjects: projects.map(p => p.id)
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
        const p: Property = {
            id: Date.now().toString(),
            ownerId: user?.id || "temp",
            title: newProp.title,
            price: Number(newProp.price) || 0,
            status: newProp.status as "for-sale" | "for-rent" | "sold",
            type: newProp.type as "lot-only" | "house-lot" | "townhouse" | "condo" | "commercial",
            description: newProp.description, images: newProp.images, location: newProp.location,
            bedrooms: Number(newProp.bedrooms) || 0, bathrooms: Number(newProp.bathrooms) || 0,
            floorArea: Number(newProp.floorArea) || 0, lotArea: Number(newProp.lotArea) || 0, floors: Number(newProp.floors) || 0
        };
        setProperties([...properties, p]);
        setNewProp({
            title: "", price: "", status: "for-sale", type: "house-lot", description: "",
            images: [], currentImageInput: "", location: "",
            bedrooms: "", bathrooms: "", floorArea: "", lotArea: "", floors: "", dateSold: ""
        });
    };
    
    const removeProperty = (id: string) => setProperties(properties.filter(p => p.id !== id));
    const addImage = (url: string) => { if (url) setNewProp({ ...newProp, images: [...newProp.images, url] }); };
    const addProjectImage = (url: string) => { if (url) setNewProject(p => ({ ...p, images: [...p.images, url] })); };

    const addProject = () => {
        if (!newProject.title) return;
        const proj: ProjectItem = {
            id: Date.now().toString(),
            ownerId: user?.id || "temp",
            title: newProject.title,
            description: newProject.description,
            category: newProject.category,
            tags: newProject.tags.split(",").map(t => t.trim()).filter(Boolean),
            images: newProject.images,
            externalUrl: newProject.externalUrl || undefined,
            featured: false,
        };
        setProjects(prev => [...prev, proj]);
        setNewProject({ title: "", description: "", category: "other", tags: "", externalUrl: "", images: [] });
    };

    const removeProject = (id: string) => setProjects(prev => prev.filter(p => p.id !== id));

    const renderComponent = (componentId: string) => {
        const data: ProfileData = {
            agent: agentInfo, properties: properties, projects: projects,
            theme: { primaryColor: customColors.primary, backgroundColor: customColors.background, textColor: customColors.text }
        };
        switch (componentId) {
            case "Hero": return selectedThemeId === "luxury" ? <HeroLuxury key="hero" data={data} /> : <HeroModern key="hero" data={data} />;
            case "Bio": return <AgentBio key="bio" data={data} />;
            case "Properties": return <PropertyGrid key="prop" data={data} />;
            case "Projects": return <ProjectGrid key="projects" data={data} />;
            case "Contact": return <ContactForm key="contact" data={data} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background text-foreground">
            <div className="lg:hidden p-2 border-b bg-muted/40 flex justify-center gap-2">
                <Button variant={mobileView === "editor" ? "default" : "outline"} size="sm" onClick={() => setMobileView("editor")} className="w-32">
                    <List className="w-4 h-4 mr-2" /> Editor
                </Button>
                <Button variant={mobileView === "preview" ? "default" : "outline"} size="sm" onClick={() => setMobileView("preview")} className="w-32">
                    <Smartphone className="w-4 h-4 mr-2" /> Preview
                </Button>
            </div>

            <div className={`w-full lg:w-4/12 p-4 flex flex-col border-r border-border bg-card h-full overflow-y-auto ${mobileView === "preview" ? "hidden lg:flex" : "flex"}`}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-primary" />
                        {editingId ? "Edit Profile" : "Builder"}
                    </h1>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {editingId ? "Save Changes" : "Publish"}
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid grid-cols-3 mb-6">
                        <TabsTrigger value="blocks"><List className="w-4 h-4 mr-2" /> Blocks</TabsTrigger>
                        <TabsTrigger value="design"><Palette className="w-4 h-4 mr-2" /> Design</TabsTrigger>
                        <TabsTrigger value="content"><User className="w-4 h-4 mr-2" /> Profile</TabsTrigger>
                    </TabsList>

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
                                        <input type="color" className="w-8 h-8 rounded border overflow-hidden p-0 border-0 cursor-pointer" value={customColors.background} onChange={e => setCustomColors({ ...customColors, background: e.target.value })} />
                                        <Input className="h-8 text-xs font-mono" value={customColors.background} onChange={e => setCustomColors({ ...customColors, background: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Primary</Label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" className="w-8 h-8 rounded border overflow-hidden p-0 border-0 cursor-pointer" value={customColors.primary} onChange={e => setCustomColors({ ...customColors, primary: e.target.value })} />
                                        <Input className="h-8 text-xs font-mono" value={customColors.primary} onChange={e => setCustomColors({ ...customColors, primary: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Text</Label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" className="w-8 h-8 rounded border overflow-hidden p-0 border-0 cursor-pointer" value={customColors.text} onChange={e => setCustomColors({ ...customColors, text: e.target.value })} />
                                        <Input className="h-8 text-xs font-mono" value={customColors.text} onChange={e => setCustomColors({ ...customColors, text: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

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
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder="Tell your story..."
                                    value={agentInfo.about || ""}
                                    onChange={e => setAgentInfo({ ...agentInfo, about: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <h3 className="font-semibold text-sm">Social Profiles</h3>
                            <div className="grid grid-cols-[1fr_2fr] gap-2">
                                <select id="social-platform" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
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
                                const username = usernameInput.value.trim();
                                if (platform && username) {
                                    let finalUrl = username;
                                    if (!username.startsWith('http')) {
                                        const prefixes: Record<string, string> = { "Instagram": "https://instagram.com/", "Facebook": "https://facebook.com/", "LinkedIn": "https://linkedin.com/in/", "Twitter": "https://x.com/", "TikTok": "https://tiktok.com/@", "YouTube": "https://youtube.com/@" };
                                        if (prefixes[platform]) finalUrl = prefixes[platform] + username;
                                    }
                                    setAgentInfo({ ...agentInfo, socialLinks: [...(agentInfo.socialLinks || []), { platform, url: finalUrl }] });
                                    usernameInput.value = "";
                                }
                            }} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Add Social
                            </Button>
                            <div className="space-y-2">
                                {agentInfo.socialLinks?.map((link, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded border">
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-medium flex items-center gap-2">{link.platform}</span>
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
                    </TabsContent>
                </Tabs>
            </div>

            <div className={`flex-1 bg-muted/20 flex flex-col h-full overflow-hidden ${mobileView === "editor" ? "hidden lg:flex" : "flex"}`}>
                <div className="bg-card border-b border-border p-2 flex justify-between items-center text-xs text-muted-foreground shadow-sm z-10">
                    <div className="flex gap-2 items-center px-4"><Monitor className="w-4 h-4" /> Live Preview</div>
                    <div className="px-4">Auto-updating</div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-muted/30">
                    <div className="w-full max-w-[420px] bg-background shadow-2xl rounded-3xl overflow-hidden border-8 border-foreground/5 ring-1 ring-border flex flex-col h-fit min-h-[800px]" style={{ backgroundColor: customColors.background }}>
                        {blocks.filter(b => b.isEnabled).map(block => (
                            <div key={block.id}>{renderComponent(block.id)}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
}

export default function BuilderPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
            <BuilderContent />
        </Suspense>
    );
}
