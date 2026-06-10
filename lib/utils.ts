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

/**
 * Returns a readable foreground color ("#ffffff" or "#0a0a0a") for text/icons
 * placed on top of an arbitrary background color, based on relative luminance
 * (WCAG sRGB formula). Used by public profile templates so a user-chosen light
 * palette color doesn't end up with invisible white-on-light text.
 *
 * Accepts #rgb / #rrggbb / rgb()/rgba() strings. Falls back to white for
 * unparseable / transparent inputs (preserves prior behavior).
 */
export function readableTextColor(
  color: string | undefined | null,
  options?: { light?: string; dark?: string }
): string {
  const light = options?.light ?? "#ffffff";
  const dark = options?.dark ?? "#0a0a0a";

  const rgb = parseColorToRgb(color);
  if (!rgb) return light;

  // Relative luminance (sRGB -> linear), WCAG 2.1
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L =
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b);

  // Threshold ~0.4 biases toward dark text on mid/light backgrounds for legibility.
  return L > 0.4 ? dark : light;
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
