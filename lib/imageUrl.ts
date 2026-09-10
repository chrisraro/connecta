/**
 * Resolves a stored image reference to a URL a browser can load.
 *
 * Values in the database are one of three things, and all three predate or
 * survive the migration:
 *   - a Supabase Storage object path, "<user-uuid>/<file>.webp"
 *   - an absolute URL (avatars from an OAuth provider, seeded demo art)
 *   - empty
 *
 * The Convex version needed a QUERY for this -- getImageUrl, called at six
 * sites, each an async round trip that could load, fail, or return undefined,
 * and each needing its own spinner. The bucket is public, so the URL is a
 * pure string derivation: no request, no loading state, no failure mode.
 */
const BUCKET = "profile-images";

export function imageUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const value = pathOrUrl.trim();
  if (!value) return null;

  // Already absolute: an OAuth avatar or a seeded asset. Left alone.
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${value
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const IMAGE_BUCKET = BUCKET;
