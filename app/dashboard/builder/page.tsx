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
import { Switch } from "@/components/ui/switch";
import {
    Loader2, Save, Plus, Trash2, X, GripVertical, ChevronLeft,
    Palette, LayoutTemplate, User, Briefcase, GraduationCap, Code, Quote, Image as ImageIcon,
    Sparkles, ArrowUpDown
} from "lucide-react";

// Templates
import Editorial from "@/components/templates/Editorial";
import Kinetic from "@/components/templates/Kinetic";
import Architectural from "@/components/templates/Architectural";
import { TEMPLATES, getTemplateMeta } from "@/components/templates/registry";
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
    icon: React.ElementType;
    isEnabled: boolean;
};

const INITIAL_BLOCKS: Block[] = [
    { id: "Hero", label: "Hero Section", icon: User, isEnabled: true },
    { id: "About", label: "About", icon: User, isEnabled: true },
    { id: "Certification", label: "Certification", icon: Briefcase, isEnabled: false },
    { id: "Education", label: "Education", icon: GraduationCap, isEnabled: false },
    { id: "TechStack", label: "Tech Stack", icon: Code, isEnabled: false },
    { id: "Services", label: "Services", icon: Briefcase, isEnabled: false },
    { id: "Experience", label: "Experience", icon: Briefcase, isEnabled: false },
    { id: "Projects", label: "Projects", icon: LayoutTemplate, isEnabled: true },
    { id: "Testimonials", label: "Recommendations", icon: Quote, isEnabled: false },
    { id: "Gallery", label: "Gallery", icon: ImageIcon, isEnabled: false },
    { id: "Contact", label: "Contact Form", icon: User, isEnabled: true },
];

// --- Sortable Item Component ---

function SortableBlockItem({ block, onToggle }: { block: Block; onToggle: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const Icon = block.icon;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm"
        >
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical className="w-4 h-4" />
            </div>
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">{block.label}</span>
            <Switch
                checked={block.isEnabled}
                onCheckedChange={() => onToggle(block.id)}
                className="data-[state=checked]:bg-primary"
            />
        </div>
    );
}

// --- Template Selector Component ---

function TemplateSelector({
    selectedTemplate,
    onSelect
}: {
    selectedTemplate: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">Choose Template</Label>
            <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template.id)}
                        className={`relative rounded-xl overflow-hidden aspect-[3/4] transition-all ${
                            selectedTemplate === template.id
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : "hover:scale-[1.02]"
                        }`}
                    >
                        {/* Template Preview */}
                        <div
                            className="absolute inset-0"
                            style={{ background: template.thumbnail }}
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-semibold text-sm">{template.name}</p>
                            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{template.description}</p>
                        </div>
                        {/* Selected indicator */}
                        {selectedTemplate === template.id && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-primary-foreground" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// --- Section Editor Modal ---

function SectionEditor({
    isOpen,
    onClose,
    title,
    children,
    onSave
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave?: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-background">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 p-4 border-b bg-background">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 -ml-2 hover:bg-muted rounded-full">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold text-foreground">{title}</h2>
                    </div>
                    <Button size="sm" onClick={onSave || onClose} className="bg-primary text-primary-foreground">
                        <Save className="w-4 h-4 mr-2" /> Done
                    </Button>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-background">
                    {children}
                </div>
            </div>
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
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showReorderMode, setShowReorderMode] = useState(false);

    // Template State
    const [selectedTemplate, setSelectedTemplate] = useState("editorial");

    // Config State
    const [customColors, setCustomColors] = useState({
        primary: TEMPLATES[0].defaultColors.primary,
        background: TEMPLATES[0].defaultColors.background,
        text: TEMPLATES[0].defaultColors.text
    });
    const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
    const [profileType, setProfileType] = useState<ProfileType>("individual");

    // Content State
    const [agentInfo, setAgentInfo] = useState<ProfileInfo>(INITIAL_AGENT_INFO);
    const [projects, setProjects] = useState<ProjectItem[]>([]);

    // New field states
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

                // Load template
                if (existingProfile.layoutConfig?.themeId) {
                    const templateId = existingProfile.layoutConfig.themeId;
                    if (TEMPLATES.find(t => t.id === templateId)) {
                        setSelectedTemplate(templateId);
                    }
                }

                if (existingProfile.layoutConfig) {
                    setCustomColors(existingProfile.layoutConfig.colorPalette || TEMPLATES[0].defaultColors);
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

    // Update colors when template changes
    useEffect(() => {
        const template = getTemplateMeta(selectedTemplate);
        if (template && !editingId) {
            setCustomColors(template.defaultColors);
        }
    }, [selectedTemplate, editingId]);

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
                    themeId: selectedTemplate,
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

    // Render preview based on selected template
    const renderPreview = () => {
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

        switch (selectedTemplate) {
            case "kinetic":
                return <Kinetic data={data} />;
            case "architectural":
                return <Architectural data={data} />;
            case "editorial":
            default:
                return <Editorial data={data} />;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hide bottom nav on this page */}
            <style jsx global>{`
                .mobile-bottom-nav { display: none !important; }
                .quick-actions-fab { display: none !important; }
            `}</style>
            
            {/* Header */}
            <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-muted rounded-full text-foreground"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-semibold text-foreground">
                        {editingId ? "Edit Profile" : "Create Profile"}
                    </h1>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                </div>
            </header>

            <div className="max-w-lg mx-auto pb-8">
                {/* Phone Preview */}
                <div className="p-4">
                    <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                        <div
                            className="rounded-[2rem] overflow-hidden bg-white"
                            style={{ maxHeight: "500px", overflowY: "auto" }}
                        >
                            {renderPreview()}
                        </div>
                    </div>
                </div>

                {/* Template Selection */}
                <div className="px-4 py-4">
                    <TemplateSelector
                        selectedTemplate={selectedTemplate}
                        onSelect={setSelectedTemplate}
                    />
                </div>

                {/* Profile Type */}
                <div className="px-4 py-4">
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Profile Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {(["individual", "company", "business"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setProfileType(type)}
                                className={`py-2.5 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                                    profileType === type
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card border border-border text-foreground hover:bg-muted"
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sections List */}
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold text-foreground">Sections</Label>
                        <button
                            onClick={() => setShowReorderMode(!showReorderMode)}
                            className="text-sm text-primary flex items-center gap-1"
                        >
                            {showReorderMode ? "Done" : <><ArrowUpDown className="w-3 h-3" /> Reorder</>}
                        </button>
                    </div>

                    {showReorderMode ? (
                        <div className="space-y-2">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
                                    {blocks.map(block => (
                                        <SortableBlockItem key={block.id} block={block} onToggle={toggleBlock} />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {blocks.map((block) => {
                                const Icon = block.icon;
                                return (
                                    <div
                                        key={block.id}
                                        className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border"
                                    >
                                        <Icon className="w-5 h-5 text-muted-foreground" />
                                        <span className="flex-1 font-medium text-sm text-foreground">{block.label}</span>
                                        <div className="flex items-center gap-2">
                                            {block.isEnabled ? (
                                                <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Visible</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Hidden</span>
                                            )}
                                            <button
                                                onClick={() => setActiveModal(block.id)}
                                                className="text-sm text-primary font-medium"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Customize Colors */}
                <div className="px-4 py-4">
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Colors</Label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1.5 block">Primary</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={customColors.primary}
                                    onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                />
                                <Input
                                    value={customColors.primary}
                                    onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                                    className="flex-1 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1.5 block">Background</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={customColors.background}
                                    onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                />
                                <Input
                                    value={customColors.background}
                                    onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                                    className="flex-1 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section Editor Modals */}
            <SectionEditor
                isOpen={activeModal === "Hero"}
                onClose={() => setActiveModal(null)}
                title="Hero Section"
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm">Full Name</Label>
                        <Input
                            value={agentInfo.fullName}
                            onChange={(e) => setAgentInfo({ ...agentInfo, fullName: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Title</Label>
                        <Input
                            value={agentInfo.title}
                            onChange={(e) => setAgentInfo({ ...agentInfo, title: e.target.value })}
                            placeholder="Software Engineer"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Company</Label>
                        <Input
                            value={agentInfo.company}
                            onChange={(e) => setAgentInfo({ ...agentInfo, company: e.target.value })}
                            placeholder="Company Name"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Profile Picture</Label>
                        <ImageUploader
                            value={agentInfo.avatarUrl || ""}
                            onChange={(val) => setAgentInfo({ ...agentInfo, avatarUrl: val })}
                            onRemove={() => setAgentInfo({ ...agentInfo, avatarUrl: "" })}
                            placeholder="Upload Photo"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Phone</Label>
                        <Input
                            value={agentInfo.phone}
                            onChange={(e) => setAgentInfo({ ...agentInfo, phone: e.target.value })}
                            placeholder="+1 234 567 890"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Email</Label>
                        <Input
                            type="email"
                            value={agentInfo.email}
                            onChange={(e) => setAgentInfo({ ...agentInfo, email: e.target.value })}
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Website</Label>
                        <Input
                            value={agentInfo.website || ""}
                            onChange={(e) => setAgentInfo({ ...agentInfo, website: e.target.value })}
                            placeholder="https://example.com"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Social Links</Label>
                        <div className="space-y-2 mt-2">
                            {agentInfo.socialLinks?.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <span className="text-sm flex-1">{link.platform}: {link.url}</span>
                                    <button
                                        onClick={() => {
                                            const newLinks = [...agentInfo.socialLinks];
                                            newLinks.splice(idx, 1);
                                            setAgentInfo({ ...agentInfo, socialLinks: newLinks });
                                        }}
                                        className="text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <select
                                    id="social-platform"
                                    className="flex-1 h-10 rounded-lg border border-gray-200 px-3 text-sm"
                                >
                                    <option value="Instagram">Instagram</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Twitter">Twitter</option>
                                    <option value="TikTok">TikTok</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Website">Website</option>
                                </select>
                                <Input
                                    id="social-url"
                                    placeholder="URL or username"
                                    className="flex-[2]"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const platform = (document.getElementById('social-platform') as HTMLSelectElement).value;
                                        const url = (document.getElementById('social-url') as HTMLInputElement).value;
                                        if (platform && url) {
                                            setAgentInfo({
                                                ...agentInfo,
                                                socialLinks: [...(agentInfo.socialLinks || []), { platform, url }]
                                            });
                                            (document.getElementById('social-url') as HTMLInputElement).value = '';
                                        }
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "About"}
                onClose={() => setActiveModal(null)}
                title="About Section"
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm">About Me</Label>
                        <textarea
                            className="w-full min-h-[150px] mt-1 p-3 rounded-lg border border-gray-200 text-sm"
                            placeholder="Tell your story..."
                            value={agentInfo.about || ""}
                            onChange={(e) => setAgentInfo({ ...agentInfo, about: e.target.value })}
                        />
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "Services"}
                onClose={() => setActiveModal(null)}
                title="Services"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {agentInfo.services?.map((service, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                            >
                                {service}
                                <button
                                    onClick={() => setAgentInfo({
                                        ...agentInfo,
                                        services: agentInfo.services?.filter((_, idx) => idx !== i)
                                    })}
                                    className="ml-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            id="new-service"
                            placeholder="Add a service (e.g., Web Design)"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    const input = e.target as HTMLInputElement;
                                    if (input.value.trim()) {
                                        setAgentInfo({
                                            ...agentInfo,
                                            services: [...(agentInfo.services || []), input.value.trim()]
                                        });
                                        input.value = "";
                                    }
                                }
                            }}
                        />
                        <Button
                            onClick={() => {
                                const input = document.getElementById('new-service') as HTMLInputElement;
                                if (input.value.trim()) {
                                    setAgentInfo({
                                        ...agentInfo,
                                        services: [...(agentInfo.services || []), input.value.trim()]
                                    });
                                    input.value = "";
                                }
                            }}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "Certification"}
                onClose={() => setActiveModal(null)}
                title="Certification"
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm">Title</Label>
                        <Input
                            value={certification.title}
                            onChange={(e) => setCertification({ ...certification, title: e.target.value })}
                            placeholder="e.g., Certified Software Engineer"
                        />
                    </div>
                    <div>
                        <Label className="text-sm">Description</Label>
                        <textarea
                            className="w-full min-h-[100px] mt-1 p-3 rounded-lg border border-gray-200 text-sm"
                            value={certification.description}
                            onChange={(e) => setCertification({ ...certification, description: e.target.value })}
                            placeholder="Description..."
                        />
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "Education"}
                onClose={() => setActiveModal(null)}
                title="Education"
            >
                <div className="space-y-4">
                    {education.map((edu, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">{edu.degree}</p>
                                <p className="text-sm text-gray-500">{edu.school}</p>
                                {edu.year && <p className="text-xs text-gray-400">{edu.year}</p>}
                            </div>
                            <button
                                onClick={() => setEducation(education.filter((_, idx) => idx !== i))}
                                className="text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <div className="space-y-2">
                        <Input
                            placeholder="Degree"
                            value={newEducation.degree}
                            onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                        />
                        <Input
                            placeholder="School"
                            value={newEducation.school}
                            onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
                        />
                        <Input
                            placeholder="Year"
                            value={newEducation.year}
                            onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                        />
                        <Button onClick={addEducation} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Add Education
                        </Button>
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "TechStack"}
                onClose={() => setActiveModal(null)}
                title="Tech Stack"
            >
                <div className="space-y-4">
                    {techStack.map((stack, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{stack.category}</p>
                                <button
                                    onClick={() => setTechStack(techStack.filter((_, idx) => idx !== i))}
                                    className="text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">{stack.skills.join(", ")}</p>
                        </div>
                    ))}
                    <div className="space-y-2">
                        <Input
                            placeholder="Category (e.g., Frontend)"
                            value={newTechStack.category}
                            onChange={(e) => setNewTechStack({ ...newTechStack, category: e.target.value })}
                        />
                        <Input
                            placeholder="Skills (comma separated)"
                            value={newTechStack.skills}
                            onChange={(e) => setNewTechStack({ ...newTechStack, skills: e.target.value })}
                        />
                        <Button onClick={addTechStack} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Add Category
                        </Button>
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "Experience"}
                onClose={() => setActiveModal(null)}
                title="Experience"
            >
                <div className="space-y-4">
                    {experience.map((exp, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{exp.title}</p>
                                <button
                                    onClick={() => setExperience(experience.filter((_, idx) => idx !== i))}
                                    className="text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">{exp.company}</p>
                            <p className="text-xs text-gray-400">{exp.period}</p>
                            {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                        </div>
                    ))}
                    <div className="space-y-2">
                        <Input
                            placeholder="Job Title"
                            value={newExperience.title}
                            onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                        />
                        <Input
                            placeholder="Company"
                            value={newExperience.company}
                            onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                        />
                        <Input
                            placeholder="Period (e.g., 2020 - Present)"
                            value={newExperience.period}
                            onChange={(e) => setNewExperience({ ...newExperience, period: e.target.value })}
                        />
                        <textarea
                            className="w-full p-3 rounded-lg border border-gray-200 text-sm"
                            placeholder="Description"
                            value={newExperience.description}
                            onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                        />
                        <Button onClick={addExperience} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Add Experience
                        </Button>
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "Testimonials"}
                onClose={() => setActiveModal(null)}
                title="Recommendations"
            >
                <div className="space-y-4">
                    {testimonials.map((t, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{t.author}</p>
                                <button
                                    onClick={() => setTestimonials(testimonials.filter((_, idx) => idx !== i))}
                                    className="text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {t.role && <p className="text-xs text-gray-500">{t.role}</p>}
                            <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{t.quote}&rdquo;</p>
                        </div>
                    ))}
                    <div className="space-y-2">
                        <textarea
                            className="w-full p-3 rounded-lg border border-gray-200 text-sm"
                            placeholder="Quote"
                            value={newTestimonial.quote}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
                        />
                        <Input
                            placeholder="Author Name"
                            value={newTestimonial.author}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, author: e.target.value })}
                        />
                        <Input
                            placeholder="Role/Title"
                            value={newTestimonial.role}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, role: e.target.value })}
                        />
                        <Button onClick={addTestimonial} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Add Recommendation
                        </Button>
                    </div>
                </div>
            </SectionEditor>

            <SectionEditor
                isOpen={activeModal === "Gallery"}
                onClose={() => setActiveModal(null)}
                title="Gallery"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {gallery.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                                <button
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                                    onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <ImageUploader
                        value=""
                        onChange={(val) => addGalleryImage(val)}
                        onRemove={() => { }}
                        placeholder="Add Gallery Image"
                    />
                </div>
            </SectionEditor>
        </div>
    );
}

export default function BuilderPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        }>
            <BuilderContent />
        </Suspense>
    );
}
