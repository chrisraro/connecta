"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser, useMyPlan } from "@/hooks/useCurrentUser";
import { useMyProfiles, useSaveOnboarding, useUpdateProfile } from "@/hooks/useProfiles";
import { useClaimCard, useLinkCardProfile } from "@/hooks/useCards";
import { useSupabase } from "@/lib/db/client";
import { onboardingDataOf, agentInfoOf } from "@/lib/db/profile";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { CONNECTA } from "@/lib/brand";
import { resolveOnboardingPrefill } from "@/lib/onboardingPrefill";
import {
  autoLinkTarget,
  shouldAttemptClaim,
  shouldAutoLinkReturningClaim,
  type LinkState,
} from "@/lib/cardClaim";
import {
  isStepValid,
  nextStepIndex,
  previousStepIndex,
  shouldShowPasswordStep,
  stepProgressLabel,
  stepProgressPercent,
  visibleSteps,
  type OnboardingStepId,
  type ProfileCategory,
} from "@/lib/onboardingFlow";
import { passwordProblem } from "@/lib/authRecovery";
import { DEFAULT_CARD_SKIN, type CardSkinId } from "@/lib/cardSkins";

import { WelcomeStep } from "./steps/WelcomeStep";
import { TypeStep } from "./steps/TypeStep";
import { IdentityStep } from "./steps/IdentityStep";
import { ContactStep } from "./steps/ContactStep";
import { WorkStep } from "./steps/WorkStep";
import { StyleStep } from "./steps/StyleStep";
import { CardSkinStep } from "./steps/CardSkinStep";
import { PhotoStep } from "./steps/PhotoStep";
import { PasswordStep } from "./steps/PasswordStep";
import { PlansStep } from "./steps/PlansStep";
import { CompletedScreen } from "./steps/CompletedScreen";
import { InviteBanner } from "@/components/team/InviteBanner";

// Retrying cannot help once someone else holds the card.
const CARD_ALREADY_ACTIVATED = "This card has already been activated.";

const STEP_TITLES: Record<OnboardingStepId, string> = {
  welcome: `Welcome to ${CONNECTA.name}`,
  type: "Account type",
  identity: "You",
  contact: "Contact",
  work: "Your work",
  style: "Profile style",
  cardSkin: "Card skin",
  photo: "Photo",
  password: "Password",
  plans: "Plan",
};

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const cardUuid = searchParams.get("card_uuid");

  const { user: authUser, isLoaded: isAuthLoaded } = useAuth();
  const { data: appUser } = useCurrentUser();
  const myPlan = useMyPlan();
  const supabase = useSupabase();
  const updateOnboarding = useSaveOnboarding().mutateAsync;
  const updateProfile = useUpdateProfile().mutateAsync;
  const claimCard = useClaimCard().mutateAsync;
  const linkProfile = useLinkCardProfile().mutateAsync;
  const onboarding = appUser
    ? { completed: appUser.onboarding_completed, data: appUser.onboarding_data }
    : undefined;
  const { data: profiles, isError: profilesFailed } = useMyProfiles();
  const myProfileId = profiles && profiles.length > 0 ? profiles[0].id : null;

  const showPasswordStep = shouldShowPasswordStep({
    invitedAt: authUser?.invited_at,
    isEditMode,
  });
  const steps = visibleSteps({ isEditMode, showPasswordStep });

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [cardClaimed, setCardClaimed] = useState(false);
  const [claimedCardId, setClaimedCardId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>("idle");
  const linkStarted = useRef(false);
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
  const [templateId, setTemplateId] = useState("editorial");
  const [cardSkinId, setCardSkinId] = useState<CardSkinId>(DEFAULT_CARD_SKIN);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const email = authUser?.email ?? "";
  const currentStepId = steps[stepIndex]?.id ?? "welcome";
  const currentStepDef = steps[stepIndex];

  // Prefill the form. First-run onboarding prefills from
  // onboarding.data/Supabase Auth metadata; "Edit Profile Setup" (?edit=true)
  // hydrates from the LIVE profile instead — see lib/onboardingPrefill.ts.
  useEffect(() => {
    if (hasPrefilled) return;
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
            fullName: appUser?.name ?? null,
            imageUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
          }
        : null,
    });
    if (!prefill) return;
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

  // Someone who already finished setup never reaches Finish, so a card they
  // claim here is linked straight away, to their newest profile. They can
  // change it on the Cards page.
  const onboardingCompleted = Boolean(appUser?.onboarding_completed);
  useEffect(() => {
    if (
      !shouldAutoLinkReturningClaim({
        claimedCardId,
        onboardingCompleted,
        isEditMode,
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

  const progress = stepProgressPercent(stepIndex, steps);

  const addService = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices((prev) => [...prev, trimmed]);
    }
    setServiceInput("");
  };

  const removeService = (s: string) => setServices((prev) => prev.filter((x) => x !== s));

  // Steps whose Next click is worth a draft save: only the ones the
  // save_onboarding RPC actually has fields for. Style/card skin/password/
  // plan are UI-only choices at this point in the flow (applied on Finish,
  // see handleFinish), so saving mid-wizard here would be a no-op RPC call.
  const stepHasDraftFields = (id: OnboardingStepId) =>
    id === "type" || id === "identity" || id === "contact" || id === "work" || id === "photo";

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

  const isLast = stepIndex >= steps.length - 1;

  const canGoNext =
    !currentStepDef?.required ||
    isStepValid(currentStepId, {
      identity: { category: profileCategory, fullName, title, company },
      contact: { phone },
      password: showPasswordStep ? { password, confirm: confirmPassword, passwordProblem } : undefined,
    });

  const handleNext = async () => {
    if (!canGoNext) return;
    if (stepHasDraftFields(currentStepId)) {
      await saveProgress(false);
    }
    setStepIndex((s) => nextStepIndex(s, steps));
  };

  const handleSkipStep = () => {
    setStepIndex((s) => nextStepIndex(s, steps));
  };

  /**
   * Applies the profile-style/card-skin choices made in the wizard. Neither
   * is a save_onboarding parameter (see supabase/migrations/
   * 20260911000021_onboarding.sql) — that RPC deliberately leaves
   * layout_config/skin alone on every call so it never clobbers builder
   * work. Reading the just-created profile's own layout_config back (rather
   * than reconstructing the ptype-based default client-side) means this
   * only ever changes `themeId`, never the section order or palette the RPC
   * picked.
   */
  const applyStyleChoices = async (profileId: string) => {
    if (templateId === "editorial" && cardSkinId === DEFAULT_CARD_SKIN) return;
    try {
      const { data: current, error } = await supabase
        .from("profiles")
        .select("layout_config, skin")
        .eq("id", profileId)
        .single();
      if (error) throw error;
      const layoutConfig = (current?.layout_config as Record<string, unknown>) ?? {};
      await updateProfile({
        id: profileId,
        patch: {
          skin: cardSkinId,
          layout_config: { ...layoutConfig, themeId: templateId },
        },
      });
    } catch (err) {
      console.error("Failed to apply style/card skin choices:", err);
      toast.warning("Your profile was created, but the style/skin choice didn't save. Set it in the builder.");
    }
  };

  const applyPassword = async () => {
    if (password === "" && confirmPassword === "") return;
    if (passwordProblem(password, confirmPassword) !== null) return;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to set password:", err);
      toast.warning("Your profile was created, but the password didn't save. Set it from account settings.");
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

      if (claimedCardId && result.profileId) {
        try {
          await linkProfile({ cardId: claimedCardId, profileId: result.profileId });
          setLinkState("linked");
        } catch {
          setLinkState("failed");
          toast.warning("Your profile was created, but the card didn't link to it. Link it from the Cards page.");
        }
      }

      if (result.profileId && !isEditMode) {
        await applyStyleChoices(result.profileId);
      }
      if (showPasswordStep) {
        await applyPassword();
      }

      toast.success(isEditMode ? "Profile updated!" : "Profile created!");

      if (isEditMode) {
        router.push(result.profileId ? `/dashboard/builder?id=${result.profileId}` : "/dashboard/builder");
      } else {
        setCompletedProfileId(result.profileId ?? null);
      }
    } catch (err) {
      console.error("Failed to finish onboarding:", err);
      toast.error(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ─── COMPLETED STATE ─────────────────────────────────────────────
  if (onboarding?.completed && !isEditMode) {
    return (
      <CompletedScreen
        data={onboardingDataOf(onboarding.data)}
        cardClaimed={cardClaimed}
        linkState={linkState}
        onGoToBuilder={() => {
          const id = completedProfileId ?? myProfileId;
          router.push(id ? `/dashboard/builder?id=${id}` : "/dashboard/builder");
        }}
        onEditSetup={() => {
          router.push("/dashboard/onboarding?edit=true");
          setStepIndex(1);
        }}
        onBackToDashboard={() => router.push("/dashboard")}
      />
    );
  }

  // ─── WIZARD MODE ─────────────────────────────────────────────────
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* A pending team invite (Accept / Decline); renders nothing otherwise. */}
        <div className="mb-4 empty:hidden">
          <InviteBanner />
        </div>

        {cardUuid && (
          <div className="mb-4 flex items-center gap-3 border-[1.5px] border-input bg-background p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[1.5px] border-input">
              {cardClaimed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : claimError ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
            <div>
              {cardClaimed ? (
                <>
                  <p className="text-sm font-semibold text-primary">{CONNECTA.name} card detected</p>
                  <p className="text-xs text-muted-foreground">
                    Your card has been activated and will be linked to your profile.
                  </p>
                </>
              ) : claimError ? (
                <>
                  <p className="text-sm font-semibold text-destructive">Card activation issue</p>
                  <p className="text-xs text-muted-foreground">{claimError}</p>
                  {claimError !== CARD_ALREADY_ACTIVATED && (
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setClaimError(null)}>
                      Try again
                    </Button>
                  )}
                </>
              ) : isClaiming ? (
                <>
                  <p className="text-sm font-semibold text-primary">Activating your card</p>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we set up your {CONNECTA.name} card.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">Card detected</p>
                  <p className="text-xs text-muted-foreground">Preparing to activate your {CONNECTA.name} card.</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-[13px] font-medium text-muted-foreground">
            <span>{stepProgressLabel(stepIndex, steps)}</span>
          </div>
          <div className="h-1.5 border border-input bg-background">
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="border-[1.5px] border-input bg-background">
          <div className="flex min-h-[360px] flex-col p-6 md:p-8">
            <h1 className="mb-1 text-2xl font-bold [font-stretch:112%]">{STEP_TITLES[currentStepId]}</h1>

            {currentStepId === "welcome" && <WelcomeStep />}

            {currentStepId === "type" && <TypeStep value={profileCategory} onChange={setProfileCategory} />}

            {currentStepId === "identity" && (
              <IdentityStep
                category={profileCategory}
                fullName={fullName}
                title={title}
                company={company}
                onFullNameChange={setFullName}
                onTitleChange={setTitle}
                onCompanyChange={setCompany}
              />
            )}

            {currentStepId === "contact" && (
              <ContactStep email={email} phone={phone} website={website} onPhoneChange={setPhone} onWebsiteChange={setWebsite} />
            )}

            {currentStepId === "work" && (
              <WorkStep
                about={about}
                services={services}
                serviceInput={serviceInput}
                onAboutChange={setAbout}
                onServiceInputChange={setServiceInput}
                onAddService={addService}
                onRemoveService={removeService}
              />
            )}

            {currentStepId === "style" && (
              <StyleStep
                selectedTemplateId={templateId}
                allowedTemplateIds={myPlan.limits.allowedTemplateIds}
                onSelect={setTemplateId}
              />
            )}

            {currentStepId === "cardSkin" && (
              <CardSkinStep selectedSkin={cardSkinId} allowedSkins={myPlan.limits.allowedCardSkins} onSelect={setCardSkinId} />
            )}

            {currentStepId === "photo" && <PhotoStep avatarUrl={avatarUrl} onChange={setAvatarUrl} />}

            {currentStepId === "password" && (
              <PasswordStep
                password={password}
                confirm={confirmPassword}
                error={password || confirmPassword ? passwordProblem(password, confirmPassword) : null}
                onPasswordChange={setPassword}
                onConfirmChange={setConfirmPassword}
              />
            )}

            {currentStepId === "plans" && <PlansStep />}
          </div>

          <div className="flex items-center justify-between border-t-[1.5px] border-input px-6 pb-6 pt-4 md:px-8 md:pb-8">
            <Button variant="ghost" onClick={() => setStepIndex((s) => previousStepIndex(s))} disabled={stepIndex === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-3">
              {!currentStepDef?.required && !isLast && (
                <button type="button" onClick={handleSkipStep} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
                  Skip this step
                </button>
              )}
              <Button onClick={isLast ? handleFinish : handleNext} disabled={saving || !canGoNext}>
                {saving ? "Saving..." : isLast ? "Finish →" : "Next →"}
              </Button>
            </div>
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
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
