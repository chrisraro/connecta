import { expect, test } from "vitest";
import { contrastRatio, meetsAA, HERALD } from "./brand";

test("contrastRatio computes the WCAG ratio for black on white", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
});

test("contrastRatio is symmetric", () => {
  const a = contrastRatio("#705838", "#fbf9f4");
  const b = contrastRatio("#fbf9f4", "#705838");
  expect(a).toBeCloseTo(b, 5);
});

test("meetsAA rejects a low-contrast muted gray on near-white", () => {
  expect(meetsAA("#a8a29e", "#fbf9f4")).toBe(false);
});

test("meetsAA accepts body-safe ink on near-white", () => {
  expect(meetsAA("#2a2724", "#fbf9f4")).toBe(true);
});

test("meetsAA is more permissive for large text", () => {
  expect(meetsAA("#8a8178", "#fbf9f4", true)).toBe(true);
  expect(meetsAA("#8a8178", "#fbf9f4", false)).toBe(false);
});

test("HERALD brand constant carries the product name", () => {
  expect(HERALD.name).toBe("Herald");
});
