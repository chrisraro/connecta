"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
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
    Sparkles, ArrowUpDown, ShoppingBag, Building2, FolderOpen
} from "lucide-react";

// Templates
import { ProfileRenderer } from "@/components/templates/ProfileRenderer";
import { TEMPLATES, getTemplateMeta } from "@/components/templates/registry";
import {
    ProfileData, ProfileInfo, ProjectItem,
    PROJECT_CATEGORY_LABELS, ProfileType, ProductItem, ServiceItem,
    PropertyListingItem, InlineProject, DigitalCardConfig
} from "@/types/profile";
import { ImageUploader } from "@/components/ui/image-uploader";
import { EditableList, type FieldDef } from "@/components/profile-builder/EditableList";
import { InspectorPanel } from "@/components/profile-builder/InspectorPanel";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { Id } from "@/convex/_generated/dataModel";
import { profilePath } from "@/lib/profileUrl";
import { filterAgentInfoByEnabledBlocks } from "@/lib/profileSections";
import { hasUnsavedChanges } from "@/lib/hasUnsavedChanges";

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

const DEFAULT_DIGITAL_CARD: DigitalCardConfig = {
    backgroundColor: "#1e1e1e",
    textColor: "#ffffff",
    layout: "split",
    showQrCode: true,
    theme: "dark",
    cardBackgroundType: "solid",
    cardGradientStart: "#000000",
    cardGradientEnd: "#333333",
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
    { id: "Projects", label: "Projects", icon: FolderOpen, isEnabled: true },
    { id: "Products", label: "Store / Business Listing", icon: ShoppingBag, isEnabled: false },
    { id: "Properties", label: "Property Listing", icon: Building2, isEnabled: false },
    { id: "Testimonials", label: "Recommendations", icon: Quote, isEnabled: false },
    { id: "Gallery", label: "Gallery", icon: ImageIcon, isEnabled: false },
    { id: "Contact", label: "Contact Form", icon: User, isEnabled: true },
];

const getBlocksForProfileType = (type: ProfileType, currentBlocks: Block[]) => {
    return currentBlocks.filter(block => {
        if (type === "individual") {
            return block.id !== "Products" && block.id !== "Properties";
        } else if (type === "company") {
            return block.id !== "Education" && block.id !== "TechStack" && block.id !== "Experience" && block.id !== "Properties";
        } else if (type === "business") {
            return block.id !== "Education" && block.id !== "TechStack" && block.id !== "Experience";
        }
        return true;
    });
};

// --- Gallery Uploader Component ---

function GalleryUploader({
    gallery,
    onAdd,
    onRemove,
    maxImages = 3,
    maxSizeMB = 1,
}: {
    gallery: string[];
    onAdd: (storageId: string) => void;
    onRemove: (index: number) => void;
    maxImages?: number;
    maxSizeMB?: number;
}) {
    const { user } = useUser();
    const [isUploading, setIsUploading] = useState(false);
    const [localPreviews, setLocalPreviews] = useState<Record<number, string>>({});
    const inputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.images.generateUploadUrl);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`Image must be under ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
            return;
        }

        if (gallery.length >= maxImages) {
            alert(`Maximum ${maxImages} gallery images allowed.`);
            return;
        }

        setIsUploading(true);
        const previewIdx = gallery.length;
        const localUrl = URL.createObjectURL(file);
        setLocalPreviews(prev => ({ ...prev, [previewIdx]: localUrl }));

        try {
            if (!user?.id) {
                throw new Error("User not authenticated");
            }
            const postUrl = await generateUploadUrl({ clerkId: user.id });
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!result.ok) throw new Error("Upload failed");
            const { storageId } = await result.json();
            onAdd(storageId);
            setLocalPreviews(prev => {
                const next = { ...prev };
                delete next[previewIdx];
                return next;
            });
            URL.revokeObjectURL(localUrl);
        } catch (err) {
            console.error(err);
            setLocalPreviews(prev => {
                const next = { ...prev };
                delete next[previewIdx];
                return next;
            });
            URL.revokeObjectURL(localUrl);
            alert("Failed to upload image.");
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
                {gallery.length}/{maxImages} images (max {maxSizeMB}MB each)
            </p>
            <div className="grid grid-cols-3 gap-3">
                {gallery.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                        <ProfileImage
                            src={img}
                            alt={`Gallery ${i + 1}`}
                            className="w-full h-full object-cover"
                        />
                        <button
                            aria-label={`Remove gallery image ${i + 1}`}
                            className="absolute -top-1 -right-1 flex size-11 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                            onClick={() => onRemove(i)}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {/* Show local preview for uploading image */}
                {Object.entries(localPreviews).map(([idx, url]) => (
                    <div key={`preview-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                        <img src={url} alt="Uploading..." className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    </div>
                ))}
                {/* Upload button */}
                {gallery.length < maxImages && Object.keys(localPreviews).length === 0 && (
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                        className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
                    >
                        {isUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <Plus className="w-5 h-5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">Add Photo</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
}

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
            <div
                {...attributes}
                {...listeners}
                aria-label={`Reorder ${block.label}`}
                className="flex size-11 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground"
            >
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
                        <div
                            className="absolute inset-0"
                            style={{ background: template.thumbnail }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-semibold text-sm">{template.name}</p>
                            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{template.description}</p>
                        </div>
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

// --- EditableList field definitions ---
// One FieldDef set per list, matching each item type's real shape in
// types/profile.ts. Kept at module scope since they don't depend on
// component state.

type EducationItem = NonNullable<ProfileInfo["education"]>[number];
const EDUCATION_FIELDS: FieldDef<EducationItem>[] = [
    { key: "degree", label: "Degree", placeholder: "Degree", required: true },
    { key: "school", label: "School", placeholder: "School", required: true },
    { key: "year", label: "Year", placeholder: "Year" },
];

// techStack items store `skills` as a string[]; EditableList works over a
// display item shaped like `{ category, skills: string }` (comma-separated),
// converted to/from the real `{ category, skills: string[] }` shape at the
// call site — mirroring how `addTechStack` already parses the draft input.
type TechStackDisplayItem = { category: string; skills: string };
const TECH_STACK_FIELDS: FieldDef<TechStackDisplayItem>[] = [
    { key: "category", label: "Category", placeholder: "e.g., Frontend", required: true },
    { key: "skills", label: "Skills (comma separated)", placeholder: "Skills (comma separated)", required: true },
];

type ExperienceItem = NonNullable<ProfileInfo["experience"]>[number];
const EXPERIENCE_FIELDS: FieldDef<ExperienceItem>[] = [
    { key: "title", label: "Job Title", placeholder: "Job Title", required: true },
    { key: "company", label: "Company", placeholder: "Company", required: true },
    { key: "period", label: "Period", placeholder: "e.g., 2020 - Present" },
    { key: "description", label: "Description", placeholder: "Description", type: "textarea" },
];

const INLINE_PROJECT_FIELDS: FieldDef<InlineProject>[] = [
    { key: "title", label: "Project Title", placeholder: "Project Title", required: true },
    { key: "description", label: "Description", placeholder: "Short description", type: "textarea" },
    { key: "category", label: "Category", placeholder: "e.g., web-design" },
    { key: "link", label: "External URL", placeholder: "External URL (optional)", type: "url" },
];

const PRODUCT_FIELDS: FieldDef<ProductItem>[] = [
    { key: "title", label: "Product Title", placeholder: "Product Title", required: true },
    { key: "description", label: "Description", placeholder: "Description", type: "textarea", required: true },
    { key: "price", label: "Price", placeholder: "Price (optional)", type: "number" },
    { key: "link", label: "Link", placeholder: "Link (optional)", type: "url" },
];

const PROPERTY_LISTING_FIELDS: FieldDef<PropertyListingItem>[] = [
    { key: "title", label: "Property Title", placeholder: "Property Title", required: true },
    { key: "description", label: "Description", placeholder: "Description (optional)", type: "textarea" },
    { key: "price", label: "Price", placeholder: "e.g., $250,000" },
    { key: "location", label: "Location", placeholder: "Location" },
    { key: "status", label: "Status", placeholder: "for-sale / for-rent / sold" },
    { key: "link", label: "Listing URL", placeholder: "Listing URL (optional)", type: "url" },
];

type TestimonialItem = NonNullable<ProfileInfo["testimonials"]>[number];
const TESTIMONIAL_FIELDS: FieldDef<TestimonialItem>[] = [
    { key: "quote", label: "Quote", placeholder: "Quote", type: "textarea", required: true },
    { key: "author", label: "Author Name", placeholder: "Author Name", required: true },
    { key: "role", label: "Role/Title", placeholder: "Role/Title" },
];

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

    // Config State - expanded colors
    const [customColors, setCustomColors] = useState({
        primary: TEMPLATES[0].defaultColors.primary,
        background: TEMPLATES[0].defaultColors.background,
        text: TEMPLATES[0].defaultColors.text,
        secondary: TEMPLATES[0].defaultColors.primary,
        accent: TEMPLATES[0].defaultColors.primary,
    });
    const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
    const [profileType, setProfileType] = useState<ProfileType>("individual");

    // Content State
    const [agentInfo, setAgentInfo] = useState<ProfileInfo>(INITIAL_AGENT_INFO);
    const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
    const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
    const [digitalCard, setDigitalCard] = useState<DigitalCardConfig>(DEFAULT_DIGITAL_CARD);
    const [previewMode, setPreviewMode] = useState<"page" | "card">("page");
    const [projects, setProjects] = useState<ProjectItem[]>([]);

    // New field states
    const [certification, setCertification] = useState<{ title: string; description: string }>({ title: "", description: "" });
    const [education, setEducation] = useState<NonNullable<ProfileInfo["education"]>>([]);
    const [techStack, setTechStack] = useState<NonNullable<ProfileInfo["techStack"]>>([]);
    const [experience, setExperience] = useState<NonNullable<ProfileInfo["experience"]>>([]);
    const [testimonials, setTestimonials] = useState<NonNullable<ProfileInfo["testimonials"]>>([]);
    const [gallery, setGallery] = useState<NonNullable<ProfileInfo["gallery"]>>([]);

    // Products / Store state
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [newProduct, setNewProduct] = useState<{ title: string; description: string; price: string; link: string }>({ title: "", description: "", price: "", link: "" });

    // Property Listings state
    const [propertyListings, setPropertyListings] = useState<PropertyListingItem[]>([]);
    const [newPropertyListing, setNewPropertyListing] = useState<{ title: string; description: string; price: string; location: string; status: string; link: string }>({ title: "", description: "", price: "", location: "", status: "for-sale", link: "" });

    // Inline Projects state
    const [inlineProjects, setInlineProjects] = useState<InlineProject[]>([]);
    const [newInlineProject, setNewInlineProject] = useState<{ title: string; description: string; category: string; link: string }>({ title: "", description: "", category: "", link: "" });

    // Form inputs for new items
    const [newEducation, setNewEducation] = useState({ degree: "", school: "", year: "" });
    const [newTechStack, setNewTechStack] = useState({ category: "", skills: "" });
    const [newExperience, setNewExperience] = useState({ title: "", company: "", period: "", description: "" });
    const [newTestimonial, setNewTestimonial] = useState({ quote: "", author: "", role: "" });

    const captureSnapshot = useCallback(() => {
        savedSnapshotRef.current = JSON.stringify({
            agentInfo, additionalPhones, additionalEmails, digitalCard,
            blocks, selectedTemplate, customColors, certification, education,
            techStack, experience, testimonials, gallery, products,
            propertyListings, inlineProjects,
        });
    }, [agentInfo, additionalPhones, additionalEmails, digitalCard, blocks,
        selectedTemplate, customColors, certification, education, techStack,
        experience, testimonials, gallery, products, propertyListings, inlineProjects]);

    const isDirty = useCallback(() => {
        if (savedSnapshotRef.current === null) return false;
        const current = JSON.stringify({
            agentInfo, additionalPhones, additionalEmails, digitalCard,
            blocks, selectedTemplate, customColors, certification, education,
            techStack, experience, testimonials, gallery, products,
            propertyListings, inlineProjects,
        });
        return hasUnsavedChanges(savedSnapshotRef.current, current);
    }, [agentInfo, additionalPhones, additionalEmails, digitalCard, blocks,
        selectedTemplate, customColors, certification, education, techStack,
        experience, testimonials, gallery, products, propertyListings, inlineProjects]);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty()) {
                e.preventDefault();
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    const handleCardThemeChange = (theme: "light" | "dark" | "glass" | "carbon") => {
        let colors = {};
        if (theme === "light") {
            colors = {
                backgroundColor: "#ffffff",
                textColor: "#1e293b",
                cardGradientStart: "#ffffff",
                cardGradientEnd: "#f1f5f9",
            };
        } else if (theme === "dark") {
            colors = {
                backgroundColor: "#18181b",
                textColor: "#f5f5f5",
                cardGradientStart: "#18181b",
                cardGradientEnd: "#09090b",
            };
        } else if (theme === "glass") {
            colors = {
                backgroundColor: "#ffffff",
                textColor: "#ffffff",
                cardGradientStart: "#ffffff",
                cardGradientEnd: "#ffffff",
            };
        } else if (theme === "carbon") {
            colors = {
                backgroundColor: "#0d0d0d",
                textColor: "#ececec",
                cardGradientStart: "#18181b",
                cardGradientEnd: "#020202",
            };
        }
        setDigitalCard({
            ...digitalCard,
            theme,
            ...colors
        });
    };

    // Prefill logic
    const [hasPrefilled, setHasPrefilled] = useState(false);
    const savedSnapshotRef = useRef<string | null>(null);

    // Brand-new profiles (no existingProfile to edit AND no completed
    // onboarding data) never satisfy either branch of the prefill effect
    // below, so hasPrefilled never flips to true and the recapture effect
    // further down never runs. Without this, savedSnapshotRef.current would
    // stay null for the entire session and isDirty() (which short-circuits
    // to false when the ref is null) would never report unsaved changes —
    // silently losing a first-time user's typed data on navigation. Capture
    // the initial (default/empty) state as the baseline unconditionally on
    // mount so edits made from a blank profile are correctly detected as
    // dirty. When prefill data does load (existing profile or onboarding),
    // the hasPrefilled-triggered captureSnapshot() calls below run afterward
    // and correctly overwrite this baseline with the loaded state.
    useEffect(() => {
        if (savedSnapshotRef.current === null) {
            captureSnapshot();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                if ((info as any).additionalPhones) setAdditionalPhones((info as any).additionalPhones);
                if ((info as any).additionalEmails) setAdditionalEmails((info as any).additionalEmails);
                if ((existingProfile as any).digitalCard) setDigitalCard((existingProfile as any).digitalCard);

                // Load products
                if (existingProfile.products) {
                    setProducts(existingProfile.products.map(p => ({
                        ...p,
                        price: p.price ?? undefined,
                        image: p.image ?? undefined,
                        link: p.link ?? undefined,
                    })));
                }

                // Load property listings
                if ((existingProfile as any).propertyListings) {
                    setPropertyListings((existingProfile as any).propertyListings);
                }

                // Load inline projects
                if ((existingProfile as any).inlineProjects) {
                    setInlineProjects((existingProfile as any).inlineProjects);
                }

                // Load template
                if (existingProfile.layoutConfig?.themeId) {
                    const templateId = existingProfile.layoutConfig.themeId;
                    if (TEMPLATES.find(t => t.id === templateId)) {
                        setSelectedTemplate(templateId);
                    }
                }

                if (existingProfile.layoutConfig) {
                    const palette = existingProfile.layoutConfig.colorPalette || TEMPLATES[0].defaultColors;
                    setCustomColors({
                        primary: palette.primary,
                        background: palette.background,
                        text: palette.text,
                        secondary: (palette as any).secondary || palette.primary,
                        accent: (palette as any).accent || palette.primary,
                    });
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
                captureSnapshot();
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
                captureSnapshot();
            }
        } catch (err) {
            console.error("Prefill error:", err);
        }
    }, [onboarding, hasPrefilled, user, existingProfile, editingId]);

    // The prefill effect above calls captureSnapshot() synchronously right after
    // its setXxx(...) calls, in the same tick — but those state updates are
    // batched, so that call still closes over the pre-prefill state and would
    // record a stale baseline. Re-capture once hasPrefilled actually flips to
    // true and the prefilled state has committed, so isDirty() starts out
    // false instead of false-alarming on the very first back click.
    // (captureSnapshot is intentionally omitted from the deps below — the
    // same pattern the prefill effect above uses — so this only re-fires
    // when hasPrefilled itself flips, not on every subsequent form edit.)
    useEffect(() => {
        if (hasPrefilled) {
            captureSnapshot();
        }
    }, [hasPrefilled]);

    // Update colors when template changes
    useEffect(() => {
        const template = getTemplateMeta(selectedTemplate);
        if (template && !editingId) {
            setCustomColors(prev => ({
                ...template.defaultColors,
                secondary: template.defaultColors.primary,
                accent: template.defaultColors.primary,
            }));
        }
    }, [selectedTemplate, editingId]);

    // Manual "sticky" preview (desktop only — see the long comment at the
    // render site for why CSS `position: sticky` doesn't work in this
    // dashboard shell). `previewSpacerRef` is the in-flow placeholder that
    // reserves the column's box; `previewContentRef` is the visible preview
    // that gets pinned with `position: fixed` once the placeholder's top
    // has scrolled above the header.
    const previewSpacerRef = useRef<HTMLDivElement>(null);
    const previewContentRef = useRef<HTMLDivElement>(null);
    const [isPreviewPinned, setIsPreviewPinned] = useState(false);
    const [pinnedGeometry, setPinnedGeometry] = useState<{ left: number; width: number; height: number } | null>(null);

    useEffect(() => {
        const HEADER_OFFSET = 96; // matches the fixed `top` applied while pinned
        const desktopQuery = window.matchMedia("(min-width: 1024px)");
        let rafId: number | null = null;

        const measure = () => {
            if (!desktopQuery.matches || !previewSpacerRef.current) {
                setIsPreviewPinned(false);
                return;
            }
            const rect = previewSpacerRef.current.getBoundingClientRect();
            const contentHeight = previewContentRef.current?.offsetHeight ?? rect.height;
            setIsPreviewPinned(rect.top <= HEADER_OFFSET);
            setPinnedGeometry({ left: rect.left, width: rect.width, height: contentHeight });
        };

        const scheduleMeasure = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                measure();
            });
        };

        measure();
        window.addEventListener("scroll", scheduleMeasure, { passive: true });
        window.addEventListener("resize", scheduleMeasure);
        desktopQuery.addEventListener("change", measure);
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", scheduleMeasure);
            window.removeEventListener("resize", scheduleMeasure);
            desktopQuery.removeEventListener("change", measure);
        };
    }, []);

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

    const handleProfileTypeChange = (type: ProfileType) => {
        setProfileType(type);

        // Dynamic default theme and template switching
        const matchingTemplate = type === "business" ? "architectural" : type === "company" ? "kinetic" : "editorial";
        setSelectedTemplate(matchingTemplate);

        const templateMeta = TEMPLATES.find(t => t.id === matchingTemplate);
        if (templateMeta) {
            setCustomColors({
                primary: templateMeta.defaultColors.primary,
                background: templateMeta.defaultColors.background,
                text: templateMeta.defaultColors.text,
                secondary: templateMeta.defaultColors.primary,
                accent: templateMeta.defaultColors.primary,
            });
        }

        // Pre-enable blocks matching the profile type
        setBlocks(prev => prev.map(block => {
            if (type === "individual") {
                if (["Hero", "About", "Contact", "Projects", "Experience", "Education"].includes(block.id)) {
                    return { ...block, isEnabled: true };
                }
                if (["Products", "Properties"].includes(block.id)) {
                    return { ...block, isEnabled: false };
                }
            } else if (type === "company") {
                if (["Hero", "About", "Contact", "Projects", "Services", "Products"].includes(block.id)) {
                    return { ...block, isEnabled: true };
                }
                if (["Education", "Experience", "Properties"].includes(block.id)) {
                    return { ...block, isEnabled: false };
                }
            } else if (type === "business") {
                if (["Hero", "About", "Contact", "Services", "Products", "Properties", "Gallery"].includes(block.id)) {
                    return { ...block, isEnabled: true };
                }
                if (["Education", "Experience"].includes(block.id)) {
                    return { ...block, isEnabled: false };
                }
            }
            return block;
        }));
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
                additionalPhones: additionalPhones.length > 0 ? additionalPhones : undefined,
                additionalEmails: additionalEmails.length > 0 ? additionalEmails : undefined,
                address: agentInfo.address ? String(agentInfo.address) : undefined,
                website: agentInfo.website ? String(agentInfo.website) : undefined,
                about: agentInfo.about ? String(agentInfo.about) : undefined,
                avatarUrl: agentInfo.avatarUrl ? String(agentInfo.avatarUrl) : undefined,
                services: agentInfo.services || [],
                socialLinks: agentInfo.socialLinks || [],
                certification: certification.title ? certification : undefined,
                education: education.length > 0 ? education : undefined,
                techStack: techStack.length > 0 ? techStack : undefined,
                experience: experience.length > 0 ? experience : undefined,
                testimonials: testimonials.length > 0 ? testimonials : undefined,
                gallery: gallery.length > 0 ? gallery : undefined,
            };

            const enabledBlockIds = getBlocksForProfileType(profileType, blocks)
                .filter(b => b.isEnabled)
                .map(b => b.id);
            // filterAgentInfoByEnabledBlocks only ever strips the optional
            // block-owned fields (certification/education/etc.) — the
            // required identity fields below are never touched by it, so
            // re-asserting them here just narrows the return type back from
            // ProfileInfo's optional `company` etc. to what createProfile expects.
            const filteredAgentInfo = {
                ...filterAgentInfoByEnabledBlocks(cleanAgentInfo, enabledBlockIds),
                fullName: cleanAgentInfo.fullName,
                title: cleanAgentInfo.title,
                company: cleanAgentInfo.company,
                phone: cleanAgentInfo.phone,
                email: cleanAgentInfo.email,
                socialLinks: cleanAgentInfo.socialLinks,
            };

            const cleanProducts = products.length > 0 ? products.map(p => ({
                title: p.title,
                description: p.description,
                price: p.price ? Number(p.price) : undefined,
                image: p.image || undefined,
                link: p.link || undefined,
            })) : undefined;

            const cleanPropertyListings = propertyListings.length > 0 ? propertyListings.map(p => ({
                title: p.title,
                description: p.description || undefined,
                price: p.price || undefined,
                location: p.location || undefined,
                image: p.image || undefined,
                status: p.status || undefined,
                link: p.link || undefined,
            })) : undefined;

            const cleanInlineProjects = inlineProjects.length > 0 ? inlineProjects.map(p => ({
                title: p.title,
                description: p.description || undefined,
                category: p.category || undefined,
                image: p.image || undefined,
                link: p.link || undefined,
            })) : undefined;

            const { id: profileId, slug } = await createProfile({
                id: editingId ? (editingId as Id<"profiles">) : undefined,
                clerkId: user.id,
                name: agentInfo.fullName ? `${agentInfo.fullName}'s Profile` : "My Profile",
                profileType: profileType,
                agentInfo: filteredAgentInfo,
                layoutConfig: {
                    themeId: selectedTemplate,
                    colorPalette: {
                        primary: customColors.primary,
                        background: customColors.background,
                        text: customColors.text,
                        secondary: customColors.secondary !== customColors.primary ? customColors.secondary : undefined,
                        accent: customColors.accent !== customColors.primary ? customColors.accent : undefined,
                    },
                    componentOrder: getBlocksForProfileType(profileType, blocks).filter(b => b.isEnabled).map(b => b.id),
                    heroStyle: "default"
                },
                featuredProperties: [],
                featuredProjects: [],
                products: cleanProducts,
                services: [],
                propertyListings: cleanPropertyListings,
                inlineProjects: cleanInlineProjects,
                digitalCard: digitalCard,
            });
            captureSnapshot();
            router.push(profilePath({ _id: profileId, slug }));
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

    const addProduct = () => {
        if (!newProduct.title || !newProduct.description) return;
        setProducts([...products, {
            title: newProduct.title,
            description: newProduct.description,
            price: newProduct.price ? Number(newProduct.price) : undefined,
            link: newProduct.link || undefined,
        }]);
        setNewProduct({ title: "", description: "", price: "", link: "" });
    };

    const addPropertyListing = () => {
        if (!newPropertyListing.title) return;
        setPropertyListings([...propertyListings, {
            title: newPropertyListing.title,
            description: newPropertyListing.description || undefined,
            price: newPropertyListing.price || undefined,
            location: newPropertyListing.location || undefined,
            status: newPropertyListing.status || undefined,
            link: newPropertyListing.link || undefined,
        }]);
        setNewPropertyListing({ title: "", description: "", price: "", location: "", status: "for-sale", link: "" });
    };

    const addInlineProject = () => {
        if (!newInlineProject.title) return;
        setInlineProjects([...inlineProjects, {
            title: newInlineProject.title,
            description: newInlineProject.description || undefined,
            category: newInlineProject.category || undefined,
            link: newInlineProject.link || undefined,
        }]);
        setNewInlineProject({ title: "", description: "", category: "", link: "" });
    };

    const addGalleryImage = (storageId: string) => {
        if (storageId && gallery.length < 3) {
            setGallery([...gallery, storageId]);
        }
    };

    const removeGalleryImage = (index: number) => {
        setGallery(gallery.filter((_, i) => i !== index));
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
            products: products,
            services: [],
            propertyListings: propertyListings,
            inlineProjects: inlineProjects,
            theme: {
                primaryColor: customColors.primary,
                backgroundColor: customColors.background,
                textColor: customColors.text,
                secondaryColor: customColors.secondary || undefined,
                accentColor: customColors.accent || undefined,
            }
        };

        return <ProfileRenderer data={data} templateId={selectedTemplate} />;
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
                <div className="mx-auto flex w-full max-w-lg items-center justify-between lg:max-w-6xl">
                    <button
                        onClick={() => {
                            if (isDirty() && !window.confirm("You have unsaved changes. Leave without saving?")) {
                                return;
                            }
                            router.back();
                        }}
                        aria-label="Back"
                        className="flex size-11 -ml-2 items-center justify-center hover:bg-muted rounded-full text-foreground"
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

            <div className="mx-auto w-full max-w-lg pb-8 lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-8 lg:items-start">
              {/* Preview column — stays visible & in view while the controls
                  column (rendered alongside it at lg:) scrolls independently.
                  `position: sticky` doesn't work here: the dashboard shell's
                  <main className="overflow-y-auto"> (app/dashboard/layout.tsx)
                  is a non-scrolling scroll-container (it never actually
                  overflows, the window does), and per spec that still makes
                  it the nearest scrolling ancestor for sticky's containing
                  block — so a CSS-only sticky element inside it is inert.
                  `previewPinned` reimplements the same behavior with a
                  scroll listener: `previewSpacerRef` is a normal in-flow
                  placeholder (it reserves the column's width/height); once
                  its top scrolls above the header, the visible content
                  switches to `position: fixed` at the same left/width. */}
              <div ref={previewSpacerRef} style={isPreviewPinned && pinnedGeometry ? { height: pinnedGeometry.height } : undefined}>
              <div
                ref={previewContentRef}
                className={isPreviewPinned ? "fixed z-30" : undefined}
                style={isPreviewPinned && pinnedGeometry ? { top: 96, left: pinnedGeometry.left, width: pinnedGeometry.width } : undefined}
              >
                {/* Preview Switcher */}
                <div className="px-4 pt-4 pb-2 lg:px-0">
                    <div className="flex bg-muted p-1 rounded-xl">
                        <button
                            onClick={() => setPreviewMode("page")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                previewMode === "page"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Profile Page Preview
                        </button>
                        <button
                            onClick={() => setPreviewMode("card")}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                previewMode === "card"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Digital Card Preview
                        </button>
                    </div>
                </div>

                {/* Phone Preview */}
                <div className="p-4 lg:px-0">
                    <div
                        className="bg-gray-900 rounded-[var(--r-lg)] p-3"
                        style={{ boxShadow: "var(--e-overlay)" }}
                    >
                        <div
                            className="rounded-[var(--r-lg)] overflow-hidden bg-white max-h-[70dvh] overflow-y-auto lg:max-h-[calc(100dvh-8rem)]"
                        >
                            {previewMode === "card" ? (
                                <div className="p-4 flex justify-center bg-neutral-900/5 min-h-[320px] items-center">
                                    <DigitalBusinessCard
                                        fullName={agentInfo.fullName}
                                        title={agentInfo.title}
                                        company={agentInfo.company}
                                        phone={agentInfo.phone}
                                        email={agentInfo.email}
                                        additionalPhones={additionalPhones}
                                        additionalEmails={additionalEmails}
                                        services={agentInfo.services}
                                        about={agentInfo.about}
                                        profileId={editingId || undefined}
                                        profileSlug={existingProfile?.slug}
                                        config={digitalCard}
                                        onPositionsChange={(newPos) => setDigitalCard({ ...digitalCard, positions: newPos })}
                                    />
                                </div>
                            ) : (
                                renderPreview()
                            )}
                        </div>
                    </div>
                </div>
              </div>
              </div>

              {/* Controls column */}
              <div>
                {/* Profile Page Configs */}
                {previewMode === "page" && (
                    <>
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
                                onClick={() => handleProfileTypeChange(type)}
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
                                <SortableContext items={getBlocksForProfileType(profileType, blocks)} strategy={verticalListSortingStrategy}>
                                    {getBlocksForProfileType(profileType, blocks).map(block => (
                                        <SortableBlockItem key={block.id} block={block} onToggle={toggleBlock} />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {getBlocksForProfileType(profileType, blocks).map((block) => {
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
                                            {/* The Contact block renders a static lead-capture form
                                                (see components/templates/sections/ContactSection.tsx)
                                                with no configurable content — there is nothing an
                                                editor could change, so no Edit affordance is shown
                                                for it (previously it opened a modal for an
                                                activeModal value no editor matched, a dead click). */}
                                            {block.id !== "Contact" && (
                                                <button
                                                    onClick={() => setActiveModal(block.id)}
                                                    className="min-h-11 px-1 text-sm text-primary font-medium"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Section Editor Modals */}
                <InspectorPanel
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
                        {/* Additional Phones */}
                        <div className="space-y-1.5 mt-2">
                            {additionalPhones.map((ph, idx) => (
                                <div key={`add-phone-${idx}`} className="flex items-center gap-2">
                                    <Input
                                        value={ph}
                                        onChange={(e) => {
                                            const newPhs = [...additionalPhones];
                                            newPhs[idx] = e.target.value;
                                            setAdditionalPhones(newPhs);
                                        }}
                                        className="text-xs flex-1"
                                    />
                                    <button
                                        type="button"
                                        aria-label={`Remove phone number ${idx + 1}`}
                                        onClick={() => setAdditionalPhones(additionalPhones.filter((_, i) => i !== idx))}
                                        className="flex size-11 shrink-0 items-center justify-center text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setAdditionalPhones([...additionalPhones, ""])}
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                                <Plus className="w-3 h-3" /> Add phone number
                            </button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-sm">Email</Label>
                        <Input
                            type="email"
                            value={agentInfo.email}
                            onChange={(e) => setAgentInfo({ ...agentInfo, email: e.target.value })}
                            placeholder="john@example.com"
                        />
                        {/* Additional Emails */}
                        <div className="space-y-1.5 mt-2">
                            {additionalEmails.map((em, idx) => (
                                <div key={`add-email-${idx}`} className="flex items-center gap-2">
                                    <Input
                                        type="email"
                                        value={em}
                                        onChange={(e) => {
                                            const newEms = [...additionalEmails];
                                            newEms[idx] = e.target.value;
                                            setAdditionalEmails(newEms);
                                        }}
                                        className="text-xs flex-1"
                                    />
                                    <button
                                        type="button"
                                        aria-label={`Remove email address ${idx + 1}`}
                                        onClick={() => setAdditionalEmails(additionalEmails.filter((_, i) => i !== idx))}
                                        className="flex size-11 shrink-0 items-center justify-center text-red-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setAdditionalEmails([...additionalEmails, ""])}
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                                <Plus className="w-3 h-3" /> Add email address
                            </button>
                        </div>
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
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                    <span className="text-sm flex-1 text-foreground">{link.platform}: {link.url}</span>
                                    <button
                                        aria-label={`Remove ${link.platform} link`}
                                        onClick={() => {
                                            const newLinks = [...agentInfo.socialLinks];
                                            newLinks.splice(idx, 1);
                                            setAgentInfo({ ...agentInfo, socialLinks: newLinks });
                                        }}
                                        className="flex size-11 shrink-0 items-center justify-center text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <select
                                    id="social-platform"
                                    className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
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
                                    aria-label="Add social link"
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
            </InspectorPanel>

            <InspectorPanel
                isOpen={activeModal === "About"}
                onClose={() => setActiveModal(null)}
                title="About Section"
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm">About Me</Label>
                        <textarea
                            className="w-full min-h-[150px] mt-1 p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                            placeholder="Tell your story..."
                            value={agentInfo.about || ""}
                            onChange={(e) => setAgentInfo({ ...agentInfo, about: e.target.value })}
                        />
                    </div>
                </div>
            </InspectorPanel>

            <InspectorPanel
                isOpen={activeModal === "Services"}
                onClose={() => setActiveModal(null)}
                title="Services"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {agentInfo.services?.map((service, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                            >
                                {service}
                                <button
                                    aria-label={`Remove ${service} service`}
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
                            aria-label="Add service"
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
            </InspectorPanel>

            <InspectorPanel
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
                            className="w-full min-h-[100px] mt-1 p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                            value={certification.description}
                            onChange={(e) => setCertification({ ...certification, description: e.target.value })}
                            placeholder="Description..."
                        />
                    </div>
                </div>
            </InspectorPanel>

            <InspectorPanel
                isOpen={activeModal === "Education"}
                onClose={() => setActiveModal(null)}
                title="Education"
            >
                <EditableList<EducationItem>
                    items={education}
                    fields={EDUCATION_FIELDS}
                    onChange={setEducation}
                    itemLabel="education entry"
                    onAdd={addEducation}
                    addLabel="Add Education"
                    emptyHint="No education entries yet."
                >
                    <Input placeholder="Degree" value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} />
                    <Input placeholder="School" value={newEducation.school} onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })} />
                    <Input placeholder="Year" value={newEducation.year} onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })} />
                </EditableList>
            </InspectorPanel>

            <InspectorPanel
                isOpen={activeModal === "TechStack"}
                onClose={() => setActiveModal(null)}
                title="Tech Stack"
            >
                <EditableList<TechStackDisplayItem>
                    items={techStack.map((stack) => ({ category: stack.category, skills: stack.skills.join(", ") }))}
                    fields={TECH_STACK_FIELDS}
                    onChange={(next) =>
                        setTechStack(
                            next.map((stack) => ({
                                category: stack.category,
                                skills: stack.skills.split(",").map((s) => s.trim()).filter(Boolean),
                            }))
                        )
                    }
                    itemLabel="tech stack category"
                    onAdd={addTechStack}
                    addLabel="Add Category"
                    emptyHint="No tech stack categories yet."
                >
                    <Input placeholder="Category (e.g., Frontend)" value={newTechStack.category} onChange={(e) => setNewTechStack({ ...newTechStack, category: e.target.value })} />
                    <Input placeholder="Skills (comma separated)" value={newTechStack.skills} onChange={(e) => setNewTechStack({ ...newTechStack, skills: e.target.value })} />
                </EditableList>
            </InspectorPanel>

            <InspectorPanel
                isOpen={activeModal === "Experience"}
                onClose={() => setActiveModal(null)}
                title="Experience"
            >
                <EditableList<ExperienceItem>
                    items={experience}
                    fields={EXPERIENCE_FIELDS}
                    onChange={setExperience}
                    itemLabel="experience entry"
                    onAdd={addExperience}
                    addLabel="Add Experience"
                    emptyHint="No experience entries yet."
                >
                    <Input placeholder="Job Title" value={newExperience.title} onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })} />
                    <Input placeholder="Company" value={newExperience.company} onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })} />
                    <Input placeholder="Period (e.g., 2020 - Present)" value={newExperience.period} onChange={(e) => setNewExperience({ ...newExperience, period: e.target.value })} />
                    <textarea
                        className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        placeholder="Description"
                        value={newExperience.description}
                        onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                    />
                </EditableList>
            </InspectorPanel>

            {/* Projects Section Editor */}
            <InspectorPanel
                isOpen={activeModal === "Projects"}
                onClose={() => setActiveModal(null)}
                title="Projects"
            >
                <EditableList<InlineProject>
                    items={inlineProjects}
                    fields={INLINE_PROJECT_FIELDS}
                    onChange={setInlineProjects}
                    itemLabel="project"
                    onAdd={addInlineProject}
                    addLabel="Add Project"
                    emptyHint="No projects yet."
                >
                    <Label className="text-xs text-muted-foreground">Add New Project</Label>
                    <Input placeholder="Project Title" value={newInlineProject.title} onChange={(e) => setNewInlineProject({ ...newInlineProject, title: e.target.value })} />
                    <textarea
                        className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        placeholder="Short description"
                        value={newInlineProject.description}
                        onChange={(e) => setNewInlineProject({ ...newInlineProject, description: e.target.value })}
                    />
                    <select
                        value={newInlineProject.category}
                        onChange={(e) => setNewInlineProject({ ...newInlineProject, category: e.target.value })}
                        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    >
                        <option value="">Select Category</option>
                        {Object.entries(PROJECT_CATEGORY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <Input placeholder="External URL (optional)" value={newInlineProject.link} onChange={(e) => setNewInlineProject({ ...newInlineProject, link: e.target.value })} />
                </EditableList>
            </InspectorPanel>

            {/* Products / Store Listing Editor */}
            <InspectorPanel
                isOpen={activeModal === "Products"}
                onClose={() => setActiveModal(null)}
                title="Store / Business Listing"
            >
                <EditableList<ProductItem>
                    items={products}
                    fields={PRODUCT_FIELDS}
                    onChange={setProducts}
                    itemLabel="product"
                    onAdd={addProduct}
                    addLabel="Add Product"
                    emptyHint="No products yet."
                >
                    <Label className="text-xs text-muted-foreground">Add New Product / Listing</Label>
                    <Input placeholder="Product Title" value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} />
                    <textarea
                        className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        placeholder="Description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    />
                    <Input type="number" placeholder="Price (optional)" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                    <Input placeholder="Link (optional)" value={newProduct.link} onChange={(e) => setNewProduct({ ...newProduct, link: e.target.value })} />
                </EditableList>
            </InspectorPanel>

            {/* Property Listing Editor */}
            <InspectorPanel
                isOpen={activeModal === "Properties"}
                onClose={() => setActiveModal(null)}
                title="Property Listing"
            >
                <EditableList<PropertyListingItem>
                    items={propertyListings}
                    fields={PROPERTY_LISTING_FIELDS}
                    onChange={setPropertyListings}
                    itemLabel="property"
                    onAdd={addPropertyListing}
                    addLabel="Add Property"
                    emptyHint="No properties yet."
                >
                    <Label className="text-xs text-muted-foreground">Add New Property</Label>
                    <Input placeholder="Property Title" value={newPropertyListing.title} onChange={(e) => setNewPropertyListing({ ...newPropertyListing, title: e.target.value })} />
                    <textarea
                        className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        placeholder="Description (optional)"
                        value={newPropertyListing.description}
                        onChange={(e) => setNewPropertyListing({ ...newPropertyListing, description: e.target.value })}
                    />
                    <Input placeholder="Price (e.g., $250,000)" value={newPropertyListing.price} onChange={(e) => setNewPropertyListing({ ...newPropertyListing, price: e.target.value })} />
                    <Input placeholder="Location" value={newPropertyListing.location} onChange={(e) => setNewPropertyListing({ ...newPropertyListing, location: e.target.value })} />
                    <select
                        value={newPropertyListing.status}
                        onChange={(e) => setNewPropertyListing({ ...newPropertyListing, status: e.target.value })}
                        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    >
                        <option value="for-sale">For Sale</option>
                        <option value="for-rent">For Rent</option>
                        <option value="sold">Sold</option>
                    </select>
                    <Input placeholder="Listing URL (optional)" value={newPropertyListing.link} onChange={(e) => setNewPropertyListing({ ...newPropertyListing, link: e.target.value })} />
                </EditableList>
            </InspectorPanel>

            <InspectorPanel
                isOpen={activeModal === "Testimonials"}
                onClose={() => setActiveModal(null)}
                title="Recommendations"
            >
                <EditableList<TestimonialItem>
                    items={testimonials}
                    fields={TESTIMONIAL_FIELDS}
                    onChange={setTestimonials}
                    itemLabel="recommendation"
                    onAdd={addTestimonial}
                    addLabel="Add Recommendation"
                    emptyHint="No recommendations yet."
                >
                    <textarea
                        className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm"
                        placeholder="Quote"
                        value={newTestimonial.quote}
                        onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
                    />
                    <Input placeholder="Author Name" value={newTestimonial.author} onChange={(e) => setNewTestimonial({ ...newTestimonial, author: e.target.value })} />
                    <Input placeholder="Role/Title" value={newTestimonial.role} onChange={(e) => setNewTestimonial({ ...newTestimonial, role: e.target.value })} />
                </EditableList>
            </InspectorPanel>

            {/* Gallery Section Editor - Fixed with GalleryUploader */}
            <InspectorPanel
                isOpen={activeModal === "Gallery"}
                onClose={() => setActiveModal(null)}
                title="Gallery"
            >
                <div className="space-y-4">
                    <GalleryUploader
                        gallery={gallery}
                        onAdd={addGalleryImage}
                        onRemove={removeGalleryImage}
                        maxImages={3}
                        maxSizeMB={1}
                    />
                </div>
            </InspectorPanel>

                {/* Customize Colors - Expanded */}
                <div className="px-4 py-4">
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Colors</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Primary</label>
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
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Background</label>
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
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Text / Heading</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={customColors.text}
                                    onChange={(e) => setCustomColors({ ...customColors, text: e.target.value })}
                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                />
                                <Input
                                    value={customColors.text}
                                    onChange={(e) => setCustomColors({ ...customColors, text: e.target.value })}
                                    className="flex-1 text-xs"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Secondary</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={customColors.secondary}
                                    onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                />
                                <Input
                                    value={customColors.secondary}
                                    onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                                    className="flex-1 text-xs"
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1.5 block">Accent</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={customColors.accent}
                                    onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                                />
                                <Input
                                    value={customColors.accent}
                                    onChange={(e) => setCustomColors({ ...customColors, accent: e.target.value })}
                                    className="flex-1 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                    </>
                )}

                {/* Digital Business Card Design */}
                {previewMode === "card" && (
                    <div className="px-4 py-4 border-t border-border">
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Digital Card Design</Label>
                    <div className="space-y-4">
                        {/* Theme Select */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Card Theme Style</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {(["light", "dark", "glass", "carbon"] as const).map((t) => (
                                    <button
                                        type="button"
                                        key={t}
                                        onClick={() => handleCardThemeChange(t)}
                                        className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                                            digitalCard.theme === t
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card border-border text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Layout Select */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block">Card Layout</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {(["classic", "split", "centered"] as const).map((l) => (
                                    <button
                                        type="button"
                                        key={l}
                                        onClick={() => setDigitalCard({ ...digitalCard, layout: l })}
                                        className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                                            digitalCard.layout === l
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card border-border text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* QR Code Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">Show QR Code</span>
                            <Switch
                                checked={digitalCard.showQrCode}
                                onCheckedChange={(val) => setDigitalCard({ ...digitalCard, showQrCode: val })}
                            />
                        </div>

                        {/* Color Customization */}
                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">Background Type</span>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setDigitalCard({ ...digitalCard, cardBackgroundType: "solid" })}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold ${
                                            digitalCard.cardBackgroundType === "solid"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        Solid
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDigitalCard({ ...digitalCard, cardBackgroundType: "gradient" })}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold ${
                                            digitalCard.cardBackgroundType === "gradient"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        Gradient
                                    </button>
                                </div>
                            </div>

                            {digitalCard.cardBackgroundType === "solid" ? (
                                <div>
                                    <label className="text-[10px] text-muted-foreground mb-1 block">Solid Background Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={digitalCard.backgroundColor || "#ffffff"}
                                            onChange={(e) => setDigitalCard({ ...digitalCard, backgroundColor: e.target.value })}
                                            className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                        />
                                        <Input
                                            value={digitalCard.backgroundColor || ""}
                                            onChange={(e) => setDigitalCard({ ...digitalCard, backgroundColor: e.target.value })}
                                            className="flex-1 text-xs h-8"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-muted-foreground mb-1 block">Gradient Start</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={digitalCard.cardGradientStart || "#000000"}
                                                onChange={(e) => setDigitalCard({ ...digitalCard, cardGradientStart: e.target.value })}
                                                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                            />
                                            <Input
                                                value={digitalCard.cardGradientStart || ""}
                                                onChange={(e) => setDigitalCard({ ...digitalCard, cardGradientStart: e.target.value })}
                                                className="flex-1 text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground mb-1 block">Gradient End</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={digitalCard.cardGradientEnd || "#000000"}
                                                onChange={(e) => setDigitalCard({ ...digitalCard, cardGradientEnd: e.target.value })}
                                                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                            />
                                            <Input
                                                value={digitalCard.cardGradientEnd || ""}
                                                onChange={(e) => setDigitalCard({ ...digitalCard, cardGradientEnd: e.target.value })}
                                                className="flex-1 text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-muted-foreground mb-1 block">Text Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={digitalCard.textColor || "#000000"}
                                        onChange={(e) => setDigitalCard({ ...digitalCard, textColor: e.target.value })}
                                        className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                                    />
                                    <Input
                                        value={digitalCard.textColor || ""}
                                        onChange={(e) => setDigitalCard({ ...digitalCard, textColor: e.target.value })}
                                        className="flex-1 text-xs h-8"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

              </div>
            </div>
        </div>
    );
}

export default function BuilderPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <BuilderContent />
        </Suspense>
    );
}
