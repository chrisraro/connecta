import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    '/',
    '/auth(.*)',    // Unified auth route (includes callback)
    '/p/(.*)',      // Public profiles
    '/t/(.*)',      // NFC Tap redirects
    '/shop(.*)',    // Public shop (browsing, cart, checkout)
    '/api/webhooks(.*)', // Payment webhooks
]);

export default clerkMiddleware(async (auth, req) => {
    const { pathname } = req.nextUrl;
    
    // Single URL Experience: Redirect old auth paths to /auth
    if (pathname === '/sign-in' || pathname === '/sign-up') {
        return NextResponse.redirect(new URL('/auth', req.url));
    }
    if (pathname.startsWith('/auth/') && pathname !== '/auth' && pathname !== '/auth/callback') {
        return NextResponse.redirect(new URL('/auth', req.url));
    }

    // Protect all non-public routes (requires authentication)
    if (!isPublicRoute(req)) {
        await auth.protect();
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
