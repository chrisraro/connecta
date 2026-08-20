"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ProfileImage } from "@/components/templates/ProfileImage";
import {
    User, Phone, Briefcase, Image as ImageIcon,
    ChevronRight, ChevronLeft, CheckCircle2, Sparkles, X,
    Building2, Store, Edit, ArrowRight, Loader2, SmartphoneNfc, AlertCircle
} from "lucide-react";
import { SIGMATAP } from "@/lib/brand";

type ProfileCategory = "individual" | "company" | "business";

const PROFILE_CATEGORIES: { id: ProfileCategory; label: string; desc: string; icon: React.ElementType; emoji: string }[] = [
    { id: "individual", label: "Individual", desc: "Freelancer, Creator, Professional", icon: User, emoji: "🧑" },
    { id: "company",    label: "Company / Agency", desc: "Team, Studio, Agency", icon: Building2, emoji: "🏢" },
    { id: "business",   label: "Business", desc: "Store, Brand, Service Provider", icon: Store, emoji: "🏪" },
];

const CATEGORY_FIELDS: Record<ProfileCategory, { nameLabel: string; namePlaceholder: string; titleLabel: string; titlePlaceholder: string; companyLabel: string; companyPlaceholder: string; companyRequired: boolean }> = {
    individual: {
        nameLabel: "Full Name *",
        namePlaceholder: "e.g. Maria Santos",
        titleLabel: "Job Title / Role *",
        titlePlaceholder: "e.g. Brand Designer, Real Estate Broker",
        companyLabel: "Company / Organization",
        companyPlaceholder: "e.g. Freelance, Acme Corp.",
        companyRequired: false,
    },
    company: {
        nameLabel: "Company / Agency Name *",
        namePlaceholder: "e.g. Santos Creative Studio",
        titleLabel: "Industry *",
        titlePlaceholder: "e.g. Design Agency, Marketing Firm",
        companyLabel: "Team Size",
        companyPlaceholder: "e.g. 5-10, 50+",
        companyRequired: false,
    },
    business: {
        nameLabel: "Business Name *",
        namePlaceholder: "e.g. Santos Coffee Co.",
        titleLabel: "Business Type *",
        titlePlaceholder: "e.g. Coffee Shop, Boutique, Clinic",
        companyLabel: "Location *",
        companyPlaceholder: "e.g. Makati City, Philippines",
        companyRequired: true,
    },
};

const STEPS = [
    { id: "welcome",  title: `Welcome to ${SIGMATAP.name}`,    icon: Sparkles },
    { id: "type",     title: "Profile Type",            icon: Building2 },
    { id: "identity", title: "Your Identity",           icon: User },
    { id: "contact",  title: "Contact Details",         icon: Phone },
    { id: "work",     title: "Your Work & Services",    icon: Briefcase },
    { id: "photo",    title: "Profile Picture",         icon: ImageIcon },
    { id: "done",     title: "You're All Set!",         icon: CheckCircle2 },
];

const SUGGESTED_SERVICES = [
    "Logo Design", "Brand Identity", "Web Design", "Mobile App Design",
    "UI/UX Design", "Graphic Design", "Photography", "Videography",
    "Social Media Marketing", "Content Writing", "Real Estate",
    "Web Development", "SEO", "Illustration", "Animation",
    "Interior Design", "Architecture", "Consulting",
];

function OnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEditMode = searchParams.get("edit") === "true";
    const cardUuid = searchParams.get("card_uuid");
    
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const updateOnboarding = useMutation(api.users.updateOnboarding);
    // claimCardByUuid is a Convex action (not a mutation) — see
    // convex/cards.ts. useAction keeps the same calling convention.
    const claimCard = useAction(api.cards.claimCardByUuid);
    const linkProfile = useMutation(api.cards.linkProfile);
    const onboarding = useQuery(api.users.getOnboardingStatus, clerkUser?.id ? { clerkId: clerkUser.id } : "skip");

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [hasPrefilled, setHasPrefilled] = useState(false);
    const [cardClaimed, setCardClaimed] = useState(false);
    const [claimedCardId, setClaimedCardId] = useState<string | null>(null);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);

    // Form state
    const [profileCategory, setProfileCategory] = useState<ProfileCategory>("individual");
    const [fullName, setFullName] = useState("");
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [about, setAbout] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [services, setServices] = useState<string[]>([]);
    const [serviceInput, setServiceInput] = useState("");

    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";

    // Prefill from existing onboarding data
    useEffect(() => {
        const data = onboarding?.data;
        if (!hasPrefilled && data) {
            setProfileCategory(data.profileCategory ?? "individual");
            setFullName(data.fullName || clerkUser?.fullName || "");
            setTitle(data.title || "");
            setCompany(data.company || "");
            setPhone(data.phone || "");
            setWebsite(data.website || "");
            setAbout(data.about || "");
            setAvatarUrl(data.avatarUrl || clerkUser?.imageUrl || "");
            setServices(data.services || []);
            setHasPrefilled(true);
        } else if (!hasPrefilled && clerkUser && !data) {
            setFullName(clerkUser.fullName || "");
            setAvatarUrl(clerkUser.imageUrl || "");
            setHasPrefilled(true);
        }
    }, [onboarding, hasPrefilled, clerkUser]);

    // Claim card when user is authenticated and card_uuid is present
    useEffect(() => {
        // Only claim if:
        // 1. Clerk is fully loaded
        // 2. We have a card UUID
        // 3. We have a Clerk user ID
        // 4. Card hasn't been claimed yet
        // 5. We're not already in the process of claiming
        if (!isClerkLoaded || !cardUuid || !clerkUser?.id || cardClaimed || isClaiming) return;

        const claim = async () => {
            setIsClaiming(true);
            try {
                console.log("Attempting to claim card:", { 
                    clerkId: clerkUser.id, 
                    uuid: cardUuid 
                });
                
                const cardId = await claimCard({
                    clerkId: clerkUser.id,
                    uuid: cardUuid,
                });
                
                console.log("Card claimed successfully:", cardId);
                setClaimedCardId(cardId);
                setCardClaimed(true);
                setClaimError(null);
            } catch (err: unknown) {
                console.error("Card claim error:", err);
                // Don't show error immediately - might be a race condition
                // Only show error if it's not a "already claimed" scenario
                const msg = err instanceof Error ? err.message : "";
                if (msg.includes("not available")) {
                    setClaimError("This card has already been activated.");
                } else {
                    setClaimError(msg || "Failed to claim card");
                }
            } finally {
                setIsClaiming(false);
            }
        };

        claim();
    }, [cardUuid, clerkUser?.id, cardClaimed, isClaiming, claimCard, isClerkLoaded]);

    const progress = (step / (STEPS.length - 1)) * 100;

    const addService = (s: string) => {
        const trimmed = s.trim();
        if (trimmed && !services.includes(trimmed)) {
            setServices(prev => [...prev, trimmed]);
        }
        setServiceInput("");
    };

    const removeService = (s: string) => setServices(prev => prev.filter(x => x !== s));

    const saveProgress = async (completed: boolean) => {
        if (!clerkUser?.id) return;
        setSaving(true);
        try {
            await updateOnboarding({
                clerkId: clerkUser.id,
                profileCategory,
                email,
                fullName: fullName || (clerkUser?.fullName ?? ""),
                title: title || "Professional",
                company: company || undefined,
                phone: phone || "",
                website: website || undefined,
                about: about || undefined,
                avatarUrl: avatarUrl || undefined,
                services,
                markCompleted: completed,
            });
        } catch (err) {
            console.error("Failed to save onboarding:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleNext = async () => {
        if (step < STEPS.length - 1) {
            if (step > 0) {
                await saveProgress(false);
            }
            setStep(s => s + 1);
        }
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            const result = await updateOnboarding({
                clerkId: clerkUser!.id,
                profileCategory,
                email,
                fullName: fullName || (clerkUser?.fullName ?? ""),
                title: title || "Professional",
                company: company || undefined,
                phone: phone || "",
                website: website || undefined,
                about: about || undefined,
                avatarUrl: avatarUrl || undefined,
                services,
                markCompleted: true,
            });

            // If we have a claimed card and a newly created profile, link them
            if (claimedCardId && result.profileId) {
                try {
                    await linkProfile({
                        clerkId: clerkUser!.id,
                        cardId: claimedCardId as Id<"cards">,
                        profileId: result.profileId as Id<"profiles">,
                    });
                } catch (linkErr) {
                    console.error("Failed to link card to profile:", linkErr);
                    // Non-blocking - profile is still created
                }
            }

            router.push("/dashboard/builder");
        } catch (err) {
            console.error("Failed to finish onboarding:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        if (step > 0) await saveProgress(false);
        router.push("/dashboard");
    };

    const categoryFields = CATEGORY_FIELDS[profileCategory];

    // ─── COMPLETED STATE ─────────────────────────────────────────────
    if (onboarding?.completed && !isEditMode) {
        const d = onboarding.data;
        const cat = PROFILE_CATEGORIES.find(c => c.id === d?.profileCategory);
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <div className="bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden">
                        <div className="p-6 md:p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Profile Setup Complete</h1>
                                    <p className="text-sm text-muted-foreground">Your profile is ready to use.</p>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                                {d?.avatarUrl && (
                                    <div className="flex justify-center">
                                        <ProfileImage
                                            src={d.avatarUrl}
                                            alt="avatar"
                                            className="w-20 h-20 rounded-full overflow-hidden border-2 border-border"
                                        />
                                    </div>
                                )}
                                <div className="text-center space-y-1">
                                    <h2 className="text-lg font-semibold">{d?.fullName}</h2>
                                    <p className="text-sm text-muted-foreground">{d?.title}</p>
                                    {cat && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                                            {cat.emoji} {cat.label}
                                        </span>
                                    )}
                                </div>
                                {d?.email && (
                                    <div className="text-sm text-muted-foreground text-center">{d.email}</div>
                                )}
                                {d?.services && d.services.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 justify-center pt-2 border-t border-border/50">
                                        {d.services.map(s => (
                                            <span key={s} className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Button className="w-full" size="lg" onClick={() => router.push("/dashboard/builder")}>
                                    <ArrowRight className="w-4 h-4 mr-2" /> Go to Profile Builder
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => {
                                    router.push("/dashboard/onboarding?edit=true");
                                    setStep(1);
                                }}>
                                    <Edit className="w-4 h-4 mr-2" /> Edit Profile Setup
                                </Button>
                                <Button variant="ghost" className="w-full" onClick={() => router.push("/dashboard")}>
                                    Back to Dashboard
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── WIZARD MODE ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Card Detection Alert */}
                {cardUuid && (
                    <div className="mb-4 bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            {cardClaimed ? (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : claimError ? (
                                <AlertCircle className="w-5 h-5 text-destructive" />
                            ) : isClaiming ? (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            )}
                        </div>
                        <div>
                            {cardClaimed ? (
                                <>
                                    <p className="text-sm font-semibold text-primary">{SIGMATAP.name} Card Detected!</p>
                                    <p className="text-xs text-muted-foreground">Your card has been activated and will be linked to your profile.</p>
                                </>
                            ) : claimError ? (
                                <>
                                    <p className="text-sm font-semibold text-destructive">Card Activation Issue</p>
                                    <p className="text-xs text-muted-foreground">{claimError}</p>
                                </>
                            ) : isClaiming ? (
                                <>
                                    <p className="text-sm font-semibold text-primary">Activating Your Card...</p>
                                    <p className="text-xs text-muted-foreground">Please wait while we set up your {SIGMATAP.name} card.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-primary">Card Detected!</p>
                                    <p className="text-xs text-muted-foreground">Preparing to activate your {SIGMATAP.name} card...</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
                <div className="mb-8">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Step {step + 1} of {STEPS.length}</span>
                        <button onClick={handleSkip} className="hover:text-foreground transition-colors flex items-center gap-1">
                            Skip for now <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: "hsl(var(--primary))" }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <div key={s.id} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden">
                    <div className="p-6 md:p-8 min-h-[360px] flex flex-col">
                        <h1 className="text-2xl font-bold mb-1">{STEPS[step].title}</h1>

                        {step === 0 && (
                            <div className="flex-1 flex flex-col justify-center space-y-4">
                                <p className="text-muted-foreground leading-relaxed">
                                    {SIGMATAP.name} turns your professional profile into a shareable digital card — accessible via <strong>NFC tap</strong> or <strong>QR code</strong>.
                                </p>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {[
                                        { emoji: "🎨", label: "Showcase your work" },
                                        { emoji: "📇", label: "Share via NFC & QR" },
                                        { emoji: "📥", label: "Capture leads" },
                                        { emoji: "✨", label: "Built for any profession" },
                                    ].map(({ emoji, label }) => (
                                        <div key={label} className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl text-sm font-medium">
                                            <span className="text-xl">{emoji}</span> {label}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground mt-4">
                                    Let&apos;s take 2 minutes to set up your profile. You can always edit it later.
                                </p>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="flex-1 space-y-4 pt-4">
                                <p className="text-sm text-muted-foreground">What best describes your profile?</p>
                                <div className="grid gap-3">
                                    {PROFILE_CATEGORIES.map(cat => {
                                        const isSelected = profileCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setProfileCategory(cat.id)}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                                                }`}
                                            >
                                                <span className="text-3xl">{cat.emoji}</span>
                                                <div>
                                                    <div className="font-semibold">{cat.label}</div>
                                                    <div className="text-xs text-muted-foreground">{cat.desc}</div>
                                                </div>
                                                {isSelected && (
                                                    <CheckCircle2 className="w-5 h-5 text-primary ml-auto shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex-1 space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>{categoryFields.nameLabel}</Label>
                                    <Input
                                        placeholder={categoryFields.namePlaceholder}
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{categoryFields.titleLabel}</Label>
                                    <Input
                                        placeholder={categoryFields.titlePlaceholder}
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        {categoryFields.companyLabel}
                                        {!categoryFields.companyRequired && <span className="text-muted-foreground text-xs ml-1">(optional)</span>}
                                    </Label>
                                    <Input
                                        placeholder={categoryFields.companyPlaceholder}
                                        value={company}
                                        onChange={e => setCompany(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex-1 space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={email} disabled className="opacity-60" />
                                    <p className="text-xs text-muted-foreground">From your account. Change via account settings.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone *</Label>
                                    <Input
                                        placeholder="+63 917 123 4567"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Website <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input
                                        placeholder="https://yoursite.com"
                                        value={website}
                                        onChange={e => setWebsite(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="flex-1 space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>About / Bio</Label>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        placeholder="Tell clients what you do and what makes you unique..."
                                        value={about}
                                        onChange={e => setAbout(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Services Offered</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Type a service, press Enter"
                                            value={serviceInput}
                                            onChange={e => setServiceInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addService(serviceInput); } }}
                                        />
                                        <Button type="button" variant="outline" onClick={() => addService(serviceInput)}>Add</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {SUGGESTED_SERVICES.filter(s => !services.includes(s)).slice(0, 8).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => addService(s)}
                                                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                            >
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                    {services.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                                            {services.map(s => (
                                                <span key={s} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                                                    {s}
                                                    <button onClick={() => removeService(s)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="flex-1 flex flex-col items-center justify-center pt-4 gap-4">
                                <p className="text-sm text-muted-foreground text-center">
                                    Upload a professional photo. This will appear on your public profile page.
                                </p>
                                <div className="w-40 h-40">
                                    <ImageUploader
                                        value={avatarUrl}
                                        onChange={setAvatarUrl}
                                        onRemove={() => setAvatarUrl("")}
                                        placeholder="Upload Photo"
                                        className="w-full h-full rounded-full"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">You can skip this — add later in the builder.</p>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center pt-4">
                                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Profile Ready!</h2>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Your profile is set up. Now customize your public page in the Profile Builder.
                                    </p>
                                </div>
                                {cardClaimed && (
                                    <div className="w-full bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <SmartphoneNfc className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-primary">Card Activated!</p>
                                            <p className="text-xs text-muted-foreground">Your physical {SIGMATAP.name} card is now live and linked to your profile.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="w-full space-y-2 mt-2">
                                    <Button className="w-full" size="lg" onClick={handleFinish} disabled={saving}>
                                        {saving ? "Saving..." : "Go to Profile Builder \u2192"}
                                    </Button>
                                    <Button variant="ghost" className="w-full" onClick={() => router.push("/dashboard")}>
                                        Back to Dashboard
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {step < STEPS.length - 1 && (
                        <div className="px-6 md:px-8 pb-6 md:pb-8 flex justify-between items-center border-t border-border/50 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(s => Math.max(0, s - 1))}
                                disabled={step === 0}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                            <Button onClick={handleNext} disabled={saving}>
                                {saving ? "Saving..." : step === STEPS.length - 2 ? "Finish →" : "Next →"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
            <OnboardingContent />
        </Suspense>
    );
}
