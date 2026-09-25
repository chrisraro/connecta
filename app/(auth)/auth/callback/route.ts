import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESET_LINK_INVALID } from "@/lib/authRecovery";
import { recoveryRedirect } from "@/lib/recoveryResponse";

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

  // Password reset (B5). Handled before everything else: the link signs the
  // person in, and without this an admin would be sent to /admin instead of
  // being asked for a new password. A PKCE code only exchanges in the browser
  // that asked for the reset; /auth/confirm handles links from any device.
  if (searchParams.get("flow") === "recovery") {
    const failed = Boolean(searchParams.get("error") || searchParams.get("error_description"));
    if (failed || !code) return NextResponse.redirect(new URL(RESET_LINK_INVALID, origin));
    return recoveryRedirect(origin, async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      return error ? null : (data.user?.id ?? null);
    });
  }

  // Back to sign-in with a named notice, keeping the card the visitor tapped.
  // A key rather than the auth server's text: the page owns the wording, and
  // nothing from the query string is echoed back as content.
  const backToSignIn = (notice: "confirmed" | "link_invalid") => {
    const back = new URL("/auth", origin);
    back.searchParams.set("mode", "signin");
    back.searchParams.set("notice", notice);
    if (cardUuid) back.searchParams.set("card_uuid", cardUuid);
    return NextResponse.redirect(back);
  };

  // The auth server redirects here WITH error params when a confirmation link
  // is expired or already used. Ignoring them left the person on a bare
  // sign-up page with no idea what happened.
  if (searchParams.get("error") || searchParams.get("error_description")) {
    return backToSignIn("link_invalid");
  }

  // OAuth and email-link flows arrive with a code to trade for a session.
  // Password sign-in already has one, so a missing code is not an error.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // The exchange needs a verifier stored by the browser that signed up,
      // so it fails when the confirmation email is opened on another device.
      // A code only exists if the auth server already VERIFIED the link, so
      // the email is confirmed -- the person just has to sign in here.
      return backToSignIn("confirmed");
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
