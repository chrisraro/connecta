/**
 * Brand constants and contrast utilities for the current product name.
 *
 * The name is the product's promise in one word: a tap turns a stranger into
 * a connection. Every user-facing surface reads the name from CONNECTA below
 * rather than hardcoding it — lib/brand.test.ts fails the build the day a
 * bare string literal reappears in app/** or components/**.
 */

// No domain is owned yet — the product currently runs on a *.vercel.app
// deployment, with a .ph domain planned but not purchased. This literal is
// only a last-resort fallback for local/dev environments that never set
// NEXT_PUBLIC_APP_URL; it must never be treated as a live, reachable host.
const FALLBACK_DOMAIN = "connecta.example";

/** Bare host (no protocol/path) derived from a NEXT_PUBLIC_APP_URL-shaped value. */
function domainFromAppUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).host;
  } catch {
    // Tolerate a bare host with no protocol (e.g. "app.example.com").
    return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || undefined;
  }
}

/**
 * Builds the CONNECTA brand constant from env, defaulting to the literals
 * below. This product owns no domain yet — it runs on a `*.vercel.app`
 * deployment, with a `.ph` domain planned but not purchased — so every
 * customer-facing surface that needs a host (order-confirmation emails, the
 * OG image footer) must go through this instead of a hardcoded string: set
 * `NEXT_PUBLIC_APP_URL` (already used for payment redirect URLs) and/or
 * `SUPPORT_EMAIL` to override. Exported as a function (rather than only the
 * computed constant below) so tests can exercise it against arbitrary env
 * without reaching for module-reset tricks.
 */
export function buildConnecta(env: Record<string, string | undefined>) {
  const domain = domainFromAppUrl(env.NEXT_PUBLIC_APP_URL) || FALLBACK_DOMAIN;
  const supportEmail = env.SUPPORT_EMAIL?.trim() || `support@${domain}`;
  return {
    name: "Connecta",
    tagline: "tap.connect.grow.",
    domain,
    supportEmail,
  };
}

export const CONNECTA = buildConnecta(typeof process !== "undefined" ? process.env : {});

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let c = hex.trim().toLowerCase().replace(/^#/, "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-f]{6}$/.test(c)) return null;
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

/** Relative luminance (WCAG 2.1 definition), 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

/** WCAG 2.1 contrast ratio between two hex colors. Range 1–21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when fg on bg clears WCAG AA: 4.5:1 normal text, 3:1 large text. */
export function meetsAA(fg: string, bg: string, large = false): boolean {
  return contrastRatio(fg, bg) >= (large ? 3 : 4.5);
}

/** Linear-blend two hex colors: `t=0` returns `a`, `t=1` returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(lerp(ca.r, cb.r))}${toHex(lerp(ca.g, cb.g))}${toHex(lerp(ca.b, cb.b))}`;
}
