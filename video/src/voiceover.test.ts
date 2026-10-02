import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { BEATS, TOTAL_FRAMES } from "./timeline";
import { DUCK_GAIN, DUCK_RAMP, VO_LINES, duckAt } from "./voiceover";

const publicDir = path.resolve(__dirname, "../public");

test("there is one line per scene, in scene order", () => {
  expect(VO_LINES.map((l) => l.scene)).toEqual(BEATS.map((b) => b.id));
});

test("every line starts inside its scene and ends before the next cut", () => {
  VO_LINES.forEach((line, i) => {
    const scene = BEATS.find((b) => b.id === line.scene)!;
    const next = BEATS[BEATS.indexOf(scene) + 1];
    const limit = next ? next.from - 3 : TOTAL_FRAMES - 15;
    expect(line.from, line.id).toBeGreaterThanOrEqual(scene.from);
    expect(line.from + line.frames, line.id).toBeLessThanOrEqual(limit);
    if (i > 0) expect(line.from, line.id).toBeGreaterThanOrEqual(VO_LINES[i - 1].from + VO_LINES[i - 1].frames);
  });
});

test("lines start 6 frames after their cut, the hook at frame 9", () => {
  for (const line of VO_LINES) {
    const scene = BEATS.find((b) => b.id === line.scene)!;
    expect(line.from, line.id).toBe(line.scene === "hook" ? 9 : scene.from + 6);
  }
});

test("every voiceover file is served from video/public", () => {
  for (const line of VO_LINES) expect(existsSync(path.join(publicDir, line.file)), line.file).toBe(true);
});

test("duckAt is 1 outside speech, the duck gain inside, with smooth ramps", () => {
  const first = VO_LINES[0];
  expect(duckAt(0)).toBe(1);
  expect(duckAt(first.from - DUCK_RAMP - 1)).toBe(1);
  expect(duckAt(first.from + 1)).toBeCloseTo(DUCK_GAIN, 5);
  expect(duckAt(first.from + Math.floor(first.frames / 2))).toBeCloseTo(DUCK_GAIN, 5);
  expect(duckAt(TOTAL_FRAMES - 1)).toBe(1);
  // ramp in: strictly between the two levels, monotonic non-increasing
  let prev = 1;
  for (let f = first.from - DUCK_RAMP; f <= first.from; f++) {
    const g = duckAt(f);
    expect(g).toBeLessThanOrEqual(prev + 1e-9);
    prev = g;
  }
  expect(duckAt(first.from - DUCK_RAMP / 2)).toBeLessThan(1);
  expect(duckAt(first.from - DUCK_RAMP / 2)).toBeGreaterThan(DUCK_GAIN);
  // ramp out
  const end = first.from + first.frames;
  expect(duckAt(end + DUCK_RAMP / 2)).toBeLessThan(1);
  expect(duckAt(end + DUCK_RAMP / 2)).toBeGreaterThan(DUCK_GAIN);
});

test("duckAt never leaves [DUCK_GAIN, 1]", () => {
  for (let f = -10; f < TOTAL_FRAMES + 10; f++) {
    const g = duckAt(f);
    expect(g).toBeGreaterThanOrEqual(DUCK_GAIN - 1e-9);
    expect(g).toBeLessThanOrEqual(1);
  }
});
