/**
 * Decides whether an admin who is currently rendering a `/dashboard/**`
 * route should be bounced to the admin console (`/admin`).
 *
 * Extracted as a pure route check (rather than left inline in
 * `DashboardLayout`) so the rule is testable without mounting the layout's
 * Clerk/Convex/Next hooks — same rationale as `lib/dashboardChrome.ts`'s
 * `isFullScreenDashboardRoute`.
 *
 * Production audit Task 20 (I6): this used to fire on every `/dashboard/**`
 * route except `/dashboard/onboarding`, which meant an admin could complete
 * onboarding (the profile is created and goes publicly live) and then could
 * never edit it — every next visit to `/dashboard/builder?id=X` bounced them
 * straight back to `/admin`. The same bounce also broke the post-claim
 * confirmation hand-off at `app/t/[uuid]/page.tsx`, which routes into
 * `/dashboard`. Since the product owner is an admin, this blocked dogfooding
 * the entire consumer journey.
 *
 * The redirect's genuine purpose — send an admin who lands on the dashboard
 * home straight to their console instead of the consumer overview — only
 * needs to fire on the dashboard ROOT, not on every sub-route beneath it.
 * Restricting it to the exact `/dashboard` path preserves that first-landing
 * behavior while letting an admin use the rest of the consumer product
 * (builder, profiles, cards, the onboarding wizard, settings, ...) exactly
 * like any other user — which is also the only way to dogfood it.
 *
 * NOTE: This pure function is used internally by shouldRedirectAdminOnFirstLanding.
 * Components should use shouldRedirectAdminOnFirstLanding instead, which adds
 * session-tracking to prevent re-bouncing when an admin explicitly navigates
 * to /dashboard (e.g., via the "Back to user app" button).
 */
export function shouldRedirectAdminToConsole(pathname: string | null | undefined): boolean {
    return pathname === "/dashboard";
}

/**
 * Decides whether an admin should be redirected to the admin console, but
 * only on FIRST landing at /dashboard during this session.
 *
 * Once an admin has been redirected to /admin during a session, they can
 * navigate back to /dashboard (e.g., via "Back to user app" button) and stay
 * there — this allows the consumer app to be dogfooded without bouncing them
 * in an infinite loop.
 *
 * Uses sessionStorage to track "already redirected this session" so the
 * redirect fires only once per session, not on every visit to /dashboard.
 *
 * Must be called from a client component (requires sessionStorage).
 */
export function shouldRedirectAdminOnFirstLanding(pathname: string | null | undefined): boolean {
    // Must check the route first — redirect only from /dashboard root
    if (!shouldRedirectAdminToConsole(pathname)) {
        return false;
    }

    // No sessionStorage outside the browser. This is called from a client
    // effect today, so it never runs during SSR — but it is an exported
    // helper, and an unguarded access would crash the whole page the first
    // time someone calls it during render or from the edge-runtime test
    // project. Fail closed: no storage means no redirect, never a throw.
    if (typeof sessionStorage === "undefined") {
        return false;
    }

    // Only redirect if we haven't already done so in this session
    // Using sessionStorage so the flag persists across navigations within the same tab
    const redirectKey = "admin-redirect-done";
    const hasAlreadyRedirected = sessionStorage.getItem(redirectKey) === "true";

    if (hasAlreadyRedirected) {
        return false;
    }

    // Mark that we've redirected so we don't do it again this session
    sessionStorage.setItem(redirectKey, "true");
    return true;
}
