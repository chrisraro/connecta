import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public surface now outnumbers the protected one: every top-level segment
// that isn't one of the app's known static sections is a potential vanity
// profile slug (see app/[slug]/page.tsx + lib/slug.ts RESERVED set) and must
// be reachable by anonymous visitors tapping an NFC card. So instead of an
// allow-list of public routes, we deny-list the areas that actually require
// authentication and let everything else — including arbitrary vanity
// slugs — fall through.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)", // Authenticated profile builder / account area
  "/admin(.*)", // Admin console (role-gated further below)
]);

// All /api routes require auth EXCEPT payment webhooks (Stripe/PayPal call
// without a Clerk session and verify via their own signature checks) and
// the health check (must be reachable by uptime monitoring with no
// credentials — that's the entire point of a health endpoint). Matched with
// a plain startsWith check (rather than a negative-lookahead route-matcher
// pattern) so behavior doesn't depend on whether the underlying
// path-to-regexp version supports that regex construct.
const isPublicApiRoute = createRouteMatcher(["/api/webhooks(.*)", "/api/health"]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  const { userId } = await auth();

  // If authenticated user attempts to access auth pages, route straight to /dashboard
  if (userId && (pathname === "/auth" || pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Single URL Experience: Redirect old auth paths to /auth
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/auth", req.url));
  }
  if (pathname.startsWith("/auth/") && pathname !== "/auth" && pathname !== "/auth/callback") {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  // Segment-aware, so a vanity slug like /apikeys is not mistaken for an
  // API route and hidden behind auth.
  const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");
  const needsAuth = isProtectedRoute(req) || (isApiRoute && !isPublicApiRoute(req));
  if (needsAuth) {
    await auth.protect();
  }

  // Defense-in-depth for /admin/*: if the Clerk session carries a role claim,
  // use it to reject non-admins before the shell even renders.
  //
  // The claim only exists once Clerk's session token is customised to expose
  // publicMetadata (Dashboard -> Sessions -> Customize session token, with
  // {"metadata": "{{user.public_metadata}}"}). That is a manual dashboard
  // step with no API, and it is easy to miss.
  //
  // So this DEGRADES rather than fails closed. Blocking on a missing claim
  // locked every account out of the admin console — including the real
  // superadmin — which is a self-inflicted outage, not security. It bought
  // nothing, because /admin is already gated twice over:
  //
  //   1. app/admin/layout.tsx verifies the signed-in user server-side via
  //      Convex and redirects non-admins to /dashboard.
  //   2. Every admin Convex function calls authz.ts:requireAdmin, so no
  //      admin DATA is reachable without a real admin grant regardless of
  //      what any UI shell renders.
  //
  // Present claim -> enforce it. Absent claim -> fall through to those two.
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
    const claimConfigured = role !== undefined && role !== null;
    if (claimConfigured && role !== "admin" && role !== "superadmin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
