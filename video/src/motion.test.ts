import { expect, test } from "vitest";
import { progress } from "./motion";

test("progress is 0 before, 1 after, and eases out in between", () => {
  expect(progress(0, 10, 20)).toBe(0);
  expect(progress(10, 10, 20)).toBe(0);
  expect(progress(30, 10, 20)).toBe(1);
  expect(progress(99, 10, 20)).toBe(1);
  const mid = progress(20, 10, 20);
  expect(mid).toBeGreaterThan(0.5); // ease-out: past half at the halfway frame
  expect(mid).toBeLessThan(1);
});

test("no move is shorter than 9 frames", () => {
  expect(() => progress(0, 0, 8)).toThrow(/at least 9 frames/);
});
