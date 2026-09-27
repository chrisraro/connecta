import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESET_LINK_INVALID } from "@/lib/authRecovery";
import { recoveryRedirect } from "@/lib/recoveryResponse";

/**
 * Password reset links from the "Reset password" email template:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 *
 * Unlike the default PKCE link, a token hash needs nothing stored in the
 * browser, so the email can be opened on a different device from the one
 * that asked for it.
 *
 * Team invites (owner decision, 2026-09-27) use the same token-hash shape,
 * with type=invite. The Supabase dashboard's "Invite user" email template
 * must be set to:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
 *
 * (its default uses {{ .ConfirmationURL }} against /auth/callback instead --
 * that still works since app/(auth)/auth/callback/route.ts exchanges a code
 * the same way it does for sign-up, but only on the device that received the
 * invite; the token-hash link works from any device, matching recovery).
 * verifyOtp signs the new account in with no password set; onboarding is
 * their landing page and offers to set one, which is a later piece of work.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!tokenHash || (type !== "recovery" && type !== "invite")) {
    return NextResponse.redirect(new URL(RESET_LINK_INVALID, origin));
  }

  const supabase = await createClient();

  if (type === "invite") {
    const { data, error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
    if (error || !data.user) {
      const invalid = new URL("/auth", origin);
      invalid.searchParams.set("mode", "signin");
      invalid.searchParams.set("notice", "link_invalid");
      return NextResponse.redirect(invalid);
    }
    return NextResponse.redirect(new URL("/dashboard/onboarding", origin));
  }

  return recoveryRedirect(origin, async () => {
    const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    return error ? null : (data.user?.id ?? null);
  });
}
