import { SheetPicker } from "@/components/profile-builder/StylePickers";

/**
 * Step 6 (skippable): choose the profile style. The picker is the
 * builder's own (components/profile-builder/StylePickers.tsx).
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
      <SheetPicker selected={selectedTemplateId} allowedTemplateIds={allowedTemplateIds} onSelect={onSelect} />
    </div>
  );
}
