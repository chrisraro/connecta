import { expect, test, describe, beforeEach } from "vitest";
import { shouldRedirectAdminToConsole, shouldRedirectAdminOnFirstLanding } from "./adminRedirect";

// Task 20 (production audit, I6): app/dashboard/layout.tsx used to eject an
// admin from EVERY /dashboard/** route (except /dashboard/onboarding) back to
// /admin. An admin can complete onboarding (the profile is created and
// publicly live) and then gets bounced off /dashboard/builder?id=X and can
// never edit it — and the post-claim confirmation at app/t/[uuid]/page.tsx
// redirects into /dashboard too, so the same bounce breaks that flow. The
// product owner is an admin, so this blocked dogfooding the entire consumer
// journey. This pure function is the single route-level decision the layout
// consumes, extracted so it's testable without mounting the layout's
// Clerk/Convex/Next hooks (same rationale as lib/dashboardChrome.ts).
//
// Fix: only redirect from the literal dashboard root (`/dashboard`) — that
// preserves the redirect's genuine purpose (send an admin who lands on the
// dashboard home straight to their console) without trapping them on every
// consumer sub-route they navigate to afterward (or land on directly, e.g.
// the onboarding claim hand-off).
//
// To avoid bouncing an admin straight back when they explicitly navigate to
// /dashboard (e.g. via "Back to user app" button), the redirect should fire
// only on FIRST landing, tracked per session. The consumer app effect uses
// shouldRedirectAdminOnFirstLanding, which combines the route check with
// a session-storage flag that prevents re-triggering.

describe("shouldRedirectAdminToConsole", () => {
    test("redirects from the bare dashboard root", () => {
        expect(shouldRedirectAdminToConsole("/dashboard")).toBe(true);
    });

    test("does not redirect from any dashboard sub-route", () => {
        expect(shouldRedirectAdminToConsole("/dashboard/onboarding")).toBe(false);
        expect(shouldRedirectAdminToConsole("/dashboard/builder")).toBe(false);
        expect(shouldRedirectAdminToConsole("/dashboard/profiles")).toBe(false);
        expect(shouldRedirectAdminToConsole("/dashboard/cards")).toBe(false);
        expect(shouldRedirectAdminToConsole("/dashboard/leads")).toBe(false);
        expect(shouldRedirectAdminToConsole("/dashboard/settings")).toBe(false);
        expect(shouldRedirectAdminToConsole("/dashboard/billing")).toBe(false);
    });

    test("does not false-positive on a route that merely starts with the same prefix", () => {
        expect(shouldRedirectAdminToConsole("/dashboard-help")).toBe(false);
    });

    test("is false for a null/undefined pathname (usePathname before mount)", () => {
        expect(shouldRedirectAdminToConsole(null)).toBe(false);
        expect(shouldRedirectAdminToConsole(undefined)).toBe(false);
    });
});

describe("shouldRedirectAdminOnFirstLanding", () => {
    beforeEach(() => {
        // Reset sessionStorage before each test
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.clear();
        }
    });

    test("redirects when landing on /dashboard for the first time (flag not set)", () => {
        expect(shouldRedirectAdminOnFirstLanding("/dashboard")).toBe(true);
    });

    test("does not redirect when landing on /dashboard a second time (flag already set)", () => {
        // First call sets the flag
        expect(shouldRedirectAdminOnFirstLanding("/dashboard")).toBe(true);
        // Second call sees flag is set, returns false
        expect(shouldRedirectAdminOnFirstLanding("/dashboard")).toBe(false);
    });

    test("does not redirect from any dashboard sub-route, even on first visit", () => {
        expect(shouldRedirectAdminOnFirstLanding("/dashboard/profiles")).toBe(false);
        expect(shouldRedirectAdminOnFirstLanding("/dashboard/builder")).toBe(false);
        expect(shouldRedirectAdminOnFirstLanding("/dashboard/leads")).toBe(false);
    });

    test("is false for null/undefined pathname", () => {
        expect(shouldRedirectAdminOnFirstLanding(null)).toBe(false);
        expect(shouldRedirectAdminOnFirstLanding(undefined)).toBe(false);
    });

    test("allows navigation back to /dashboard after initial redirect (simulating admin clicking Back to user app)", () => {
        // Simulate initial landing on /dashboard (this would trigger redirect to /admin)
        const shouldRedirectFirstTime = shouldRedirectAdminOnFirstLanding("/dashboard");
        expect(shouldRedirectFirstTime).toBe(true);

        // Simulate admin navigating to a consumer sub-route (flag stays set)
        const shouldRedirectFromProfiles = shouldRedirectAdminOnFirstLanding("/dashboard/profiles");
        expect(shouldRedirectFromProfiles).toBe(false);

        // Simulate admin clicking "Back to user app" (returns to /dashboard but flag is already set)
        const shouldRedirectSecondTime = shouldRedirectAdminOnFirstLanding("/dashboard");
        expect(shouldRedirectSecondTime).toBe(false);
        // Now admin stays on consumer /dashboard instead of bouncing back
    });
});

/**
 * shouldRedirectAdminOnFirstLanding is exported, so it can be called from
 * somewhere that has no sessionStorage — during SSR, or from the
 * edge-runtime vitest project. An unguarded access there is a ReferenceError
 * that takes down the whole page, and nothing in the suite would catch it
 * because the effect that calls it today only ever runs in the browser.
 */
test("shouldRedirectAdminOnFirstLanding does not throw where sessionStorage is absent", () => {
  const original = Reflect.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  // @ts-expect-error deliberately simulating a non-browser global
  delete globalThis.sessionStorage;
  try {
    expect(() => shouldRedirectAdminOnFirstLanding("/dashboard")).not.toThrow();
    expect(shouldRedirectAdminOnFirstLanding("/dashboard")).toBe(false);
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
  }
});
