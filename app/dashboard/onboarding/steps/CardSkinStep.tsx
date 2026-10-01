import { CardSkinPicker } from "@/components/profile-builder/StylePickers";
import type { CardSkinId } from "@/lib/cardSkins";
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
      <CardSkinPicker selected={selectedSkin} allowedSkins={allowedSkins} onSelect={onSelect} />
      <p className="text-[13px] text-muted-foreground">
        Your NFC card is ordered separately ({formatPeso(PRICING.card.prelaunch)} prelaunch).
      </p>
    </div>
  );
}
