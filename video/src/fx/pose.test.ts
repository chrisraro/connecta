import { expect, test } from "vitest";
import { settle, wordStarts, type Pose } from "./pose";

const FROM: Pose = { rx: 18, ry: -14, z: -240, x: 120, y: -200 };
const TO: Pose = { rx: 0, ry: 0, z: 0, x: 0, y: 0 };
const KEYS = ["rx", "ry", "z", "x", "y"] as const;

test("settle stays between from and to on every field for frames 0-120 (no overshoot)", () => {
  for (const start of [0, 20]) {
    for (let f = 0; f <= 120; f++) {
      const p = settle(f, FROM, TO, start, 30);
      for (const k of KEYS) {
        const lo = Math.min(FROM[k], TO[k]);
        const hi = Math.max(FROM[k], TO[k]);
        expect(p[k], `${k} @ ${f}`).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(p[k], `${k} @ ${f}`).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  }
});

test("settle holds the start pose before start and equals the target by start + 45", () => {
  expect(settle(0, FROM, TO, 20, 30)).toEqual(FROM);
  expect(settle(20, FROM, TO, 20, 30)).toEqual(FROM);
  for (const f of [65, 66, 100, 120]) expect(settle(f, FROM, TO, 20, 30)).toEqual(TO);
});

test("settle moves monotonically toward the target", () => {
  let prev = settle(0, FROM, TO, 0, 30).rx;
  for (let f = 1; f <= 60; f++) {
    const cur = settle(f, FROM, TO, 0, 30).rx;
    expect(cur).toBeLessThanOrEqual(prev + 1e-9);
    prev = cur;
  }
});

test("wordStarts gives one strictly increasing start per word, spaced by the stagger", () => {
  const s = wordStarts("Your profile opens. Instantly.", 15);
  expect(s).toEqual([15, 19, 23, 27]);
  expect(wordStarts("Tap once.", 10, 6)).toEqual([10, 16]);
  expect(wordStarts("  spaced   out  ", 0)).toEqual([0, 4]);
});
