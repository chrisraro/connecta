import { expect, test } from "vitest";
import { isFullScreenDashboardRoute } from "./dashboardChrome";

// Blocker 4 (production audit, Task 14): on common phone widths the
// dashboard's fixed bottom nav (app/dashboard/layout.tsx's MobileBottomNav,
// `fixed bottom-6 ... z-50`) and Quick Actions FAB physically overlapped the
// onboarding wizard's own Back/Next row and intercepted real taps — a click
// dispatched at the visible "Next →" button navigated to
// /dashboard/cards instead of advancing the wizard. The builder route
// already solved this for itself (app/dashboard/builder/page.tsx injects
// `.mobile-bottom-nav{display:none!important}`); onboarding had no
// equivalent. This function is the single route-level decision — "is this a
// focused full-screen task that must not share the viewport with the fixed
// mobile chrome" — consumed by DashboardLayout to conditionally render (not
// just visually hide) MobileBottomNav/DashboardFabs.

test("suppresses the fixed mobile chrome on the onboarding route", () => {
  expect(isFullScreenDashboardRoute("/dashboard/onboarding")).toBe(true);
});

test("keeps the fixed mobile chrome on every other dashboard route", () => {
  expect(isFullScreenDashboardRoute("/dashboard")).toBe(false);
  expect(isFullScreenDashboardRoute("/dashboard/profiles")).toBe(false);
  expect(isFullScreenDashboardRoute("/dashboard/builder")).toBe(false);
  expect(isFullScreenDashboardRoute("/dashboard/leads")).toBe(false);
  expect(isFullScreenDashboardRoute("/dashboard/cards")).toBe(false);
  expect(isFullScreenDashboardRoute("/dashboard/settings")).toBe(false);
});

test("does not false-positive on a route that merely starts with the same prefix", () => {
  // Defends the exact-match choice: a hypothetical future
  // /dashboard/onboarding-help route must not silently lose its nav too.
  expect(isFullScreenDashboardRoute("/dashboard/onboarding-help")).toBe(false);
});

test("is false for a null/undefined pathname (usePathname before mount)", () => {
  expect(isFullScreenDashboardRoute(null)).toBe(false);
  expect(isFullScreenDashboardRoute(undefined)).toBe(false);
});
