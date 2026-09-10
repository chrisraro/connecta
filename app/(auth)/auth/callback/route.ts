import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Post-authentication landing point.
 *
 * Replaces the Clerk-era client component, which rendered a spinner, waited
 * for a Convex admin query, and only then pushed a route -- a visible flash on
 * every single sign-in. As a route handler the session exchange, the admin
 * check and the redirect all happen server-side before anything is painted.
 *
 * The three destinations match the old behaviour exactly:
 *   admin            -> /admin
 *   arrived from NFC -> /dashboard/onboarding (whose effect claims the card)
 *   everyone else    -> /dashboard
 *
 * card_uuid forwarding is load-bearing. This is the middle link of the QR
 * activation chain (/t/<uuid> -> /auth -> here -> claim). An earlier version
 * hard-coded its destinations, dropped the param, and broke NFC activation
 * end-to-end while every individual link still looked fine.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const cardUuid = searchParams.get("card_uuid");
  const redirect = searchParams.get("redirect");

  const supabase = await createClient();

  // OAuth and magic-link flows arrive with a code to trade for a session.
  // Password sign-in already has one, so a missing code is not an error.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const back = new URL("/auth", origin);
      back.searchParams.set("error", error.message);
      return NextResponse.redirect(back);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth", origin));
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) {
    return NextResponse.redirect(new URL("/admin", origin));
  }

  if (cardUuid) {
    const target = new URL("/dashboard/onboarding", origin);
    target.searchParams.set("card_uuid", cardUuid);
    return NextResponse.redirect(target);
  }

  // Only same-origin relative paths. Rejecting "//evil.com" specifically:
  // it starts with "/" so a naive prefix check passes it, and the browser
  // reads it as a protocol-relative URL to another host -- an open redirect
  // handed to us in a query parameter.
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return NextResponse.redirect(new URL(redirect, origin));
  }

  return NextResponse.redirect(new URL("/dashboard", origin));
}
