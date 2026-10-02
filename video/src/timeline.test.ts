import { expect, test } from "vitest";
import { BEATS, FPS, TOTAL_FRAMES, beat } from "./timeline";

test("beats run back to back from frame 0", () => {
  let next = 0;
  for (const b of BEATS) {
    expect(b.from).toBe(next);
    next = b.from + b.frames;
  }
  expect(next).toBe(TOTAL_FRAMES);
});

test("the story is 36 seconds ± 1, in the spec's order", () => {
  expect(Math.abs(TOTAL_FRAMES / FPS - 36)).toBeLessThanOrEqual(1);
  expect(BEATS.map((b) => b.id)).toEqual(["hook", "tap", "profile", "leads", "personas", "cta"]);
  expect(beat("profile")).toEqual({ from: 8 * FPS, frames: 8 * FPS });
});
