import { expect, test } from "vitest";
import { shouldRedirectAdminToConsole } from "./adminRedirect";

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
