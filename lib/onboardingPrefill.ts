/**
 * Decides what values the onboarding wizard (app/dashboard/onboarding/
 * page.tsx) should prefill its form with, for both first-run onboarding and
 * "Edit Profile Setup" (`?edit=true`) re-entry.
 *
 * Extracted as a pure function (rather than left inline in the page's
 * prefill `useEffect`) so the prefill SOURCE decision is testable without
 * mounting the page's Clerk/Convex/Next hooks — same rationale as
 * lib/dashboardChrome.ts and lib/builderEntry.ts.
 *
 * Production audit Task 17 follow-up (reviewer Critical finding on the C3
 * fix): edit mode used to prefill from `onboarding.data`
 * (`user.onboardingData`), which is written ONLY by this same wizard. The
 * Profile Builder's save (convex/profiles.ts `updateProfile`) writes
 * `agentInfo` directly and never touches `onboardingData` — so the instant a
 * user edits company/website/about/services/etc. in the Builder (the normal
 * way to maintain a profile), `onboardingData` goes stale relative to the
 * live profile. `updateOnboarding`'s edit-branch merge
 * (`{...existing.agentInfo, ...wizardAgentInfo}`, convex/users.ts) then
 * takes whatever the wizard sends as authoritative: if the wizard prefilled
 * a field from stale/blank onboardingData and the user doesn't retype it,
 * the client resends the stale value (or `undefined` for an optional
 * field), and the merge overwrites the live Builder-set value with it —
 * silent data loss, not an edge case, the steady state for any active user.
 *
 * The fix: in edit mode, hydrate from the LIVE `profile.agent_info` (plus
 * `profileType`) instead of `onboardingData`, so whatever the wizard sends
 * back on completion is a faithful snapshot of current state and the merge
 * can never erase anything the user didn't actually change. First-run
 * onboarding (no profile yet) is unaffected — it still prefills from
 * `onboardingData`/Clerk exactly as before.
 */

export type OnboardingProfileCategory = "individual" | "company" | "business";

export interface OnboardingPrefillValues {
  profileCategory: OnboardingProfileCategory;
  fullName: string;
  title: string;
  company: string;
  phone: string;
  website: string;
  about: string;
  avatarUrl: string;
  services: string[];
}

export interface OnboardingDataLike {
  profileCategory?: OnboardingProfileCategory;
  fullName?: string;
  title?: string;
  company?: string;
  phone?: string;
  website?: string;
  about?: string;
  avatarUrl?: string;
  services?: string[];
}

/**
 * The subset of a profile's agent_info this helper reads.
 *
 * company/phone are OPTIONAL here even though the wizard always collects
 * them: types/profile.ts ProfileInfo declares them optional, and a row read
 * back from the database satisfies that type, not a stricter one. Requiring
 * them made a real ProfileInfo unassignable to this.
 */
export interface ProfileAgentInfoLike {
  fullName: string;
  title: string;
  company?: string;
  phone?: string;
  website?: string;
  about?: string;
  avatarUrl?: string;
  services?: string[];
}

export interface ProfileLike {
  profile_type?: OnboardingProfileCategory | null;
  agent_info: ProfileAgentInfoLike;
}

/**
 * The bits of the signed-in account this prefill can fall back on.
 *
 * Was AuthUserLike. Supabase Auth carries no display name of its own -- the
 * name lives on public.users and any avatar comes from OAuth metadata -- so
 * the caller supplies both rather than this module reaching for provider
 * fields that may not exist.
 */
export interface AuthUserLike {
  fullName?: string | null;
  imageUrl?: string | null;
}

function clerkOnlyPrefill(authUser: AuthUserLike | null | undefined): OnboardingPrefillValues {
  return {
    profileCategory: "individual",
    fullName: authUser?.fullName || "",
    title: "",
    company: "",
    phone: "",
    website: "",
    about: "",
    avatarUrl: authUser?.imageUrl || "",
    services: [],
  };
}

export function resolveOnboardingPrefill(params: {
  isEditMode: boolean;
  onboardingData: OnboardingDataLike | null | undefined;
  profiles: readonly ProfileLike[] | undefined;
  authUser: AuthUserLike | null | undefined;
}): OnboardingPrefillValues | null {
  const { isEditMode, onboardingData, profiles, authUser } = params;

  if (isEditMode) {
    // Still loading the profile list — wait rather than prefilling
    // blank/stale values that `hasPrefilled` would then lock in for good.
    if (profiles === undefined) return null;

    const profile = profiles[0];
    if (!profile) {
      // Edit mode was requested but there's no profile to edit yet (not
      // expected in normal use — the "Edit Profile Setup" entry point only
      // exists once a profile does — but degrade to the same Clerk-only
      // prefill a brand-new user gets rather than crash or prefill blank).
      return clerkOnlyPrefill(authUser);
    }

    const info = profile.agent_info;
    return {
      profileCategory: profile.profile_type ?? "individual",
      fullName: info.fullName || authUser?.fullName || "",
      title: info.title || "",
      company: info.company || "",
      phone: info.phone || "",
      website: info.website || "",
      about: info.about || "",
      avatarUrl: info.avatarUrl || authUser?.imageUrl || "",
      services: info.services || [],
    };
  }

  if (onboardingData) {
    return {
      profileCategory: onboardingData.profileCategory ?? "individual",
      fullName: onboardingData.fullName || authUser?.fullName || "",
      title: onboardingData.title || "",
      company: onboardingData.company || "",
      phone: onboardingData.phone || "",
      website: onboardingData.website || "",
      about: onboardingData.about || "",
      avatarUrl: onboardingData.avatarUrl || authUser?.imageUrl || "",
      services: onboardingData.services || [],
    };
  }

  if (authUser) {
    return clerkOnlyPrefill(authUser);
  }

  return null;
}
