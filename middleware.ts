import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { authRouteRedirect, recoveryApiBlocked } from "@/lib/authRecovery";
import { RECOVERY_PASS_COOKIE, recoveryPassSecret, verifyRecoveryPass } from "@/lib/recoveryPass";

// Public surface outnumbers the protected one: every top-level segment that is
// not a known static section is a potential vanity profile slug (see
// app/[slug]/page.tsx + lib/slug.ts RESERVED) and must be reachable by an
// anonymous visitor tapping an NFC card. So this deny-lists the areas that
// require authentication and lets everything else -- including arbitrary
// vanity slugs -- fall through.
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

// All /api routes require auth EXCEPT webhooks (called by third parties with
// no session, verified by their own signatures), the health check, which
// must be reachable by uptime monitoring with no credentials -- that is the
// entire point of a health endpoint -- and lead submission, whose callers
// are by definition signed-out visitors to a public profile. /api/leads
// carries its own protection: per-visitor and per-owner rate limits inside
// submit_lead(), and it only ever writes, never reads.
const PUBLIC_API_PREFIXES = ["/api/webhooks", "/api/health", "/api/leads"];

function hasPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh first. Skipping this for public routes would mean a signed-in
  // visitor browsing public pages has their token quietly expire, and they
  // discover it only when they next open the dashboard.
  const { supabaseResponse, user } = await updateSession(request);

  // Single URL experience: one /auth page, old paths fold into it.
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  // /auth sub-paths fold into /auth except the email-link handlers and the
  // password reset page, which needs a verified reset link's pass. A session
  // holding that pass stays on the reset page until the password is saved.
  const recovering = Boolean(
    user &&
      (await verifyRecoveryPass(
        request.cookies.get(RECOVERY_PASS_COOKIE)?.value,
        user.id,
        Date.now(),
        recoveryPassSecret(),
      )),
  );
  const authRedirect = authRouteRedirect(pathname, { hasUser: Boolean(user), recovering });
  if (authRedirect) {
    return NextResponse.redirect(new URL(authRedirect, request.url));
  }
  if (recoveryApiBlocked(pathname, recovering)) {
    return NextResponse.json(
      { error: "Finish setting your new password first." },
      { status: 403 },
    );
  }

  // Segment-aware, so a vanity slug like /apikeys is not mistaken for an API
  // route and hidden behind auth.
  const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");
  const needsAuth =
    hasPrefix(pathname, PROTECTED_PREFIXES) ||
    (isApiRoute && !hasPrefix(pathname, PUBLIC_API_PREFIXES));

  if (needsAuth && !user) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signIn = new URL("/auth", request.url);
    // So the user lands back where they were aiming after signing in.
    signIn.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signIn);
  }

  // Admin gate.
  //
  // The Clerk version of this had to DEGRADE: its role check depended on a
  // session claim that only exists after a manual dashboard step, so a missing
  // claim had to fall through rather than lock out the real superadmin.
  //
  // That compromise is gone. is_admin() reads the admins table directly, so
  // the answer is authoritative and a failure means NOT an admin. One RPC on
  // /admin routes only -- the rest of the app never pays for it.
  //
  // Still defence in depth, not the boundary: app/admin/layout.tsx re-checks
  // server-side, and every admin table is behind an is_admin() RLS policy, so
  // no admin DATA is reachable regardless of what UI shell renders.
  if (hasPrefix(pathname, ["/admin"])) {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      },
    );
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
