/**
 * Canonical link for a public profile.
 *
 * Every profile eventually has a vanity `slug` (assigned at creation, or
 * backfilled for legacy rows — see convex/profiles.ts), but call sites that
 * only have a bare id in scope (e.g. a card linked by uuid) may not have
 * loaded it yet. Centralizing the fallback here means every surface that
 * links to a profile stays in lockstep once a slug becomes available,
 * instead of re-deriving the same ternary independently.
 */
export interface ProfileLinkable {
  slug?: string | null;
  _id: string;
}

/** `/<slug>` when the profile has one, else the stable `/p/<id>` fallback. */
export function profilePath(profile: ProfileLinkable): string {
  return profile.slug ? `/${profile.slug}` : `/p/${profile._id}`;
}

/** Absolute URL: `origin` (trailing slash tolerated) + `profilePath`. */
export function profileUrl(origin: string, profile: ProfileLinkable): string {
  return `${origin.replace(/\/+$/, "")}${profilePath(profile)}`;
}
