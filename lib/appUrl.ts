/**
 * The app's public origin (`https://host[:port]`) from a
 * NEXT_PUBLIC_APP_URL-shaped value, or null when it is empty or unusable.
 *
 * Tolerant on purpose: Vercel's environment UI happily stores a bare host
 * like `connectaph.vercel.app`, and `new URL()` throws on that, which once
 * failed the production build in app/layout.tsx's metadataBase. A missing
 * scheme is read as https. Only http(s) origins are returned.
 *
 * Not for NFC tags: lib/nfcHost.ts stays strict because a wrong host burned
 * onto a physical card cannot be fixed later.
 */
export function appOrigin(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
