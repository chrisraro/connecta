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
    Palette, LayoutTemplate, User, List, GripVertical as DragHandleIcon,
    Package, Briefcase, GraduationCap, Code, Quote, Image as ImageIcon
} from "lucide-react";

// Templates
import Default from "@/components/templates/Default";
import { 
    ProfileData, ProfileInfo, ProjectItem, 
    PROJECT_CATEGORY_LABELS, ProfileType, ProductItem, ServiceItem 
} from "@/types/profile";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Id } from "@/convex/_generated/dataModel";

// --- Types & Defaults ---

const INITIAL_AGENT_INFO: ProfileInfo = {
    fullName: "",
    title: "",
    company: "",
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
    id: string; 
    label: string;
    isEnabled: boolean;
};

const INITIAL_BLOCKS: Block[] = [
    { id: "Hero", label: "Hero Section", isEnabled: true },
    { id: "About", label: "About", isEnabled: true },
    { id: "Certification", label: "Certification", isEnabled: false },
    { id: "Education", label: "Education", isEnabled: false },
    { id: "TechStack", label: "Tech Stack", isEnabled: false },
    { id: "Services", label: "Services", isEnabled: false },
    { id: "Experience", label: "Experience", isEnabled: false },
    { id: "Projects", label: "Projects", isEnabled: true },
    { id: "Testimonials", label: "Recommendations", isEnabled: false },
    { id: "Gallery", label: "Gallery", isEnabled: false },
    { id: "Contact", label: "Contact Form", isEnabled: true },
];

const THEMES = [
    { id: "modern", name: "Modern", primary: "#E91E63", background: "#FFFFFF", text: "#1a1a1a" },
    { id: "dark", name: "Dark", primary: "#E91E63", background: "#1a1a1a", text: "#FFFFFF" },
    { id: "minimal", name: "Minimal", primary: "#6366f1", background: "#F4F4F5", text: "#18181B" },
];

// --- Sortable Item Component ---

function SortableBlockItem({ block, onToggle }: { block: Block, onToggle: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

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
    const editingId = searchParams.get("id") && searchParams.get("id") !== "null" ? searchParams.get("id") : null;

    const createProfile = useMutation(api.profiles.createProfile);
    const onboarding = useQuery(api.users.getOnboardingStatus, user?.id ? { clerkId: user.id } : "skip");
    const existingProfile = useQuery(api.profiles.getProfile, editingId ? { profileId: editingId as Id<"profiles"> } : "skip");

    // UI State
    const [activeTab, setActiveTab] = useState("blocks");
    const [isSaving, setIsSaving] = useState(false);
    const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

    // Config State
    const [selectedThemeId, setSelectedThemeId] = useState("modern");
    const [customColors, setCustomColors] = useState({ primary: "#E91E63", background: "#FFFFFF", text: "#1a1a1a" });
    const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
    const [profileType, setProfileType] = useState<ProfileType>("individual");

    // Content State
    const [agentInfo, setAgentInfo] = useState<ProfileInfo>(INITIAL_AGENT_INFO);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    
    // New field states - use ProfileInfo types directly
    const [certification, setCertification] = useState<{ title: string; description: string }>({ title: "", description: "" });
    const [education, setEducation] = useState<NonNullable<ProfileInfo["education"]>>([]);
    const [techStack, setTechStack] = useState<NonNullable<ProfileInfo["techStack"]>>([]);
    const [experience, setExperience] = useState<NonNullable<ProfileInfo["experience"]>>([]);
    const [testimonials, setTestimonials] = useState<NonNullable<ProfileInfo["testimonials"]>>([]);
    const [gallery, setGallery] = useState<NonNullable<ProfileInfo["gallery"]>>([]);
    
    // Form inputs for new items
    const [newEducation, setNewEducation] = useState({ degree: "", school: "", year: "" });
    const [newTechStack, setNewTechStack] = useState({ category: "", skills: "" });
    const [newExperience, setNewExperience] = useState({ title: "", company: "", period: "", description: "" });
    const [newTestimonial, setNewTestimonial] = useState({ quote: "", author: "", role: "" });

    // Prefill logic
    const [hasPrefilled, setHasPrefilled] = useState(false);
    useEffect(() => {
        if (hasPrefilled) return;

        try {
            if (editingId && existingProfile) {
                setProfileType((existingProfile.profileType as ProfileType) || "individual");
                setAgentInfo({
                    ...INITIAL_AGENT_INFO,
                    ...existingProfile.agentInfo,
                });
                
                // Load new fields
                const info = existingProfile.agentInfo;
                if (info.certification) setCertification(info.certification);
                if (info.education) setEducation(info.education.map(e => ({ ...e, year: e.year || "" })));
                if (info.techStack) setTechStack(info.techStack);
                if (info.experience) setExperience(info.experience.map(e => ({ ...e, description: e.description || "" })));
                if (info.testimonials) setTestimonials(info.testimonials.map(t => ({ ...t, role: t.role || "" })));
                if (info.gallery) setGallery(info.gallery);
                
                if (existingProfile.featuredProjects) {
                    // Projects would need to be fetched separately
                }

                if (existingProfile.layoutConfig) {
                    setSelectedThemeId(existingProfile.layoutConfig.themeId || "modern");
                    setCustomColors(existingProfile.layoutConfig.colorPalette || THEMES[0]);
                    const order = existingProfile.layoutConfig.componentOrder || [];
                    setBlocks(prev => {
                        const updated = prev.map(b => ({ ...b, isEnabled: order.includes(b.id) }));
                        return [...updated].sort((a, b) => {
                            const idxA = order.indexOf(a.id);
                            const idxB = order.indexOf(b.id);
                            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                        });
                    });
                }
                setHasPrefilled(true);
            } else if (!editingId && onboarding?.data) {
                const data = onboarding.data;
                const type = (data.profileCategory || "individual") as ProfileType;
                setProfileType(type);
                setAgentInfo(prev => ({
                    ...prev,
                    fullName: data.fullName || "",
                    title: data.title || "",
                    phone: data.phone || "",
                    email: data.email || user?.primaryEmailAddress?.emailAddress || "",
                    company: data.company || "",
                    website: data.website || "",
                    about: data.about || "",
                    avatarUrl: data.avatarUrl || "",
                    services: data.services || [],
                    socialLinks: data.socialLinks || [],
                }));
                setHasPrefilled(true);
            }
        } catch (err) {
            console.error("Prefill error:", err);
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
            const cleanAgentInfo = {
                fullName: String(agentInfo.fullName || ""),
                title: String(agentInfo.title || ""),
                company: String(agentInfo.company || ""),
                phone: String(agentInfo.phone || ""),
                email: String(agentInfo.email || ""),
                address: agentInfo.address || undefined,
                website: agentInfo.website || undefined,
                about: agentInfo.about || undefined,
                avatarUrl: agentInfo.avatarUrl || undefined,
                services: (agentInfo.services || []).map(String),
                socialLinks: (agentInfo.socialLinks || []).map(link => ({
                    platform: String(link.platform || "Website"),
                    url: String(link.url || "")
                })),
                certification: certification.title ? certification : undefined,
                education: education.length > 0 ? education : undefined,
                techStack: techStack.length > 0 ? techStack : undefined,
                experience: experience.length > 0 ? experience : undefined,
                testimonials: testimonials.length > 0 ? testimonials : undefined,
                gallery: gallery.length > 0 ? gallery : undefined,
            };

            const profileId = await createProfile({
                id: editingId ? (editingId as Id<"profiles">) : undefined,
                clerkId: user.id,
                name: agentInfo.fullName ? `${agentInfo.fullName}'s Profile` : "My Profile",
                profileType: profileType,
                agentInfo: cleanAgentInfo,
                layoutConfig: {
                    themeId: selectedThemeId, 
                    colorPalette: customColors,
                    componentOrder: blocks.filter(b => b.isEnabled).map(b => b.id),
                    heroStyle: "default"
                },
                featuredProperties: [],
                featuredProjects: [],
                products: [],
                services: []
            });
            router.push(`/p/${profileId}`);
        } catch (error: any) {
            console.error("Save error:", error);
            alert(`Failed to save: ${error.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Add item handlers
    const addEducation = () => {
        if (!newEducation.degree || !newEducation.school) return;
        setEducation([...education, newEducation]);
        setNewEducation({ degree: "", school: "", year: "" });
    };

    const addTechStack = () => {
        if (!newTechStack.category || !newTechStack.skills) return;
        setTechStack([...techStack, { 
            category: newTechStack.category, 
            skills: newTechStack.skills.split(",").map(s => s.trim()) 
        }]);
        setNewTechStack({ category: "", skills: "" });
    };

    const addExperience = () => {
        if (!newExperience.title || !newExperience.company) return;
        setExperience([...experience, newExperience]);
        setNewExperience({ title: "", company: "", period: "", description: "" });
    };

    const addTestimonial = () => {
        if (!newTestimonial.quote || !newTestimonial.author) return;
        setTestimonials([...testimonials, newTestimonial]);
        setNewTestimonial({ quote: "", author: "", role: "" });
    };

    const addGalleryImage = (url: string) => {
        if (url) setGallery([...gallery, url]);
    };

    const renderComponent = (componentId: string) => {
        const data: ProfileData = {
            ownerId: user?.id || "",
            name: agentInfo.fullName,
            profileType: profileType,
            agent: { ...agentInfo, certification, education, techStack, experience, testimonials, gallery }, 
            properties: [], 
            projects: projects,
            products: [],
            services: [],
            theme: { primaryColor: customColors.primary, backgroundColor: customColors.background, textColor: customColors.text }
        };
        
        // Only render if block is enabled
        const block = blocks.find(b => b.id === componentId);
        if (!block?.isEnabled) return null;
        
        return <Default key="default" data={data} />;
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
                    <TabsList className="grid grid-cols-4 mb-6">
                        <TabsTrigger value="blocks"><List className="w-4 h-4 mr-2" /> Blocks</TabsTrigger>
                        <TabsTrigger value="design"><Palette className="w-4 h-4 mr-2" /> Design</TabsTrigger>
                        <TabsTrigger value="content"><User className="w-4 h-4 mr-2" /> Profile</TabsTrigger>
                        <TabsTrigger value="dynamic"><Package className="w-4 h-4 mr-2" /> Content</TabsTrigger>
                    </TabsList>

                    <TabsContent value="blocks" className="space-y-4">
                        <div className="p-4 bg-muted/20 border border-border rounded-xl mb-6">
                            <Label className="text-xs font-bold uppercase text-muted-foreground mb-3 block">Profile Type</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["individual", "company", "business"] as const).map((type) => (
                                    <Button
                                        key={type}
                                        size="sm"
                                        variant={profileType === type ? "default" : "outline"}
                                        onClick={() => setProfileType(type)}
                                        className="capitalize text-xs font-bold h-9"
                                    >
                                        {type}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-muted/20 border border-border rounded-xl">
                            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4">Reorder & Toggle Sections</h3>
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

                    <TabsContent value="dynamic" className="space-y-6">
                        {/* Certification */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Certification</Label>
                            </div>
                            <Input 
                                placeholder="Title (e.g., Software Engineer)" 
                                value={certification.title} 
                                onChange={e => setCertification({...certification, title: e.target.value})} 
                            />
                            <Input 
                                placeholder="Description" 
                                value={certification.description} 
                                onChange={e => setCertification({...certification, description: e.target.value})} 
                            />
                        </div>

                        {/* Education */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Education</Label>
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Degree" value={newEducation.degree} onChange={e => setNewEducation({...newEducation, degree: e.target.value})} />
                                <Input placeholder="School" value={newEducation.school} onChange={e => setNewEducation({...newEducation, school: e.target.value})} />
                                <Input placeholder="Year" value={newEducation.year} onChange={e => setNewEducation({...newEducation, year: e.target.value})} />
                                <Button size="sm" className="w-full" onClick={addEducation}>Add Education</Button>
                            </div>
                            <div className="space-y-2">
                                {education.map((edu, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs">
                                        <span>{edu.degree} - {edu.school}</span>
                                        <Trash2 className="w-3 h-3 text-destructive cursor-pointer" onClick={() => setEducation(education.filter((_, idx) => idx !== i))} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <Code className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Tech Stack</Label>
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Category (e.g., Frontend)" value={newTechStack.category} onChange={e => setNewTechStack({...newTechStack, category: e.target.value})} />
                                <Input placeholder="Skills (comma separated)" value={newTechStack.skills} onChange={e => setNewTechStack({...newTechStack, skills: e.target.value})} />
                                <Button size="sm" className="w-full" onClick={addTechStack}>Add Category</Button>
                            </div>
                            <div className="space-y-2">
                                {techStack.map((stack, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs">
                                        <span>{stack.category}: {stack.skills.join(", ")}</span>
                                        <Trash2 className="w-3 h-3 text-destructive cursor-pointer" onClick={() => setTechStack(techStack.filter((_, idx) => idx !== i))} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Services */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Services</Label>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Add a service (e.g., Web Design)" 
                                        id="new-service"
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                const input = e.target as HTMLInputElement;
                                                if (input.value.trim()) {
                                                    setAgentInfo({ ...agentInfo, services: [...(agentInfo.services || []), input.value.trim()] });
                                                    input.value = "";
                                                }
                                            }
                                        }}
                                    />
                                    <Button 
                                        size="sm" 
                                        onClick={() => {
                                            const input = document.getElementById('new-service') as HTMLInputElement;
                                            if (input.value.trim()) {
                                                setAgentInfo({ ...agentInfo, services: [...(agentInfo.services || []), input.value.trim()] });
                                                input.value = "";
                                            }
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {agentInfo.services?.map((service, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                            {service}
                                            <button 
                                                onClick={() => setAgentInfo({ ...agentInfo, services: agentInfo.services?.filter((_, idx) => idx !== i) })}
                                                className="hover:text-destructive"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Experience */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Experience</Label>
                            </div>
                            <div className="space-y-2">
                                <Input placeholder="Job Title" value={newExperience.title} onChange={e => setNewExperience({...newExperience, title: e.target.value})} />
                                <Input placeholder="Company" value={newExperience.company} onChange={e => setNewExperience({...newExperience, company: e.target.value})} />
                                <Input placeholder="Period (e.g., 2020 - Present)" value={newExperience.period} onChange={e => setNewExperience({...newExperience, period: e.target.value})} />
                                <Input placeholder="Description" value={newExperience.description} onChange={e => setNewExperience({...newExperience, description: e.target.value})} />
                                <Button size="sm" className="w-full" onClick={addExperience}>Add Experience</Button>
                            </div>
                            <div className="space-y-2">
                                {experience.map((exp, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs">
                                        <span>{exp.title} at {exp.company}</span>
                                        <Trash2 className="w-3 h-3 text-destructive cursor-pointer" onClick={() => setExperience(experience.filter((_, idx) => idx !== i))} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Testimonials */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <Quote className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Recommendations</Label>
                            </div>
                            <div className="space-y-2">
                                <textarea 
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Quote"
                                    value={newTestimonial.quote}
                                    onChange={e => setNewTestimonial({...newTestimonial, quote: e.target.value})}
                                />
                                <Input placeholder="Author Name" value={newTestimonial.author} onChange={e => setNewTestimonial({...newTestimonial, author: e.target.value})} />
                                <Input placeholder="Role/Title" value={newTestimonial.role} onChange={e => setNewTestimonial({...newTestimonial, role: e.target.value})} />
                                <Button size="sm" className="w-full" onClick={addTestimonial}>Add Recommendation</Button>
                            </div>
                            <div className="space-y-2">
                                {testimonials.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs">
                                        <span className="truncate max-w-[200px]">&ldquo;{t.quote.substring(0, 30)}...&rdquo; - {t.author}</span>
                                        <Trash2 className="w-3 h-3 text-destructive cursor-pointer" onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-primary" />
                                <Label className="text-xs font-black uppercase text-primary">Gallery</Label>
                            </div>
                            <div className="space-y-2">
                                <ImageUploader
                                    value=""
                                    onChange={(val) => addGalleryImage(val)}
                                    onRemove={() => {}}
                                    placeholder="Add Gallery Image"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {gallery.map((img, i) => (
                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                        <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                                        <button 
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                                            onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
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
                    <div className="px-4 font-mono">TapFolio v1.0</div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-muted/30">
                    <div className="w-full max-w-[420px] bg-background shadow-2xl rounded-3xl overflow-hidden border-8 border-foreground/5 ring-1 ring-border flex flex-col h-fit min-h-[800px]" style={{ backgroundColor: customColors.background }}>
                        {renderComponent("Default")}
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
