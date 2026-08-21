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
 */
export function shouldRedirectAdminToConsole(pathname: string | null | undefined): boolean {
    return pathname === "/dashboard";
}
