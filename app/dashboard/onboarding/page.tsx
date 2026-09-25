"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMyProfiles, useSaveOnboarding } from "@/hooks/useProfiles";
import { useClaimCard, useLinkCardProfile } from "@/hooks/useCards";
import { onboardingDataOf, agentInfoOf } from "@/lib/db/profile";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ProfileImage } from "@/components/templates/ProfileImage";
import {
  User,
  Phone,
  Briefcase,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  X,
  Building2,
  Store,
  Edit,
  ArrowRight,
  Loader2,
  SmartphoneNfc,
  AlertCircle,
  BriefcaseBusiness,
  Inbox,
  Palette,
} from "lucide-react";
import { CONNECTA } from "@/lib/brand";
import { resolveOnboardingPrefill } from "@/lib/onboardingPrefill";
import {
  autoLinkTarget,
  shouldAttemptClaim,
  shouldAutoLinkReturningClaim,
  type LinkState,
} from "@/lib/cardClaim";

// Retrying cannot help once someone else holds the card.
const CARD_ALREADY_ACTIVATED = "This card has already been activated.";

type ProfileCategory = "individual" | "company" | "business";

const PROFILE_CATEGORIES: {
  id: ProfileCategory;
  label: string;
  desc: string;
  icon: React.ElementType;
  emoji: string;
}[] = [
  {
    id: "individual",
    label: "Individual",
    desc: "Freelancer, Creator, Professional",
    icon: User,
    emoji: "🧑",
  },
  {
    id: "company",
    label: "Company / Agency",
    desc: "Team, Studio, Agency",
    icon: Building2,
    emoji: "🏢",
  },
  {
    id: "business",
    label: "Business",
    desc: "Store, Brand, Service Provider",
    icon: Store,
    emoji: "🏪",
  },
];

const CATEGORY_FIELDS: Record<
  ProfileCategory,
  {
    nameLabel: string;
    namePlaceholder: string;
    titleLabel: string;
    titlePlaceholder: string;
    companyLabel: string;
    companyPlaceholder: string;
    companyRequired: boolean;
  }
> = {
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

// Task 21 (production audit): this array used to end with a 7th "done"
// step rendered INSIDE the wizard, reached via the same handleNext/
// markCompleted:false path as every other "Next" click — so the button
// labelled "Finish →" never actually finished anything; only the "done"
// step's own "Go to Profile Builder →" button called the mutation with
// markCompleted: true. A user who clicked Finish, saw that screen, and
// closed the tab had no profile. There is no longer a wizard-internal
// "done" step: "photo" is now the last step, its Finish button IS what
// completes onboarding (see handleFinish below), and the pre-existing
// "COMPLETED STATE" screen further down (gated on `onboarding?.completed`,
// a live Convex query) takes over as the post-completion confirmation the
// instant that mutation lands — no further click required to persist
// anything.
const STEPS = [
  { id: "welcome", title: `Welcome to ${CONNECTA.name}`, icon: Sparkles },
  { id: "type", title: "Profile Type", icon: Building2 },
  { id: "identity", title: "Your Identity", icon: User },
  { id: "contact", title: "Contact Details", icon: Phone },
  { id: "work", title: "Your Work & Services", icon: Briefcase },
  { id: "photo", title: "Profile Picture", icon: ImageIcon },
];

const SUGGESTED_SERVICES = [
  "Logo Design",
  "Brand Identity",
  "Web Design",
  "Mobile App Design",
  "UI/UX Design",
  "Graphic Design",
  "Photography",
  "Videography",
  "Social Media Marketing",
  "Content Writing",
  "Real Estate",
  "Web Development",
  "SEO",
  "Illustration",
  "Animation",
  "Interior Design",
  "Architecture",
  "Consulting",
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const cardUuid = searchParams.get("card_uuid");

  const { user: authUser, isLoaded: isAuthLoaded } = useAuth();
  const { data: appUser } = useCurrentUser();
  const updateOnboarding = useSaveOnboarding().mutateAsync;
  const claimCard = useClaimCard().mutateAsync;
  const linkProfile = useLinkCardProfile().mutateAsync;
  const onboarding = appUser
    ? { completed: appUser.onboarding_completed, data: appUser.onboarding_data }
    : undefined;
  // Drives the "Profile Setup Complete" screen's "Go to Profile Builder"
  // button below — same Task 12 fix as handleFinish's routing: link to
  // the profile that already exists instead of a doomed no-id create.
  const { data: profiles, isError: profilesFailed } = useMyProfiles();
  const myProfileId = profiles && profiles.length > 0 ? profiles[0].id : null;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [cardClaimed, setCardClaimed] = useState(false);
  const [claimedCardId, setClaimedCardId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  // Whether the claimed card is attached to a profile yet. The completed
  // screen used to say "linked" for a returning user whose card never was.
  const [linkState, setLinkState] = useState<LinkState>("idle");
  const linkStarted = useRef(false);
  // Set by handleFinish the instant onboarding completes, from the
  // mutation's own return value — not the reactive `profiles` query,
  // which also updates but there's no reason to wait a second round trip
  // for an id the mutation already handed back. Feeds the post-completion
  // confirmation's "Go to Profile Builder" button below.
  const [completedProfileId, setCompletedProfileId] = useState<string | null>(null);

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

  const email = authUser?.email ?? "";

  // Prefill the form. First-run onboarding prefills from
  // onboarding.data/Clerk as before; "Edit Profile Setup" (?edit=true)
  // hydrates from the LIVE profile instead — see lib/onboardingPrefill.ts
  // for why (Task 17 C3 follow-up: onboardingData goes stale the instant
  // the Profile Builder edits the profile, and prefilling edit mode from
  // it silently wiped live-only fields on save).
  useEffect(() => {
    if (hasPrefilled) return;
    // Wait for the users row. The auth session arrives first, but the name
    // and onboarding snapshot live on public.users, which is a separate
    // fetch -- prefilling before it lands locked in a blank Full Name (and
    // skipped any saved snapshot), because hasPrefilled never lets it retry.
    // Clerk used to hand the name over with the session itself.
    if (!appUser) return;
    const prefill = resolveOnboardingPrefill({
      isEditMode,
      onboardingData: onboardingDataOf(onboarding?.data),
      profiles: profiles?.map((p) => ({
        profile_type: p.profile_type ?? undefined,
        agent_info: agentInfoOf(p),
      })),
      authUser: authUser
        ? {
            // Supabase Auth has no display name of its own: the name lives
            // on public.users, and an avatar only exists if an OAuth
            // provider supplied one.
            fullName: appUser?.name ?? null,
            imageUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
          }
        : null,
    });
    if (!prefill) return; // still loading — don't lock in a blank prefill
    setProfileCategory(prefill.profileCategory);
    setFullName(prefill.fullName);
    setTitle(prefill.title);
    setCompany(prefill.company);
    setPhone(prefill.phone);
    setWebsite(prefill.website);
    setAbout(prefill.about);
    setAvatarUrl(prefill.avatarUrl);
    setServices(prefill.services);
    setHasPrefilled(true);
  }, [onboarding, hasPrefilled, authUser, appUser, isEditMode, profiles]);

  // Claim card when user is authenticated and card_uuid is present
  useEffect(() => {
    if (
      !shouldAttemptClaim({
        isAuthLoaded,
        cardUuid,
        userId: authUser?.id,
        cardClaimed,
        isClaiming,
        claimError,
      })
    )
      return;

    const claim = async () => {
      setIsClaiming(true);
      try {
        const cardId = await claimCard(cardUuid!);
        setClaimedCardId(cardId);
        setCardClaimed(true);
        setClaimError(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("not available")) {
          setClaimError(CARD_ALREADY_ACTIVATED);
        } else {
          setClaimError(msg || "Failed to claim card");
        }
      } finally {
        setIsClaiming(false);
      }
    };

    claim();
  }, [cardUuid, authUser?.id, cardClaimed, isClaiming, claimError, claimCard, isAuthLoaded]);

  // B2: someone who already finished setup never reaches Finish, so a card
  // they claim here is linked straight away, to their newest profile
  // (decided 2026-09-25). They can change it on the Cards page.
  const onboardingCompleted = Boolean(appUser?.onboarding_completed);
  useEffect(() => {
    if (
      !shouldAutoLinkReturningClaim({
        claimedCardId,
        onboardingCompleted,
        isEditMode,
        // A failed lookup counts as settled: it ends as "failed" with a link
        // to the Cards page instead of "Linking..." forever.
        profilesLoaded: profiles !== undefined || profilesFailed,
        linkState,
      }) ||
      linkStarted.current
    )
      return;
    linkStarted.current = true;
    const target = autoLinkTarget(profiles);
    if (!claimedCardId || !target) {
      setLinkState("failed");
      return;
    }
    setLinkState("linking");
    linkProfile({ cardId: claimedCardId, profileId: target })
      .then(() => setLinkState("linked"))
      .catch(() => {
        setLinkState("failed");
        toast.warning("Your card is activated, but it didn't link to your profile. Link it from the Cards page.");
      });
  }, [claimedCardId, onboardingCompleted, isEditMode, profiles, profilesFailed, linkState, linkProfile]);

  const progress = (step / (STEPS.length - 1)) * 100;

  const addService = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices((prev) => [...prev, trimmed]);
    }
    setServiceInput("");
  };

  const removeService = (s: string) => setServices((prev) => prev.filter((x) => x !== s));

  const saveProgress = async (completed: boolean) => {
    if (!authUser?.id) return;
    setSaving(true);
    try {
      await updateOnboarding({
        profileCategory,
        email,
        fullName: fullName || (appUser?.name ?? ""),
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
      toast.error(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      if (step > 0) {
        await saveProgress(false);
      }
      setStep((s) => s + 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const result = await updateOnboarding({
        profileCategory,
        email,
        fullName: fullName || (appUser?.name ?? ""),
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
            cardId: claimedCardId,
            profileId: result.profileId,
          });
          setLinkState("linked");
        } catch {
          setLinkState("failed");
          // Non-blocking - profile is still created, but the user
          // needs to know their card didn't attach.
          toast.warning(
            "Your profile was created, but the card didn't link to it. Link it from the Cards page.",
          );
        }
      }

      // Task 17 / C3: this same handler runs both for the very first
      // "Finish" (a real create) and for "Edit Profile Setup"
      // (?edit=true, re-running the wizard against an EXISTING
      // profile) — the toast must say which one actually happened,
      // not claim "created" when the mutation just patched.
      toast.success(isEditMode ? "Profile updated!" : "Profile created!");

      if (isEditMode) {
        // Editing an existing profile's setup answers has nothing to
        // "confirm" — a live profile already existed before this
        // click. Task 12 fix: route straight to editing it (not the
        // bare no-id builder, which the free plan's own profile
        // count would reject with "Upgrade to Pro for unlimited
        // profiles."). updateOnboarding always returns a profileId
        // when markCompleted is true (see convex/users.ts), so this
        // only omits `?id=` in the impossible case that invariant is
        // somehow violated.
        router.push(
          result.profileId ? `/dashboard/builder?id=${result.profileId}` : "/dashboard/builder",
        );
      } else {
        // Task 21: first-run completion. onboarding is DONE the
        // instant the mutation above resolves — there is nothing
        // left to persist, so closing the tab right here is safe.
        // Don't navigate away immediately; let the "COMPLETED
        // STATE" screen below (gated on the live `onboarding` query,
        // which this mutation just flipped to completed) render in
        // place as the post-completion confirmation. Track the
        // profile id locally so its "Go to Profile Builder" button
        // has it without waiting on the separate `profiles` query.
        setCompletedProfileId(result.profileId ?? null);
      }
    } catch (err) {
      console.error("Failed to finish onboarding:", err);
      toast.error(toUserMessage(err));
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
    const d = onboardingDataOf(onboarding.data);
    const cat = PROFILE_CATEGORIES.find((c) => c.id === d?.profileCategory);
    return (
      <div className="sheet-grid min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="border-[1.5px] border-input bg-background">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold [font-stretch:112%]">Profile Setup Complete</h1>
                  <p className="text-sm text-muted-foreground">Your profile is ready to use.</p>
                </div>
              </div>

              <div className="border-[1.5px] border-input p-4 space-y-3">
                {d?.avatarUrl && (
                  <div className="flex justify-center">
                    <ProfileImage
                      src={d.avatarUrl}
                      alt="avatar"
                      className="w-20 h-20 overflow-hidden border-[1.5px] border-input"
                    />
                  </div>
                )}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-semibold">{d?.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{d?.title}</p>
                  {cat && (
                    <span className="inline-flex items-center gap-1 border-[1.5px] border-input px-2 py-0.5 text-[13px] font-bold">
                      {cat.emoji} {cat.label}
                    </span>
                  )}
                </div>
                {d?.email && (
                  <div className="text-sm text-muted-foreground text-center">{d.email}</div>
                )}
                {d?.services && d.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center pt-3 border-t border-border">
                    {d.services.map((s) => (
                      <span
                        key={s}
                        className="border border-border px-2 py-0.5 text-[13px] font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {cardClaimed && (
                <div className="w-full border-[1.5px] border-input p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <SmartphoneNfc className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Card Activated!</p>
                    <p className="text-xs text-muted-foreground">
                      {linkState === "linked" ? (
                        <>Your physical {CONNECTA.name} card is now live and linked to your profile.</>
                      ) : linkState === "linking" || linkState === "idle" ? (
                        <>Linking your {CONNECTA.name} card to your profile...</>
                      ) : (
                        <>
                          Your card is activated but not linked yet.{" "}
                          <Link href="/dashboard/cards" className="underline underline-offset-2">
                            Link it on the Cards page
                          </Link>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {/* completedProfileId: set by handleFinish, from the
                                    mutation's own return value, the instant THIS
                                    session's onboarding completed — takes priority
                                    over myProfileId (derived from the separate,
                                    independently-reactive `profiles` query) so this
                                    button never has to wait on a second round trip
                                    for an id the mutation already handed back. A
                                    returning visit (this screen rendering on page
                                    load rather than right after Finish) has no
                                    completedProfileId, so it falls back to
                                    myProfileId exactly as before. */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    const id = completedProfileId ?? myProfileId;
                    router.push(id ? `/dashboard/builder?id=${id}` : "/dashboard/builder");
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" /> Go to Profile Builder
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    router.push("/dashboard/onboarding?edit=true");
                    setStep(1);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile Setup
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/dashboard")}
                >
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
    <div className="sheet-grid min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card Detection Alert */}
        {cardUuid && (
          <div className="mb-4 border-[1.5px] border-input bg-background p-4 flex items-center gap-3">
            <div className="w-10 h-10 border-[1.5px] border-input flex items-center justify-center shrink-0">
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
                  <p className="text-sm font-semibold text-primary">
                    {CONNECTA.name} Card Detected!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your card has been activated and will be linked to your profile.
                  </p>
                </>
              ) : claimError ? (
                <>
                  <p className="text-sm font-semibold text-destructive">Card Activation Issue</p>
                  <p className="text-xs text-muted-foreground">{claimError}</p>
                  {claimError !== CARD_ALREADY_ACTIVATED && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setClaimError(null)}
                    >
                      Try again
                    </Button>
                  )}
                </>
              ) : isClaiming ? (
                <>
                  <p className="text-sm font-semibold text-primary">Activating Your Card...</p>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we set up your {CONNECTA.name} card.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">Card Detected!</p>
                  <p className="text-xs text-muted-foreground">
                    Preparing to activate your {CONNECTA.name} card...
                  </p>
                </>
              )}
            </div>
          </div>
        )}
        <div className="mb-8">
          <div className="flex justify-between text-[13px] font-medium text-muted-foreground mb-2">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              Skip for now <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {/* Progress is a survey rule drawn along the line. */}
          <div className="h-1.5 border border-input bg-background">
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`w-7 h-7 flex items-center justify-center border-[1.5px] border-input transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-[1.5px] border-input bg-background">
          <div className="p-6 md:p-8 min-h-[360px] flex flex-col">
            <h1 className="text-2xl font-bold mb-1 [font-stretch:112%]">{STEPS[step].title}</h1>

            {step === 0 && (
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {CONNECTA.name} turns your professional profile into a shareable digital card —
                  accessible via <strong>NFC tap</strong> or <strong>QR code</strong>.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { icon: Palette, label: "Showcase your work" },
                    { icon: SmartphoneNfc, label: "Share via NFC & QR" },
                    { icon: Inbox, label: "Capture leads" },
                    { icon: BriefcaseBusiness, label: "Built for any profession" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 border-[1.5px] border-input p-3 text-sm font-medium"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" /> {label}
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
                  {PROFILE_CATEGORIES.map((cat) => {
                    const isSelected = profileCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setProfileCategory(cat.id)}
                        aria-pressed={isSelected}
                        className={`flex items-center gap-4 p-4 border-[1.5px] transition-colors text-left ${
                          isSelected
                            ? "border-input bg-accent"
                            : "border-border hover:border-input hover:bg-accent/50"
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
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{categoryFields.titleLabel}</Label>
                  <Input
                    placeholder={categoryFields.titlePlaceholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {categoryFields.companyLabel}
                    {!categoryFields.companyRequired && (
                      <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                    )}
                  </Label>
                  <Input
                    placeholder={categoryFields.companyPlaceholder}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex-1 space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground">
                    From your account. Change via account settings.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    placeholder="+63 917 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Website <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    placeholder="https://yoursite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex-1 space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>About / Bio</Label>
                  <textarea
                    className="flex min-h-[80px] w-full border-[1.5px] border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Tell clients what you do and what makes you unique..."
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Services Offered</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a service, press Enter"
                      value={serviceInput}
                      onChange={(e) => setServiceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addService(serviceInput);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addService(serviceInput)}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTED_SERVICES.filter((s) => !services.includes(s))
                      .slice(0, 8)
                      .map((s) => (
                        <button
                          key={s}
                          onClick={() => addService(s)}
                          className="text-[13px] px-2 py-1 border border-dashed border-input text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                  </div>
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-3 border-t border-border">
                      {services.map((s) => (
                        <span
                          key={s}
                          className="flex items-center gap-1 border-[1.5px] border-input px-2 py-0.5 text-[13px] font-medium"
                        >
                          {s}
                          <button
                            onClick={() => removeService(s)}
                            aria-label={`Remove ${s}`}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" aria-hidden="true" />
                          </button>
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
                <p className="text-xs text-muted-foreground">
                  You can skip this — add later in the builder.
                </p>
              </div>
            )}
          </div>

          {/* Task 21: this row is no longer hidden on the last
                        step — "photo" IS the last step now, and its button
                        (labelled "Finish →") is the one real control that
                        completes onboarding. There is no separate
                        wizard-internal "done" step to hand off to: once
                        handleFinish's mutation resolves, the "COMPLETED
                        STATE" screen above takes over on its own (it's
                        gated on the live `onboarding` query, which that
                        mutation just flipped). */}
          <div className="px-6 md:px-8 pb-6 md:pb-8 flex justify-between items-center border-t-[1.5px] border-input pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={step === STEPS.length - 1 ? handleFinish : handleNext}
              disabled={saving}
            >
              {saving ? "Saving..." : step === STEPS.length - 1 ? "Finish →" : "Next →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
