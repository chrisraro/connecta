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

// vi.mock factories are hoisted above every import/const in this file, so
// anything they close over must itself be created inside vi.hoisted().
const { API, push, replace, updateOnboarding, getOnboardingState, resetOnboardingState } = vi.hoisted(() => {
    const API = {
        users: {
            getOnboardingStatus: "users.getOnboardingStatus",
            updateOnboarding: "users.updateOnboarding",
        },
        profiles: {
            getMyProfiles: "profiles.getMyProfiles",
        },
        cards: {
            claimCardByUuid: "cards.claimCardByUuid",
            linkProfile: "cards.linkProfile",
        },
        // The wizard's photo step mounts <ImageUploader>, which calls
        // useMutation/useAction against these directly — needed so that
        // component doesn't crash on `api.images` being undefined.
        images: {
            generateUploadUrl: "images.generateUploadUrl",
            validateUpload: "images.validateUpload",
        },
    };

    let onboardingState: { completed: boolean; data?: Record<string, unknown> } = {
        completed: false,
        data: undefined,
    };

    const updateOnboarding = vi.fn(async (args: { markCompleted: boolean }) => {
        if (args.markCompleted) {
            onboardingState = { completed: true, data: { ...args } };
        }
        return { profileId: "profile_new" };
    });

    return {
        API,
        push: vi.fn(),
        replace: vi.fn(),
        updateOnboarding,
        getOnboardingState: () => onboardingState,
        resetOnboardingState: () => {
            onboardingState = { completed: false, data: undefined };
        },
    };
});

vi.mock("@/convex/_generated/api", () => ({ api: API }));

vi.mock("@clerk/nextjs", () => ({
    useUser: () => ({
        isLoaded: true,
        user: {
            id: "user_test",
            fullName: "Test User",
            imageUrl: "",
            primaryEmailAddress: { emailAddress: "test@example.com" },
        },
    }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("convex/react", () => ({
    useQuery: (ref: unknown) => {
        if (ref === API.users.getOnboardingStatus) return getOnboardingState();
        if (ref === API.profiles.getMyProfiles) return [];
        return undefined;
    },
    useMutation: (ref: unknown) => {
        if (ref === API.users.updateOnboarding) return updateOnboarding;
        return vi.fn();
    },
    useAction: () => vi.fn(),
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
        resetOnboardingState();
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
            expect.objectContaining({ markCompleted: true })
        );

        // No further click was needed to persist the work: the mutation
        // above already completed onboarding and created the profile. The
        // reactive onboarding query (mocked to mirror Convex) now reports
        // completed=true, so the wizard's own post-completion confirmation
        // takes over in place of the wizard steps — proving a closed tab
        // right here would NOT lose any work.
        expect(
            await screen.findByRole("heading", { name: /profile setup complete/i })
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
