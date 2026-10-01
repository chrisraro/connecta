import type { ReactNode } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { TEMPLATES } from "@/components/templates/registry";
import { sheetFor } from "@/components/survey/sheet";
import { CardFace } from "@/components/landing/Phone";
import { UpgradeGate } from "@/components/billing/UpgradeGate";
import { CARD_SKINS, type CardSkinId } from "@/lib/cardSkins";
import { isCardSkinLocked, isTemplateLocked } from "@/lib/plans";

/**
 * The profile-style and card-skin pickers, shared by the builder and the
 * onboarding wizard (2026-10-01) so the same choice looks the same in both.
 * Free options come first (lib/plans.test.ts "picker order").
 *
 * `upgradeCta`: the builder layers the "Get Lead tools" call to action over
 * a locked tile. Onboarding leaves it off: the CTA leaves for Billing, and
 * the wizard has its own Plan step.
 */

function Tile({
  locked,
  selected,
  onSelect,
  art,
  name,
  note,
}: {
  locked: boolean;
  selected: boolean;
  onSelect: () => void;
  art: ReactNode;
  name: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => !locked && onSelect()}
      disabled={locked}
      aria-disabled={locked}
      aria-pressed={selected}
      className={`relative flex w-full flex-col overflow-hidden border-[1.5px] text-left transition-colors ${
        selected
          ? "border-input outline-2 outline-offset-2 outline-ring"
          : locked
            ? "cursor-default border-border"
            : "border-border hover:border-input"
      }`}
    >
      <span aria-hidden="true" className={`relative block ${locked ? "opacity-60" : ""}`}>
        {art}
        {selected && (
          <CheckCircle2
            className="absolute right-1.5 top-1.5 h-4 w-4 text-primary"
            style={{ filter: "drop-shadow(0 0 1px white)" }}
          />
        )}
      </span>
      <span className="block border-t-[1.5px] border-inherit bg-background px-2.5 py-2">
        <span className="block truncate text-sm font-bold">{name}</span>
        {locked ? (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Lead tools
          </span>
        ) : (
          note && <span className="block truncate text-[13px] text-muted-foreground">{note}</span>
        )}
      </span>
    </button>
  );
}

function Gate({ on, locked, reason, children }: { on: boolean; locked: boolean; reason: string; children: ReactNode }) {
  return on ? (
    <UpgradeGate locked={locked} reason={reason} variant="overlay" className="">
      {children}
    </UpgradeGate>
  ) : (
    <>{children}</>
  );
}

export function SheetPicker({
  selected,
  allowedTemplateIds,
  onSelect,
  upgradeCta = false,
}: {
  selected: string;
  /** null = no restriction (paid plans, or the plan has not loaded yet). */
  allowedTemplateIds: string[] | null;
  onSelect: (templateId: string) => void;
  upgradeCta?: boolean;
}) {
  return (
    // Two columns until sm: three put each tile near 72px on a 320px phone
    // and cut the names short.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {TEMPLATES.map((template) => {
        const sheet = sheetFor(template.id);
        const locked = isTemplateLocked(template.id, allowedTemplateIds);
        return (
          <Gate key={template.id} on={upgradeCta} locked={locked} reason="This style is available on Lead tools & Teams.">
            <Tile
              locked={locked}
              selected={selected === template.id}
              onSelect={() => onSelect(template.id)}
              name={sheet.id.charAt(0).toUpperCase() + sheet.id.slice(1)}
              art={
                // The sheet itself: its ground, a lot in its line colour and
                // the red point of beginning.
                <span className="relative block aspect-[4/3]" style={{ backgroundColor: sheet.ground }}>
                  <svg viewBox="0 0 60 45" className="absolute inset-0 h-full w-full">
                    <path d="M14 10 H40 L48 18 V35 H14 Z" fill="none" stroke={sheet.line} strokeWidth="1.5" />
                    <circle cx="44" cy="31" r="2" fill={sheet.mark} />
                  </svg>
                </span>
              }
            />
          </Gate>
        );
      })}
    </div>
  );
}

export function CardSkinPicker({
  selected,
  allowedSkins,
  onSelect,
  upgradeCta = false,
}: {
  selected: CardSkinId;
  /** null = no restriction. */
  allowedSkins: CardSkinId[] | null;
  onSelect: (skin: CardSkinId) => void;
  upgradeCta?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CARD_SKINS.map((skin) => {
        const locked = isCardSkinLocked(skin.id, allowedSkins);
        return (
          <Gate key={skin.id} on={upgradeCta} locked={locked} reason="This skin is available on Lead tools & Teams.">
            <Tile
              locked={locked}
              selected={selected === skin.id}
              onSelect={() => onSelect(skin.id)}
              name={skin.label}
              note={skin.intent}
              art={
                <span className="block p-2">
                  <CardFace skin={skin.id} className="w-full" />
                </span>
              }
            />
          </Gate>
        );
      })}
    </div>
  );
}
