/**
 * Password reset (B5, 2026-09-25).
 *
 * Flow: "Forgot password?" on sign-in -> /auth?mode=forgot sends the email
 * -> the link lands on /auth/confirm (token_hash, any device) or
 * /auth/callback?flow=recovery (PKCE code, same browser only) -> both verify
 * it, set a recovery pass (lib/recoveryPass) and open /auth/update-password
 * -> POST /api/auth/update-password saves the new password, signs out every
 * other session and clears the pass.
 */

export const UPDATE_PASSWORD_PATH = "/auth/update-password";
export const RESET_LINK_INVALID = "/auth?mode=forgot&notice=reset_link_invalid";

/** Where the reset email's default link returns to. */
export function resetRedirectTo(origin: string): string {
  return `${origin}/auth/callback?flow=recovery`;
}

const PROTECTED = ["/dashboard", "/admin", "/auth"];

/**
 * The middleware's rules for /auth paths and for a session that came through
 * a reset link: the redirect to send, or null to let the request through.
 * `recovering` means a valid recovery pass for this user (lib/recoveryPass).
 */
export function authRouteRedirect(
  pathname: string,
  { hasUser, recovering }: { hasUser: boolean; recovering: boolean },
): string | null {
  if (pathname === "/auth/callback" || pathname === "/auth/confirm") return null;
  if (pathname === UPDATE_PASSWORD_PATH) return recovering ? null : RESET_LINK_INVALID;
  // A reset link signs the person in. Until the new password is saved, keep
  // that session on this page: if the link was someone else's (sent to them
  // on purpose), they don't carry on working inside that account.
  if (recovering && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return UPDATE_PASSWORD_PATH;
  }
  if (pathname.startsWith("/auth/")) return "/auth";
  if (pathname === "/auth" && hasUser) return "/dashboard";
  return null;
}

// Supabase hashes with bcrypt, which ignores everything past 72 bytes.
const MAX_PASSWORD_BYTES = 72;

/** Why a new password can't be used, or null when it can. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "That password is too long. Keep it under 72 characters (fewer with accents or emoji).";
  }
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/**
 * The shared decision behind /auth/confirm and /auth/callback?flow=recovery:
 * `verify` checks the link and returns the user it signed in; `sign` issues
 * the recovery pass (null with no secret). Anything short of both succeeding
 * sends the person back to ask for a new link, with no pass.
 */
export async function completeRecovery(
  verify: () => Promise<string | null>,
  sign: (userId: string) => Promise<string | null>,
): Promise<{ location: string; pass: string | null }> {
  let userId: string | null = null;
  try {
    userId = await verify();
  } catch {
    userId = null;
  }
  const pass = userId ? await sign(userId) : null;
  return pass ? { location: UPDATE_PASSWORD_PATH, pass } : { location: RESET_LINK_INVALID, pass: null };
}

/** The Forgot password link, keeping a tapped card's id across the detour. */
export function forgotPasswordHref(cardUuid?: string): string {
  return cardUuid ? `/auth?mode=forgot&card_uuid=${encodeURIComponent(cardUuid)}` : "/auth?mode=forgot";
}

// Reachable without a session at all, so a reset session gains nothing there.
const OPEN_API = ["/api/health", "/api/webhooks"];

/**
 * While a reset session is contained on Set a new password, the API is too:
 * only the endpoint that saves the password answers, so the session can't
 * read or change the account's data by calling the API directly.
 */
export function recoveryApiBlocked(pathname: string, recovering: boolean): boolean {
  if (!recovering || !(pathname === "/api" || pathname.startsWith("/api/"))) return false;
  if (pathname === "/api/auth/update-password") return false;
  return !OPEN_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
