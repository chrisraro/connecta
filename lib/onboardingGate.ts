/**
 * Onboarding is the first screen (owner decision, 2026-09-27).
 *
 * Middleware sends any signed-in account that hasn't finished onboarding to
 * /dashboard/onboarding before any other dashboard page, however they
 * arrived: sign-up, the email confirmation link, Google, password sign-in
 * (which never passes through /auth/callback) or an invite link. Admins are
 * exempt. /dashboard/onboarding itself (including ?edit=true and a tapped
 * card's ?card_uuid=) is never redirected.
 *
 * A finished account gets a cookie naming its user id, so the database is
 * only asked until the answer is yes. The cookie is a shortcut, not a
 * security boundary: faking it only skips a nudge towards your own setup.
 */

export const ONBOARDING_PATH = "/dashboard/onboarding";
export const ONBOARDED_COOKIE = "connecta_onboarded";

export function needsOnboardingCheck(pathname: string): boolean {
  const inDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const inOnboarding = pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
  return inDashboard && !inOnboarding;
}

export function onboardingRedirect({ onboarded, isAdmin }: { onboarded: boolean; isAdmin: boolean }): string | null {
  return onboarded || isAdmin ? null : ONBOARDING_PATH;
}

export const onboardedMarker = {
  value: (userId: string) => `1.${userId}`,
  matches: (cookie: string | undefined, userId: string) => cookie === `1.${userId}`,
};
