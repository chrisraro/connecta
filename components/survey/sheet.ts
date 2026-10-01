import type { CSSProperties } from "react";

/**
 * The three sheets of the Survey Plan world.
 *
 * A profile's template id (editorial / kinetic / architectural) is kept as
 * the stored value, so plan gating (kinetic is Pro) and every saved profile
 * keep working. What each id selects is now a sheet colourway inside one
 * visual world rather than a separate design.
 *
 * Every text colour here was checked against its own ground for WCAG AA:
 * `ink` and `soft` for body text, `markText` for the small red labels.
 * `mark` is for graphics only (the brand mark's dot, status tags, focus),
 * which need 3:1, not 4.5:1.
 */
export type SheetId = "whiteprint" | "blueprint" | "graphite";

export interface Sheet {
  id: SheetId;
  ground: string;
  ink: string;
  soft: string;
  line: string;
  mark: string;
  markText: string;
  actionBg: string;
  actionInk: string;
  /** Portraits print in one ink: shadows take this colour, highlights stay paper. */
  duotone: string;
}

export const SHEETS: Record<SheetId, Sheet> = {
  whiteprint: {
    id: "whiteprint",
    ground: "#EEF1F4",
    ink: "#12161F",
    soft: "#4A5468",
    line: "#2B3F8F",
    mark: "#D0312D",
    markText: "#C42A26",
    actionBg: "#2B3F8F",
    actionInk: "#EEF1F4",
    duotone: "#2B3F8F",
  },
  blueprint: {
    id: "blueprint",
    ground: "#2B3F8F",
    ink: "#F4F6FA",
    soft: "#C9D3F2",
    line: "#EEF1F4",
    mark: "#FF5A52",
    markText: "#FFB3AD",
    actionBg: "#EEF1F4",
    actionInk: "#1F2F6E",
    duotone: "#1A2860",
  },
  graphite: {
    id: "graphite",
    ground: "#12161F",
    ink: "#EEF1F4",
    soft: "#A7B0C0",
    line: "#8FA3E0",
    mark: "#FF5A52",
    markText: "#FF7A73",
    actionBg: "#EEF1F4",
    actionInk: "#12161F",
    duotone: "#1C2A5E",
  },
};

const SHEET_BY_TEMPLATE: Record<string, SheetId> = {
  editorial: "whiteprint",
  kinetic: "blueprint",
  architectural: "graphite",
};

export function sheetFor(templateId: string | undefined): Sheet {
  return SHEETS[SHEET_BY_TEMPLATE[templateId ?? ""] ?? "whiteprint"];
}

/** The sheet's colours as the --sv-* custom properties survey.module.css reads. */
export function sheetVars(sheet: Sheet): CSSProperties {
  return {
    "--sv-ground": sheet.ground,
    "--sv-ink": sheet.ink,
    "--sv-soft": sheet.soft,
    "--sv-line": sheet.line,
    "--sv-mark": sheet.mark,
    "--sv-mark-text": sheet.markText,
    "--sv-action-bg": sheet.actionBg,
    "--sv-action-ink": sheet.actionInk,
    "--sv-duotone": sheet.duotone,
  } as CSSProperties;
}
