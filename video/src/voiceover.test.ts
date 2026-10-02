import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { BEATS, FPS, TOTAL_FRAMES } from "./timeline";
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

/** Measured duration of an audio file in seconds, from ffprobe. */
const probeSeconds = (file: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

test("each line's frame count is the real duration of its MP3", () => {
  for (const line of VO_LINES) {
    expect(line.frames, line.file).toBe(Math.ceil(probeSeconds(path.join(publicDir, line.file)) * FPS));
  }
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

test("the closest pair of lines: the mid-gap gain stays in range and the ramps are monotone", () => {
  const pairs = VO_LINES.slice(1).map((l, i) => ({ end: VO_LINES[i].from + VO_LINES[i].frames, next: l.from }));
  const { end, next } = pairs.reduce((a, b) => (b.next - b.end < a.next - a.end ? b : a));
  const mid = (end + next) / 2;
  expect(duckAt(mid)).toBeGreaterThanOrEqual(DUCK_GAIN);
  expect(duckAt(mid)).toBeLessThanOrEqual(1);
  const gains = Array.from({ length: next - end + 2 * DUCK_RAMP + 1 }, (_, i) => duckAt(end - DUCK_RAMP + i));
  const mi = Math.floor(gains.length / 2);
  for (let i = 1; i < mi; i++) expect(gains[i], `rising at ${i}`).toBeGreaterThanOrEqual(gains[i - 1] - 1e-9);
  for (let i = mi + 1; i < gains.length; i++) expect(gains[i], `falling at ${i}`).toBeLessThanOrEqual(gains[i - 1] + 1e-9);
});
