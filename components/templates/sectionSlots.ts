/**
 * Pure numbering logic for ProfileRenderer's Kinetic-style `rule: "numbered"`
 * section tags — deliberately kept free of React/JSX so it's unit-testable
 * without rendering the profile tree.
 *
 * The bug this fixes: numbering used to be the section's position in
 * `componentOrder` (`order.map((id, i) => ...)`). That breaks in three ways:
 *  - a hidden/empty section still consumes a position, leaving a gap in the
 *    visible sequence (e.g. "02 About", "04 Education" with nothing shown
 *    as "03").
 *  - `CertificationSection` never displays a number (no `heading`), but its
 *    slot still consumed a position, offsetting everything after it.
 *  - the `Projects` componentOrder id fans out into two sibling sections
 *    (inline projects + regular projects) which both received the same
 *    `i`, so they could print the same tag.
 *
 * The fix: number off a render-time counter that only advances for slots
 * that (a) actually have content and (b) actually display a number.
 */
export interface SectionSlotSpec {
  /** The componentOrder id this slot was produced from (informational). */
  id: string;
  /** Whether this slot has data to render at all. */
  hasContent: boolean;
  /**
   * Whether this slot displays a numbered tag when it renders. Default
   * true. Set false for slots that never show a number regardless of the
   * template's `rule` (e.g. Hero has no SectionShell heading at all;
   * CertificationSection renders without a `heading`) so they don't offset
   * the sequence for slots that do.
   */
  numbered?: boolean;
}

export interface ResolvedSectionSlot {
  id: string;
  /** This slot's position among same-id slots (e.g. Projects' 2 siblings). */
  slotIndex: number;
  /** The number to hand the section as its `index` prop. */
  index: number;
  numbered: boolean;
}

/**
 * Filters `specs` down to the ones that should render, in order, each
 * carrying the `index` it should be given. Hidden/empty slots are dropped
 * entirely and never advance the counter; unnumbered slots render but
 * don't advance it either, so the numbered slots that follow stay
 * sequential with no gaps.
 */
export function resolveSectionSlots(specs: SectionSlotSpec[]): ResolvedSectionSlot[] {
  const result: ResolvedSectionSlot[] = [];
  const slotCountById = new Map<string, number>();
  let counter = 0;

  for (const spec of specs) {
    const slotIndex = slotCountById.get(spec.id) ?? 0;
    slotCountById.set(spec.id, slotIndex + 1);

    if (!spec.hasContent) continue;

    const numbered = spec.numbered !== false;
    const index = counter;
    if (numbered) counter += 1;

    result.push({ id: spec.id, slotIndex, index, numbered });
  }

  return result;
}
