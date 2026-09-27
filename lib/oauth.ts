/**
 * Google sign-in (2026-09-27). Supabase's Google provider returns to the
 * app's own /auth/callback, tagged provider=google, so the callback can tell
 * a cancelled Google sign-in apart from an expired email link.
 */

const CALLBACK = "/auth/callback";

/**
 * The absolute return URL for signInWithOAuth. `callbackPath` is the auth
 * page's same-origin callback (carrying card_uuid when a card was tapped);
 * anything that isn't a same-origin callback path falls back to the plain
 * callback, so the redirect never leaves the site.
 */
export function googleRedirectTo(origin: string, callbackPath: string): string {
  const safe = callbackPath.startsWith(CALLBACK) ? callbackPath : CALLBACK;
  const url = new URL(safe, origin);
  if (url.origin !== new URL(origin).origin || url.pathname !== CALLBACK) {
    return `${origin}${CALLBACK}?provider=google`;
  }
  url.searchParams.set("provider", "google");
  return url.toString();
}

/** The /auth notice for an auth-server error on the callback. */
export function authErrorNotice(params: URLSearchParams): "oauth_failed" | "link_invalid" {
  return params.get("provider") === "google" ? "oauth_failed" : "link_invalid";
}
