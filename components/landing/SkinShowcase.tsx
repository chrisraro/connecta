"use client";

import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { cardSkin, type CardSkinId } from "@/lib/cardSkins";
import { CardMock } from "./CardMock";
import { PERSONAS, type Industry } from "./IndustryDemo";

/**
 * Each skin worn by one demo persona, on the real card (portrait view, the
 * one with the photo), in picker order: free Charcoal first.
 */
export const SHOWCASE: { skin: CardSkinId; persona: Industry }[] = [
  { skin: "charcoal", persona: "pro" },
  { skin: "scarlet", persona: "shop" },
  { skin: "crimson", persona: "realtor" },
  { skin: "gradient", persona: "student" },
];

export function SkinShowcase() {
  return (
    <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {SHOWCASE.map(({ skin, persona }) => {
        const p = PERSONAS[persona];
        return (
          <li key={skin}>
            <CardMock className="mx-auto max-w-[260px]">
              <DigitalBusinessCard
                fullName={p.name}
                title={p.title}
                company={p.company}
                phone=""
                email=""
                avatarUrl={p.photo}
                config={{ skin }}
                orientation="portrait"
              />
            </CardMock>
            <p className="mt-4 text-center text-[16px] font-bold">{cardSkin(skin).label}</p>
          </li>
        );
      })}
    </ul>
  );
}
