import { TemplateTheme } from "../theme";

/**
 * Grid class for a gallery/project image collection, driven by
 * `theme.composition.imagery`. This — not colour — is what makes Editorial's
 * imagery "break the column", Kinetic's feel like a scrapbook, and
 * Architectural's stay contained inside cards.
 */
export function galleryGridClass(theme: TemplateTheme): string {
  switch (theme.composition.imagery) {
    case "inset":
      return "grid grid-cols-3 gap-2";
    case "bleed":
      // Negative margin cancels the section's own px-6, letting the grid
      // run edge to edge — literally breaking the content column.
      return "grid grid-cols-2 gap-0.5 -mx-6";
    case "masonry":
      return "columns-2 gap-3";
  }
}

const MASONRY_ASPECTS = ["aspect-square", "aspect-[3/4]", "aspect-[4/5]", "aspect-square"];

/** Per-image class, including the aspect ratio variance masonry needs. */
export function galleryItemClass(theme: TemplateTheme, index: number): string {
  const radius = theme.composition.imagery === "bleed" ? "" : "rounded-[var(--r-sm)]";
  if (theme.composition.imagery === "masonry") {
    return `${radius} overflow-hidden mb-3 break-inside-avoid ${MASONRY_ASPECTS[index % MASONRY_ASPECTS.length]}`;
  }
  return `${radius} overflow-hidden aspect-square`;
}

/** Wrapper class for a project list — stacked column vs. a two-up grid.
 *  Uses `gap` (not `space-y`) so it composes cleanly with the per-card
 *  classes below without doubling up margins. */
export function projectListClass(theme: TemplateTheme): string {
  return theme.composition.imagery === "masonry"
    ? "columns-2 gap-4"
    : "flex flex-col gap-6";
}

/** Per-card class. Masonry cards carry their own bottom margin because CSS
 *  multi-column layout only applies `gap` between columns, not between
 *  stacked items within a column. */
export function projectCardClass(theme: TemplateTheme): string {
  const base = "overflow-hidden break-inside-avoid";
  switch (theme.composition.imagery) {
    case "inset":
      return `${base} rounded-[var(--r-lg)]`;
    case "bleed":
      return `${base} -mx-6 rounded-none`;
    case "masonry":
      return `${base} mb-4 rounded-[var(--r-sm)]`;
  }
}
