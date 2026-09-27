import { CheckCircle2 } from "lucide-react";
import { TEMPLATES } from "@/components/templates/registry";
import { sheetFor } from "@/components/survey/sheet";
import { isTemplateLocked } from "@/lib/plans";

/**
 * Step 6 (skippable): choose the profile sheet/template. A faithful mini
 * version of the builder's TemplateSelector (app/dashboard/builder/page.tsx)
 * — same swatch, without the builder's own state/UpgradeGate coupling.
 * Locked tiles name "Lead tools", the tier that unlocks them.
 */
export function StyleStep({
  selectedTemplateId,
  allowedTemplateIds,
  onSelect,
}: {
  selectedTemplateId: string;
  /** null = no restriction. */
  allowedTemplateIds: string[] | null;
  onSelect: (templateId: string) => void;
}) {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">Choose a profile style. You can change this later.</p>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map((template) => {
          const sheet = sheetFor(template.id);
          const locked = isTemplateLocked(template.id, allowedTemplateIds);
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => !locked && onSelect(template.id)}
              disabled={locked}
              aria-disabled={locked}
              aria-pressed={isSelected}
              className={`relative flex w-full flex-col overflow-hidden border-[1.5px] text-left transition-colors ${
                isSelected
                  ? "border-input outline-2 outline-offset-2 outline-ring"
                  : locked
                    ? "cursor-default border-border opacity-60"
                    : "border-border hover:border-input"
              }`}
            >
              <span
                aria-hidden="true"
                className="relative block aspect-[4/3]"
                style={{ backgroundColor: sheet.ground }}
              >
                <svg viewBox="0 0 60 45" className="absolute inset-0 h-full w-full">
                  <path d="M14 10 H40 L48 18 V35 H14 Z" fill="none" stroke={sheet.line} strokeWidth="1.5" />
                  <circle cx="44" cy="31" r="2" fill={sheet.mark} />
                </svg>
                {isSelected && (
                  <CheckCircle2
                    className="absolute right-1 top-1 h-4 w-4 text-primary"
                    aria-hidden="true"
                    style={{ filter: "drop-shadow(0 0 1px white)" }}
                  />
                )}
              </span>
              <span className="block border-t-[1.5px] border-inherit bg-background px-2.5 py-2">
                <span className="block truncate text-sm font-bold capitalize">{sheet.id}</span>
                {locked && <span className="block text-[11px] text-muted-foreground">Lead tools</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
