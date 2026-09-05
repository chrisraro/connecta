/**
 * Decides whether a `/dashboard/**` route is a focused, full-screen task
 * that must not share the viewport with the fixed mobile chrome
 * (`MobileBottomNav`, the Quick Actions FAB — both `app/dashboard/layout.tsx`).
 *
 * Extracted as a pure route check (rather than leaving the decision inline
 * in DashboardLayout) so it's the single source of truth `DashboardLayout`
 * consumes to conditionally render that chrome, and so the routing rule
 * itself is testable without mounting the layout's Clerk/Convex/Next hooks.
 *
 * Production audit Task 14 (Blocker 4): at 390–430px viewports the fixed
 * bottom nav (`fixed bottom-6 left-4 right-4 z-50`) visually overlapped and
 * — confirmed via a real dispatched click, not just a bounding-rect
 * measurement — intercepted taps on the onboarding wizard's own Back/Next
 * row; a click at the visible "Next →" button navigated to
 * `/dashboard/cards` instead of advancing the wizard. The builder route
 * already handles this for itself by injecting
 * `.mobile-bottom-nav{display:none!important}`; onboarding is the other
 * focused full-screen task in the dashboard and had no equivalent.
 *
 * Route removal (not a z-index/CSS override) is deliberate: onboarding's own
 * "Skip for now" / "Back to Dashboard" controls remain the way out, so the
 * user is never trapped, and there's no fixed-chrome layer left to fight for
 * taps near the bottom of the viewport regardless of step content length.
 */
export function isFullScreenDashboardRoute(pathname: string | null | undefined): boolean {
  return pathname === "/dashboard/onboarding";
}
