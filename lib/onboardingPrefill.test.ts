import { describe, expect, test } from "vitest";
import { resolveOnboardingPrefill } from "./onboardingPrefill";

const authUser = { fullName: "Clerk Name", imageUrl: "https://clerk.example/avatar.png" };

describe("resolveOnboardingPrefill — edit mode", () => {
  test("hydrates from the LIVE profile's agentInfo, not onboardingData — the Task 17 C3 regression", () => {
    // Steady state for any active user: the Profile Builder's save
    // (convex/profiles.ts updateProfile) writes agentInfo directly and
    // never touches onboardingData, so onboardingData is stale/missing
    // fields the live profile actually has the instant someone edits their
    // profile outside the wizard.
    const result = resolveOnboardingPrefill({
      isEditMode: true,
      onboardingData: {
        fullName: "Stale Name",
        title: "Stale Title",
        company: "Stale Co",
        phone: "0917000000",
        services: [],
        // website/about/avatarUrl intentionally absent — stale.
      },
      profiles: [
        {
          profile_type: "business",
          agent_info: {
            fullName: "Live Name",
            title: "Live Title",
            company: "Live Co",
            phone: "0917111111",
            website: "https://real-site.example",
            about: "Live about text",
            avatarUrl: "https://cdn.example/live.png",
            services: ["Logo Design"],
          },
        },
      ],
      authUser,
    });

    expect(result).toEqual({
      profileCategory: "business",
      fullName: "Live Name",
      title: "Live Title",
      company: "Live Co",
      phone: "0917111111",
      website: "https://real-site.example",
      about: "Live about text",
      avatarUrl: "https://cdn.example/live.png",
      services: ["Logo Design"],
    });
  });

  test("returns null while the profile list is still loading (undefined) — never prefills blank", () => {
    const result = resolveOnboardingPrefill({
      isEditMode: true,
      onboardingData: null,
      profiles: undefined,
      authUser,
    });
    expect(result).toBeNull();
  });

  test("falls back to Clerk-only prefill when edit mode is requested but no profile exists yet", () => {
    const result = resolveOnboardingPrefill({
      isEditMode: true,
      onboardingData: null,
      profiles: [],
      authUser,
    });
    expect(result).toEqual({
      profileCategory: "individual",
      fullName: "Clerk Name",
      title: "",
      company: "",
      phone: "",
      website: "",
      about: "",
      avatarUrl: "https://clerk.example/avatar.png",
      services: [],
    });
  });

  test("falls back to fullName/avatarUrl from Clerk when the live profile's own fields are blank", () => {
    const result = resolveOnboardingPrefill({
      isEditMode: true,
      onboardingData: null,
      profiles: [
        {
          profile_type: "individual",
          agent_info: {
            fullName: "",
            title: "Title",
            company: "Co",
            phone: "0917",
            services: [],
          },
        },
      ],
      authUser,
    });
    expect(result?.fullName).toBe("Clerk Name");
    expect(result?.avatarUrl).toBe("https://clerk.example/avatar.png");
  });
});

describe("resolveOnboardingPrefill — first-run (create mode), unchanged behavior", () => {
  test("prefills from onboardingData when present", () => {
    const result = resolveOnboardingPrefill({
      isEditMode: false,
      onboardingData: {
        profileCategory: "company",
        fullName: "Saved Name",
        title: "Saved Title",
        company: "Saved Co",
        phone: "0917222222",
        website: "https://saved.example",
        about: "Saved about",
        avatarUrl: "https://cdn.example/saved.png",
        services: ["Web Design"],
      },
      profiles: [],
      authUser,
    });
    expect(result).toEqual({
      profileCategory: "company",
      fullName: "Saved Name",
      title: "Saved Title",
      company: "Saved Co",
      phone: "0917222222",
      website: "https://saved.example",
      about: "Saved about",
      avatarUrl: "https://cdn.example/saved.png",
      services: ["Web Design"],
    });
  });

  test("falls back to Clerk basics when there's no onboardingData yet", () => {
    const result = resolveOnboardingPrefill({
      isEditMode: false,
      onboardingData: null,
      profiles: [],
      authUser,
    });
    expect(result).toEqual({
      profileCategory: "individual",
      fullName: "Clerk Name",
      title: "",
      company: "",
      phone: "",
      website: "",
      about: "",
      avatarUrl: "https://clerk.example/avatar.png",
      services: [],
    });
  });

  test("returns null when there's neither onboardingData nor a Clerk user yet", () => {
    const result = resolveOnboardingPrefill({
      isEditMode: false,
      onboardingData: null,
      profiles: [],
      authUser: null,
    });
    expect(result).toBeNull();
  });
});
