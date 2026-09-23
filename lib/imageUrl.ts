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
  // A root-relative app asset ("/marketing/demo-avatar.svg") or an inline
  // upload preview. Storage paths never start with "/" ("<user-uuid>/<file>"),
  // so these would otherwise become a storage URL for an object that doesn't
  // exist and render as a broken image.
  if (value.startsWith("/") || value.startsWith("data:") || value.startsWith("blob:")) return value;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${value
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const IMAGE_BUCKET = BUCKET;

/**
 * True when a URL points at our own public storage bucket.
 *
 * Next's image optimizer needs the host allow-listed in
 * next.config.ts images.remotePatterns, and rejects SVG. Both hold for URLs
 * this module built; neither is guaranteed for an arbitrary avatar URL from
 * an OAuth provider or for the Dicebear SVG fallback, so those must be
 * rendered unoptimized rather than throwing and taking the page down.
 */
export function isOwnStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  return url.startsWith(`${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`);
}
