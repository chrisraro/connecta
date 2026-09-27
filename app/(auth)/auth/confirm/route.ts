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
 * that asked for it. Only recovery links are handled here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");

  if (!tokenHash || searchParams.get("type") !== "recovery") {
    return NextResponse.redirect(new URL(RESET_LINK_INVALID, origin));
  }

  const supabase = await createClient();
  return recoveryRedirect(origin, async () => {
    const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    return error ? null : (data.user?.id ?? null);
  });
}
