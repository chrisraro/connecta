import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    '/',
    '/auth(.*)',    // Unified auth route
    '/p/(.*)',      // Public profiles
    '/t/(.*)',      // NFC Tap redirects
]);

export default clerkMiddleware(async (auth, req) => {
    const { pathname } = req.nextUrl;
    
    // Single URL Experience: Redirect all auth-related paths to the root /auth page
    if (pathname === '/sign-in' || pathname === '/sign-up' || (pathname.startsWith('/auth/') && pathname !== '/auth')) {
        return NextResponse.redirect(new URL('/auth', req.url));
    }

    if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
