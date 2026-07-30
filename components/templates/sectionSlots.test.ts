import { expect, test } from "vitest";
import { resolveSectionSlots, SectionSlotSpec } from "./sectionSlots";

test("assigns sequential numbers with no gaps when a section in the middle has no content", () => {
  // Mirrors the default componentOrder shape: Hero and Certification never
  // display a number (Hero has no SectionShell heading at all; Certification
  // renders without a `heading`), Education is hidden/empty in this case.
  const specs: SectionSlotSpec[] = [
    { id: "Hero", hasContent: true, numbered: false },
    { id: "About", hasContent: true },
    { id: "Certification", hasContent: true, numbered: false },
    { id: "Education", hasContent: false },
    { id: "TechStack", hasContent: true },
    { id: "Contact", hasContent: true },
  ];

  const resolved = resolveSectionSlots(specs);
  const numberedIndices = resolved.filter((s) => s.numbered).map((s) => s.index);

  // About, TechStack, Contact are the only slots that show a number —
  // they must read 0,1,2 (displayed "01","02","03") with no gap, even
  // though Education (hidden) and Certification (unnumbered) sit between
  // them in componentOrder.
  expect(numberedIndices).toEqual([0, 1, 2]);
});

test("gives sibling slots produced by the same componentOrder id distinct numbers", () => {
  // The `Projects` componentOrder id fans out into two sibling sections
  // (inline projects + regular projects). Each must get its own number,
  // not the same one.
  const specs: SectionSlotSpec[] = [
    { id: "Projects", hasContent: true },
    { id: "Projects", hasContent: true },
  ];

  const resolved = resolveSectionSlots(specs);
  expect(resolved.map((s) => s.index)).toEqual([0, 1]);
});

test("skips hidden/empty sections entirely — they never consume a number or render", () => {
  const specs: SectionSlotSpec[] = [
    { id: "About", hasContent: false },
    { id: "TechStack", hasContent: true },
  ];

  const resolved = resolveSectionSlots(specs);
  expect(resolved).toEqual([{ id: "TechStack", slotIndex: 0, index: 0, numbered: true }]);
});

test("assigns each same-id slot its own sequential slotIndex regardless of rendering", () => {
  const specs: SectionSlotSpec[] = [
    { id: "Projects", hasContent: false },
    { id: "Projects", hasContent: true },
  ];

  const resolved = resolveSectionSlots(specs);
  expect(resolved).toEqual([{ id: "Projects", slotIndex: 1, index: 0, numbered: true }]);
});
