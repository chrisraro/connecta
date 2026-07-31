import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(path: string | undefined | null) {
  if (!path) return "";
  // If it's already a full URL, return as-is
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) return path;
  // For Convex storage IDs, we need to use the storage URL API
  // This will be resolved on the client side via the getImageUrl query
  return path;
}

// Relative luminance (sRGB -> linear), WCAG 2.1
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

// WCAG 2.1 contrast ratio between two relative luminances.
function contrastRatio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Returns a readable foreground color ("#ffffff" or "#0a0a0a") for text/icons
 * placed on top of an arbitrary background color, based on relative luminance
 * (WCAG sRGB formula). Used by public profile templates so a user-chosen light
 * palette color doesn't end up with invisible white-on-light text.
 *
 * Accepts #rgb / #rrggbb / rgb()/rgba() strings. Falls back to white for
 * unparseable / transparent inputs (preserves prior behavior).
 *
 * Picks whichever of `light`/`dark` yields the HIGHER contrast ratio against
 * the given background, rather than a fixed luminance midpoint. A fixed
 * midpoint (previously 0.4) is measurably wrong: for a mid-tone accent like
 * `#c9a227` (background luminance ~0.383, just under the old 0.4 cutoff),
 * white text was picked and only cleared 2.42:1 against it — nowhere near
 * WCAG AA's 4.5:1 — while black text on the same background clears 8.66:1.
 * The true crossover point (where black/white give equal contrast) is
 * background luminance ~0.179, not 0.4; computing both ratios directly
 * avoids having to re-derive and hardcode that constant, and stays correct
 * even when callers pass custom `light`/`dark` overrides.
 */
export function readableTextColor(
  color: string | undefined | null,
  options?: { light?: string; dark?: string }
): string {
  const light = options?.light ?? "#ffffff";
  const dark = options?.dark ?? "#0a0a0a";

  const rgb = parseColorToRgb(color);
  if (!rgb) return light;

  const bgL = relativeLuminance(rgb);
  const lightRgb = parseColorToRgb(light) ?? { r: 255, g: 255, b: 255 };
  const darkRgb = parseColorToRgb(dark) ?? { r: 10, g: 10, b: 10 };

  const lightContrast = contrastRatio(relativeLuminance(lightRgb), bgL);
  const darkContrast = contrastRatio(relativeLuminance(darkRgb), bgL);

  // Ties favor dark text (legibility bias, same as the prior implementation).
  return darkContrast >= lightContrast ? dark : light;
}

function parseColorToRgb(
  color: string | undefined | null
): { r: number; g: number; b: number } | null {
  if (!color) return null;
  let c = color.trim().toLowerCase();

  // rgb()/rgba()
  const rgbMatch = c.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
    return null;
  }

  // hex
  if (c.startsWith("#")) c = c.slice(1);
  if (c.length === 3) {
    c = c
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (c.length === 6 && /^[0-9a-f]{6}$/.test(c)) {
    return {
      r: parseInt(c.slice(0, 2), 16),
      g: parseInt(c.slice(2, 4), 16),
      b: parseInt(c.slice(4, 6), 16),
    };
  }
  return null;
}
