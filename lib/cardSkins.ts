import type { Enums } from "@/lib/supabase/database.types";

export type CardSkinId = Enums<"card_skin">;

/**
 * The four card skins, per the 2026-08-31 design spec.
 *
 * A registry rather than scattered literals, mirroring the existing
 * components/templates/registry.ts pattern: one place defining each skin so
 * the on-screen card, the builder picker and the print spec cannot drift.
 *
 * These replaced the freeform designer wholesale. The product promise is
 * "look professional the instant somebody taps", and arbitrary colour pickers
 * let people produce cards that fail that promise. Four art-directed options
 * guarantee the outcome; custom colours can be rebuilt as a paid tier in about
 * a week if a paying customer asks, whereas a designer that lets people make
 * bad cards is hard to un-ship.
 */
export const CARD_SKINS: {
  id: CardSkinId;
  label: string;
  intent: string;
  /** CSS background for the picker swatch and the rendered card front. */
  swatch: string;
  textColor: string;
}[] = [
  {
    id: "charcoal",
    label: "Charcoal",
    intent: "Default, quietly premium",
    swatch: "#1e1e1e",
    textColor: "#ffffff",
  },
  {
    id: "scarlet",
    label: "Scarlet",
    intent: "Brand-forward front",
    swatch: "#c8102e",
    textColor: "#ffffff",
  },
  {
    id: "crimson",
    label: "Crimson",
    intent: "Minimalist split",
    swatch: "linear-gradient(90deg, #7d0a1b 0%, #7d0a1b 50%, #f5f5f5 50%, #f5f5f5 100%)",
    textColor: "#ffffff",
  },
  {
    id: "gradient",
    label: "Gradient",
    intent: "Subtle and sophisticated",
    swatch: "linear-gradient(135deg, #1e1e1e 0%, #c8102e 100%)",
    textColor: "#ffffff",
  },
];

export const DEFAULT_CARD_SKIN: CardSkinId = "charcoal";

export function cardSkin(id: CardSkinId | null | undefined) {
  return CARD_SKINS.find((s) => s.id === id) ?? CARD_SKINS[0];
}
