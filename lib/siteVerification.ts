/**
 * The site-verification meta tag for Google Search Console, from
 * GOOGLE_SITE_VERIFICATION. Proves ownership of the homepage for Google's
 * OAuth branding review; a *.vercel.app host can't take DNS records.
 * Accepts the bare token or the whole <meta> tag Search Console shows.
 */
export function siteVerification(raw: string | undefined): { google: string } | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const fromTag = value.match(/content=["']([^"']+)["']/)?.[1];
  const token = (fromTag ?? value).trim();
  return token ? { google: token } : undefined;
}
