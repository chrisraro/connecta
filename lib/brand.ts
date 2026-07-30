/**
 * Herald brand constants and contrast utilities.
 *
 * The name comes from the medieval herald, whose two duties map exactly onto
 * this product: formally announcing a person on arrival, and designing the
 * coat of arms that identified them.
 */

export const HERALD = {
  name: "Herald",
  tagline: "Announced properly.",
  domain: "herald.ph",
} as const;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let c = hex.trim().toLowerCase().replace(/^#/, "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-f]{6}$/.test(c)) return null;
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
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
