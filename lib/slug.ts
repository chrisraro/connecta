/** Route segments a profile slug may never occupy. */
const RESERVED = new Set([
  "p",
  "t",
  "api",
  "auth",
  "sign-in",
  "sign-up",
  "dashboard",
  "admin",
  "shop",
  "privacy",
  "terms",
  "pricing",
  "about",
  "contact",
  "support",
  "blog",
  "docs",
  "_next",
  "favicon.ico",
  "opengraph-image",
  "robots.txt",
  "sitemap.xml",
]);

export function isReservedSlug(candidate: string): boolean {
  return RESERVED.has(candidate.toLowerCase());
}

const MAX_LEN = 48;

const COMBINING_DIACRITICS = /[̀-ͯ]/g;
// Straight and curly apostrophes are dropped outright (so "O'Brien" -> "obrien")
// rather than treated as a word separator like other punctuation.
const APOSTROPHES = /['‘’]/g;

export function slugify(input: string, suffix?: string): string {
  const base = input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const core = base || "profile";
  const withSuffix = suffix ? `${core}-${suffix}` : core;
  return withSuffix.slice(0, MAX_LEN).replace(/-+$/g, "");
}
