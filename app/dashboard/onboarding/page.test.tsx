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
 * The existing tests for this page (there were none at the component level)
 * never asserted WHICH control triggers completion — only that completion
 * worked when directly invoked — which is exactly why this survived. These
 * tests mount the real wizard, click through it via the same "Next →"/
 * "Finish →" buttons a user clicks, and assert on the `markCompleted`
 * argument each click actually sends.
 *
 * convex/react, @clerk/nextjs, next/navigation, and sonner are mocked below
 * — there's no existing precedent in this repo for mounting a page this
 * hook-heavy, so the mocks are local to this file. `updateOnboarding`'s mock
 * flips a small local `onboardingState.completed` to true on
 * `markCompleted: true`, mirroring how the real Convex reactive query
 * updates after a mutation lands — this is what lets the wizard's own
 * completed-state screen take over as the post-completion confirmation,
 * exactly as it does live.
 */

// vi.mock factories are hoisted above every import in this file, so anything
// they close over must itself be created inside vi.hoisted().
//
// Ported from Convex: there is no api object or reactive query to fake any
// more. The wizard reads its state from useCurrentUser (the public.users row)
// and writes through useSaveOnboarding, so those are what get mocked -- and
// the mocked save updates the mocked user row, which is what lets the
// completed-state screen take over exactly as it does live.
const { push, replace, updateOnboarding, getUserState, resetUserState } = vi.hoisted(() => {
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

  return {
    push: vi.fn(),
    replace: vi.fn(),
    updateOnboarding,
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
  useMyPlan: () => ({ plan: "free", limits: { maxProfiles: 1 }, isPending: false }),
  useIsAdmin: () => ({ data: false, isPending: false }),
}));

vi.mock("@/hooks/useProfiles", () => ({
  useMyProfiles: () => ({ data: [] }),
  useSaveOnboarding: () => ({ mutateAsync: updateOnboarding }),
}));

vi.mock("@/hooks/useCards", () => ({
  useClaimCard: () => ({ mutateAsync: vi.fn() }),
  useLinkCardProfile: () => ({ mutateAsync: vi.fn() }),
}));

// The photo step mounts <ImageUploader>, which uploads through this hook.
vi.mock("@/hooks/useImageUpload", () => ({
  useImageUpload: () => ({ mutateAsync: vi.fn(async () => "user_test/photo.webp") }),
  useImageDelete: () => ({ mutateAsync: vi.fn() }),
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
  // welcome -> type -> identity -> contact -> work -> photo (5 "Next"s).
  // No field validation gates advancing, so this reaches the last step
  // without filling in any form data.
  for (let i = 0; i < 5; i++) {
    await user.click(screen.getByRole("button", { name: "Next →" }));
  }
}

describe("onboarding wizard completion (Task 21)", () => {
  beforeEach(() => {
    resetUserState();
    updateOnboarding.mockClear();
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

    // No further click was needed to persist the work: the mutation
    // above already completed onboarding and created the profile. The
    // reactive onboarding query (mocked to mirror Convex) now reports
    // completed=true, so the wizard's own post-completion confirmation
    // takes over in place of the wizard steps — proving a closed tab
    // right here would NOT lose any work.
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
