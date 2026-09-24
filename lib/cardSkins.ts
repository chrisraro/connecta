import type { Enums } from "@/lib/supabase/database.types";

export type CardSkinId = Enums<"card_skin">;

export interface CardSkin {
  id: CardSkinId;
  label: string;
  intent: string;
  /** CSS background for the picker swatch and the card front. */
  swatch: string;
  /** Primary text on the card. */
  textColor: string;
  /** Secondary text (role, company, contacts). */
  softColor: string;
  /** The lot mark and the drawn boundary. */
  lineColor: string;
  /** The mark's point of beginning. */
  dotColor: string;
  /**
   * Split skins: two grounds. `primary` is the dark ground the swatch starts
   * with; `ground` is the second, light ground with its own `ink` and
   * `line`. Landscape splits left/right, portrait splits top/bottom.
   * Undefined for single-ground skins.
   */
  split?: { primary: string; ground: string; ink: string; soft: string; line: string };
}

/**
 * The four card skins in the Survey Plan identity (2026-09-24), one source
 * for the homepage card faces, the builder picker and the digital card, so
 * print and screen cannot drift. The enum ids are a schema constraint
 * (card_skin); only the artwork changed.
 *
 * Plan access (confirmed 2026-09-24): the default skin is free; every other
 * skin is subscription-only, as a digital card as well as in print
 * (lib/plans.ts allowedCardSkins). Portrait versions and more skins and
 * colourways are planned; see PRODUCT.md. Every skin renders in both the
 * landscape and portrait orientation (components/ui/digital-business-card.tsx).
 */
export const CARD_SKINS: CardSkin[] = [
  {
    id: "charcoal",
    label: "Charcoal",
    intent: "The default: quietly premium",
    swatch: "#1B1E24",
    textColor: "#EEF1F4",
    softColor: "#A7B0C0",
    lineColor: "#EEF1F4",
    dotColor: "#FF5A52",
  },
  {
    id: "scarlet",
    label: "Scarlet",
    intent: "The brand red, front and centre",
    swatch: "#D0312D",
    textColor: "#FFFFFF",
    softColor: "#FFE1DE",
    lineColor: "#FFFFFF",
    dotColor: "#12161F",
  },
  {
    id: "crimson",
    label: "Crimson",
    intent: "A minimalist split",
    swatch: "linear-gradient(90deg, #7A1420 0 50%, #EEF1F4 50% 100%)",
    textColor: "#FFFFFF",
    softColor: "#F2C9CE",
    lineColor: "#FFFFFF",
    dotColor: "#FF5A52",
    split: { primary: "#7A1420", ground: "#EEF1F4", ink: "#12161F", soft: "#4A5468", line: "#2B3F8F" },
  },
  {
    id: "gradient",
    label: "Plan Blue",
    intent: "Plan blue into drafting ink",
    swatch: "linear-gradient(135deg, #2B3F8F 0%, #12161F 100%)",
    textColor: "#EEF1F4",
    softColor: "#C9D3F2",
    lineColor: "#EEF1F4",
    dotColor: "#FF5A52",
  },
];

export const DEFAULT_CARD_SKIN: CardSkinId = "charcoal";

export function cardSkin(id: CardSkinId | null | undefined): CardSkin {
  return CARD_SKINS.find((s) => s.id === id) ?? CARD_SKINS[0];
}
