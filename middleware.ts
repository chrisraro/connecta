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
    '/dashboard(.*)', // Authenticated profile builder / account area
    '/admin(.*)',     // Admin console (role-gated further below)
]);

// All /api routes require auth EXCEPT payment webhooks, which Stripe/PayPal
// call without a Clerk session and verify via their own signature checks.
// Matched with a plain startsWith check (rather than a negative-lookahead
// route-matcher pattern) so behavior doesn't depend on whether the
// underlying path-to-regexp version supports that regex construct.
const isPublicApiRoute = createRouteMatcher(['/api/webhooks(.*)']);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
    const { pathname } = req.nextUrl;

    // Single URL Experience: Redirect old auth paths to /auth
    if (pathname === '/sign-in' || pathname === '/sign-up') {
        return NextResponse.redirect(new URL('/auth', req.url));
    }
    if (pathname.startsWith('/auth/') && pathname !== '/auth' && pathname !== '/auth/callback') {
        return NextResponse.redirect(new URL('/auth', req.url));
    }

    const needsAuth = isProtectedRoute(req) || (pathname.startsWith('/api') && !isPublicApiRoute(req));
    if (needsAuth) {
        await auth.protect();
    }

    // Defense-in-depth: /admin/* also requires the "admin" role claim on the
    // Clerk session (populated via a Clerk session-token JWT template mapping
    // publicMetadata.role -> sessionClaims.metadata.role). The real
    // authorization gate remains convex/authz.ts:requireAdmin on every admin
    // Convex function — this check only stops the admin UI shell itself from
    // rendering for non-admins (Auth audit #3).
    if (isAdminRoute(req)) {
        const { sessionClaims } = await auth();
        const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
        if (role !== "admin" && role !== "superadmin") {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
