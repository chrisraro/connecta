import { expect, test } from "vitest";
import { hasUnsavedChanges } from "./hasUnsavedChanges";

test("returns false when snapshots are identical", () => {
  const snap = { fullName: "Jane", title: "Designer" };
  expect(hasUnsavedChanges(snap, { ...snap })).toBe(false);
});

test("returns true when a field changed", () => {
  const original = { fullName: "Jane", title: "Designer" };
  const current = { fullName: "Jane", title: "Senior Designer" };
  expect(hasUnsavedChanges(original, current)).toBe(true);
});

test("returns true when a field was added", () => {
  const original = { fullName: "Jane" };
  const current = { fullName: "Jane", title: "Designer" };
  expect(hasUnsavedChanges(original, current)).toBe(true);
});
