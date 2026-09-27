import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Task 21 (production audit): the wizard's final-step button was labelled
 * "Finish →" but was wired to the SAME handler as every "Next" — it called
 * the mutation with `markCompleted: false` and merely advanced to a summary
 * screen. The ONLY control that actually completed onboarding was the
 * summary's "Go to Profile Builder →" button. A user who clicked "Finish",
 * saw the summary, and closed the tab had NOT completed onboarding and had
 * NO profile.
 *
 * These tests mount the real wizard, click through it via the same
 * "Next →"/"Finish →" buttons a user clicks, and assert on the
 * `markCompleted` argument each click actually sends.
 *
 * Redesign (2026-09-27): the step list grew (account type/identity/contact
 * are required and now block "Next" until valid; work/style/card
 * skin/photo/plan are individually skippable) — see lib/onboardingFlow.ts,
 * tested thoroughly on its own. This file only needs to walk the real
 * required fields to reach the end, then re-assert the same Task 21
 * invariants against whatever step is actually last.
 */

// vi.mock factories are hoisted above every import in this file, so anything
// they close over must itself be created inside vi.hoisted().
const { push, replace, updateOnboarding, updateProfile, getUserState, resetUserState } = vi.hoisted(() => {
  let userState: {
    id: string;
    name: string;
    email: string;
    onboarding_completed: boolean;
    onboarding_data: Record<string, unknown> | null;
  } = {
    id: "user_test",
    name: "Test User",
    email: "test@example.com",
    onboarding_completed: false,
    onboarding_data: null,
  };

  const updateOnboarding = vi.fn(async (args: { markCompleted: boolean }) => {
    if (args.markCompleted) {
      userState = { ...userState, onboarding_completed: true, onboarding_data: { ...args } };
    }
    return { profileId: "profile_new" };
  });

  const updateProfile = vi.fn(async () => ({}));

  return {
    push: vi.fn(),
    replace: vi.fn(),
    updateOnboarding,
    updateProfile,
    getUserState: () => userState,
    resetUserState: () => {
      userState = {
        id: "user_test",
        name: "Test User",
        email: "test@example.com",
        onboarding_completed: false,
        onboarding_data: null,
      };
    },
  };
});

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "user_test", email: "test@example.com", user_metadata: {} },
  }),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ data: getUserState(), isPending: false }),
  useMyPlan: () => ({
    plan: "free",
    limits: { maxProfiles: 1, allowedTemplateIds: null, allowedCardSkins: null },
    isPending: false,
  }),
  useIsAdmin: () => ({ data: false, isPending: false }),
}));

vi.mock("@/hooks/useProfiles", () => ({
  useMyProfiles: () => ({ data: [] }),
  useSaveOnboarding: () => ({ mutateAsync: updateOnboarding }),
  useUpdateProfile: () => ({ mutateAsync: updateProfile }),
}));

vi.mock("@/hooks/useCards", () => ({
  useClaimCard: () => ({ mutateAsync: vi.fn() }),
  useLinkCardProfile: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useSettings", () => ({
  usePlanPricing: () => ({ data: { pro: 29900, business: 99900 } }),
}));

// The photo step mounts <ImageUploader>, which uploads through this hook.
vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: () => ({ mutateAsync: vi.fn(async () => "user_test/photo.webp") }),
  useImageDelete: () => ({ mutateAsync: vi.fn() }),
}));

// The style/card-skin steps re-read the freshly created profile before
// applying a non-default choice; this test never picks one, so the mock
// client is only exercised if that assumption ever breaks.
vi.mock("@/lib/db/client", () => ({
  useSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { layout_config: {}, skin: "charcoal" }, error: null }),
        }),
      }),
    }),
    auth: { updateUser: vi.fn(async () => ({ error: null })) },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import OnboardingPage from "./page";

async function goToLastStep(user: ReturnType<typeof userEvent.setup>) {
  // welcome -> type: no data needed.
  await user.click(screen.getByRole("button", { name: "Next →" }));
  await user.click(screen.getByRole("button", { name: "Next →" }));

  // identity: required — fill name and title before Next is enabled.
  await user.type(screen.getByPlaceholderText("e.g. Maria Santos"), "Maria Santos");
  await user.type(screen.getByPlaceholderText("e.g. Brand designer, real estate broker"), "Broker");
  await user.click(screen.getByRole("button", { name: "Next →" }));

  // contact: required — fill phone before Next is enabled.
  await user.type(screen.getByPlaceholderText("+63 917 123 4567"), "+63 917 000 0000");
  await user.click(screen.getByRole("button", { name: "Next →" }));

  // work, style, card skin, photo: skippable, Next needs nothing filled in.
  for (let i = 0; i < 4; i++) {
    await user.click(screen.getByRole("button", { name: "Next →" }));
  }

  // Now on "plans", the last step for a first-run, non-edit, non-invited session.
}

describe("onboarding wizard completion (Task 21)", () => {
  beforeEach(() => {
    resetUserState();
    updateOnboarding.mockClear();
    updateProfile.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  test("every Next click before the last step saves progress WITHOUT completing onboarding", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await goToLastStep(user);

    expect(updateOnboarding.mock.calls.length).toBeGreaterThan(0);
    for (const call of updateOnboarding.mock.calls) {
      expect(call[0]).toMatchObject({ markCompleted: false });
    }
  });

  test("the final step's button is labelled Finish, and clicking it — not a later click — is what completes onboarding", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await goToLastStep(user);

    const finishButton = screen.getByRole("button", { name: "Finish →" });
    await user.click(finishButton);

    expect(updateOnboarding).toHaveBeenLastCalledWith(
      expect.objectContaining({ markCompleted: true }),
    );

    // No further click was needed to persist the work: the mutation above
    // already completed onboarding and created the profile. The reactive
    // onboarding query (mocked to mirror the live one) now reports
    // completed=true, so the wizard's own post-completion confirmation
    // takes over in place of the wizard steps — proving a closed tab right
    // here would NOT lose any work.
    expect(
      await screen.findByRole("heading", { name: /profile setup complete/i }),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  test("the post-completion confirmation routes to the profile Finish just created, not a doomed bare-create form", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await goToLastStep(user);
    await user.click(screen.getByRole("button", { name: "Finish →" }));

    await screen.findByRole("heading", { name: /profile setup complete/i });
    await user.click(screen.getByRole("button", { name: /go to profile builder/i }));

    expect(push).toHaveBeenCalledWith("/dashboard/builder?id=profile_new");
  });
});
