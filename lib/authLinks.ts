/*
 * Links between the auth pages (B10, 2026-09-27). Middleware sends a
 * signed-out visitor to /auth?redirect=<path>; the path now rides through
 * sign-in and the tab switch to /auth/callback, which lands them there.
 */

/** A same-origin app path to return to, or null. Never /auth itself. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw === "/auth" || raw.startsWith("/auth/") || raw.startsWith("/auth?")) return null;
  return raw;
}

type AuthContext = { cardUuid?: string | null; redirect?: string | null };

function query(ctx: AuthContext): URLSearchParams {
  const q = new URLSearchParams();
  if (ctx.cardUuid) q.set("card_uuid", ctx.cardUuid);
  const back = safeReturnPath(ctx.redirect);
  if (back) q.set("redirect", back);
  return q;
}

/** Where sign-in and sign-up hand off to. */
export function authCallbackUrl(ctx: AuthContext): string {
  const q = query(ctx).toString();
  return q ? `/auth/callback?${q}` : "/auth/callback";
}

/** The Sign In / Create Account tab links, keeping the card and return path. */
export function authModeUrl(mode: "signin" | "signup", ctx: AuthContext): string {
  const rest = query(ctx).toString();
  return `/auth?mode=${mode}${rest ? `&${rest}` : ""}`;
}
