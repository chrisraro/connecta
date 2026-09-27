import { CheckCircle2 } from "lucide-react";
import { CardFace } from "@/components/landing/Phone";
import { CARD_SKINS, type CardSkinId } from "@/lib/cardSkins";
import { isCardSkinLocked } from "@/lib/plans";
import { PRICING, formatPeso } from "@/lib/pricing";

/**
 * Step 7 (skippable): card skin. Charcoal is free; every other skin is
 * subscription-only (lib/plans.ts isCardSkinLocked). The physical NFC card
 * itself is a separate, one-time purchase — never implied as part of the
 * plan or as instant checkout.
 */
export function CardSkinStep({
  selectedSkin,
  allowedSkins,
  onSelect,
}: {
  selectedSkin: CardSkinId;
  /** null = no restriction. */
  allowedSkins: CardSkinId[] | null;
  onSelect: (skin: CardSkinId) => void;
}) {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">Choose a card skin. You can change this later.</p>
      <div className="grid grid-cols-2 gap-3">
        {CARD_SKINS.map((skin) => {
          const locked = isCardSkinLocked(skin.id, allowedSkins);
          const isSelected = selectedSkin === skin.id;
          return (
            <button
              key={skin.id}
              type="button"
              onClick={() => !locked && onSelect(skin.id)}
              disabled={locked}
              aria-disabled={locked}
              aria-pressed={isSelected}
              className={`relative flex flex-col gap-2 border-[1.5px] p-2 text-left transition-colors ${
                isSelected
                  ? "border-input outline-2 outline-offset-2 outline-ring"
                  : locked
                    ? "cursor-default border-border opacity-60"
                    : "border-border hover:border-input"
              }`}
            >
              <CardFace skin={skin.id} className="w-full" />
              <span className="flex items-center justify-between text-sm font-bold">
                {skin.label}
                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {locked ? "Lead tools" : skin.intent}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Your NFC card is ordered separately ({formatPeso(PRICING.card.prelaunch)} prelaunch).
      </p>
    </div>
  );
}
