import { meetsAA, relativeLuminance, mixHex } from "@/lib/brand";

export const TEMPLATE_IDS = ["editorial", "kinetic", "architectural"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** How a template composes space — this is what makes templates distinct.
 *  Colour alone produces one design in three costumes. */
export interface TemplateComposition {
  /** Hero architecture. */
  hero: "editorial-stack" | "full-bleed-portrait" | "structured-split";
  /** Content measure. narrow ≈ 448px, wide ≈ 640px, full = edge-to-edge. */
  measure: "narrow" | "wide" | "full";
  /** Vertical rhythm between sections. */
  rhythm: "tight" | "generous" | "cinematic";
  /** How section boundaries read. */
  rule: "none" | "hairline" | "numbered";
  /** Whether section headings sit above content or beside it. */
  headingPlacement: "above" | "beside";
  /** Image treatment for galleries/projects. */
  imagery: "inset" | "bleed" | "masonry";
}

export interface TemplateColors {
  background: string;
  surface: string;
  ink: string;
  inkSoft: string;
  accent: string;
  line: string;
}

export interface TemplateFontVars {
  /** CSS var name from lib/fonts.ts — MUST be a face that is actually loaded. */
  display: string;
  body: string;
}

export interface TemplateTheme {
  id: TemplateId;
  name: string;
  description: string;
  colors: TemplateColors;
  fontVars: TemplateFontVars;
  composition: TemplateComposition;
}

export const TEMPLATE_THEMES: Record<TemplateId, TemplateTheme> = {
  editorial: {
    id: "editorial",
    name: "Editorial",
    description:
      "Magazine typography, generous measure, imagery that breaks the column. For writers, consultants and photographers.",
    colors: {
      background: "#fbf9f4",
      surface: "#f3f0e9",
      ink: "#1f1d18",
      inkSoft: "#5b564c",
      accent: "#7a5c34",
      line: "#ddd6c9",
    },
    fontVars: { display: "--font-tpl-editorial", body: "--font-body" },
    composition: {
      hero: "editorial-stack",
      measure: "wide",
      rhythm: "cinematic",
      rule: "hairline",
      headingPlacement: "beside",
      imagery: "bleed",
    },
  },
  kinetic: {
    id: "kinetic",
    name: "Kinetic",
    description:
      "Dark, oversized type, edge-to-edge sections with scroll-linked entrances. For developers and studios.",
    colors: {
      background: "#0e0e10",
      surface: "#17171a",
      ink: "#f2f0ee",
      inkSoft: "#a9a5a0",
      accent: "#c9a227",
      line: "#2a2a2f",
    },
    fontVars: { display: "--font-tpl-kinetic", body: "--font-body" },
    composition: {
      hero: "full-bleed-portrait",
      measure: "full",
      rhythm: "tight",
      rule: "numbered",
      headingPlacement: "above",
      imagery: "masonry",
    },
  },
  architectural: {
    id: "architectural",
    name: "Architectural",
    description:
      "Strict modular grid, visible structure, disciplined negative space. For executives and firms.",
    colors: {
      background: "#f7f8f9",
      surface: "#ffffff",
      ink: "#16191c",
      inkSoft: "#535a61",
      accent: "#1f3d5c",
      line: "#dfe3e7",
    },
    fontVars: { display: "--font-tpl-architectural", body: "--font-body" },
    composition: {
      hero: "structured-split",
      measure: "narrow",
      rhythm: "generous",
      rule: "none",
      headingPlacement: "above",
      imagery: "inset",
    },
  },
};

export interface UserPalette {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

// Beyond this absolute difference in relative luminance (0-1 scale), a
// user's background is considered a materially different tone from the
// template default — e.g. swapping a light template to a dark background.
// Past that point the template's preset `surface`/`line` (tuned for the
// default background) are stale and must be re-derived.
const MATERIAL_LUMINANCE_SHIFT = 0.3;

/**
 * Merge a user's saved palette over a template's defaults. Composition is
 * never user-overridable — that's the template's identity. Contrast is
 * repaired: if the user's text colour fails AA against their background,
 * we fall back to the template's ink rather than shipping unreadable text
 * on someone's business card.
 *
 * `surface`/`line` are reconciled against the resolved background too —
 * six sections (About, TechStack, Experience, Testimonials, Products,
 * Contact) render directly on `surface`, not `background`, so a stale
 * light `surface` under a user-chosen dark background would otherwise
 * silently break readability even though `background`/`ink` look fine.
 */
export function resolveTheme(
  templateId: string,
  palette: UserPalette | undefined
): TemplateTheme {
  const base =
    TEMPLATE_THEMES[(templateId as TemplateId)] ?? TEMPLATE_THEMES.editorial;
  if (!palette) return base;

  const background = palette.backgroundColor || base.colors.background;
  const requestedInk = palette.textColor || base.colors.ink;
  const ink = meetsAA(requestedInk, background) ? requestedInk : base.colors.ink;

  // Has the user's background moved far enough from the template default
  // that the preset surface/line (tuned for that default) no longer apply?
  const backgroundShifted =
    Math.abs(relativeLuminance(background) - relativeLuminance(base.colors.background)) >
    MATERIAL_LUMINANCE_SHIFT;

  // Derive fresh surface/line from the resolved background — a slight
  // step toward `ink` — rather than keep the stale template value.
  const surface = backgroundShifted ? mixHex(background, ink, 0.08) : base.colors.surface;
  const line = backgroundShifted ? mixHex(background, ink, 0.16) : base.colors.line;

  // inkSoft must clear AA against BOTH background and surface — falling
  // back to the (already AA-safe) `ink` if either check fails.
  let inkSoft = meetsAA(base.colors.inkSoft, background) ? base.colors.inkSoft : ink;
  if (!meetsAA(inkSoft, surface)) inkSoft = ink;

  return {
    ...base,
    colors: {
      ...base.colors,
      background,
      surface,
      line,
      ink,
      inkSoft,
      accent: palette.primaryColor || base.colors.accent,
    },
  };
}
