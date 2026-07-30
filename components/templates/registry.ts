// Template Registry — thin metadata derived from the theme descriptors in
// theme.ts, which is the single source of truth for name/description/colors.
import { TEMPLATE_IDS, TEMPLATE_THEMES } from "./theme";

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // Gradient preview swatch for the template picker
  fonts: {
    display: string;
    body: string;
  };
  defaultColors: {
    primary: string;
    background: string;
    text: string;
  };
  bestFor: string[];
}

const BEST_FOR: Record<string, string[]> = {
  editorial: ["Consultants", "Writers", "Designers", "Photographers"],
  kinetic: ["Developers", "Startups", "Tech leads", "Digital creators"],
  architectural: ["Executives", "Real estate", "Lawyers", "Finance professionals"],
};

export const TEMPLATES: TemplateMeta[] = TEMPLATE_IDS.map((id) => {
  const theme = TEMPLATE_THEMES[id];
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    thumbnail: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 50%, ${theme.colors.accent} 100%)`,
    fonts: {
      display: theme.name, // display face is loaded via CSS var; label kept human-readable here
      body: "Geist",
    },
    defaultColors: {
      primary: theme.colors.accent,
      background: theme.colors.background,
      text: theme.colors.ink,
    },
    bestFor: BEST_FOR[id] ?? [],
  };
});

// Get template metadata by ID
export function getTemplateMeta(id: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
