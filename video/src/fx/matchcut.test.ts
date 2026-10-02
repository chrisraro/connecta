import { describe, expect, it } from "vitest";
import { CUT_RECTS, CUTS, FADE, HOLD_IN, HOLD_OUT, MATCH, RAMP, STROKE, lotPath, matchAt, windowOf, type Rect } from "./matchcut";
import { BEATS, type BeatId } from "../timeline";

const W = 1080;
const H = 1920;
const inside = (r: Rect) => r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= W && r.y + r.h <= H;

const GROUND: Record<BeatId, string> = { hook: "#12161F", tap: "#EEF1F4", profile: "#EEF1F4", leads: "#12161F", personas: "#EEF1F4", cta: "#2B3F8F" };
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("match cut rects", () => {
  it("gives every beat an in and out rect inside the 1080 x 1920 frame", () => {
    for (const b of BEATS) {
      expect(CUT_RECTS[b.id], b.id).toBeDefined();
      expect(inside(CUT_RECTS[b.id].in), `${b.id} in`).toBe(true);
      expect(inside(CUT_RECTS[b.id].out), `${b.id} out`).toBe(true);
    }
  });
  it("carries something across the phone-to-phone cut: out is looser than in", () => {
    const o = CUT_RECTS.tap.out;
    const i = CUT_RECTS.profile.in;
    expect(o.w).toBeGreaterThan(i.w + 20);
    expect(o.h).toBeGreaterThan(i.h + 20);
  });
});

describe("match cut timing", () => {
  it("draws a 3 px line", () => {
    expect(STROKE).toBe(3);
  });
  it("morphs for at least 9 frames (300 ms)", () => {
    expect(MATCH).toBeGreaterThanOrEqual(9);
  });
  it("ramps in over 3, holds ~5 either side of the morph, fades over 4", () => {
    expect(RAMP).toBe(3);
    expect(HOLD_OUT).toBeGreaterThanOrEqual(5);
    expect(HOLD_IN).toBeGreaterThanOrEqual(5);
    expect(FADE).toBe(4);
  });
  it("has one cut per act boundary, on the beat starts", () => {
    expect(CUTS.map((c) => c.at)).toEqual(BEATS.slice(1).map((b) => b.from));
  });
  it("keeps whole windows from overlapping each other", () => {
    for (let i = 1; i < CUTS.length; i++) {
      expect(windowOf(CUTS[i]).start).toBeGreaterThan(windowOf(CUTS[i - 1]).end);
    }
  });
  it("keeps each window inside both of its acts", () => {
    for (let i = 1; i < BEATS.length; i++) {
      const w = windowOf(CUTS[i - 1]);
      expect(w.start).toBeGreaterThanOrEqual(BEATS[i - 1].from);
      expect(w.end).toBeLessThanOrEqual(BEATS[i].from + BEATS[i].frames);
    }
  });
  it("puts the cut at the midpoint of the morph", () => {
    for (const c of CUTS) {
      const w = windowOf(c);
      expect(w.morphStart + MATCH / 2).toBe(c.at);
      expect(w.morphEnd - MATCH / 2).toBe(c.at);
    }
  });
});

describe("matchAt", () => {
  it("draws nothing outside a window", () => {
    expect(matchAt(0)).toBeNull();
    expect(matchAt(windowOf(CUTS[0]).start - 1)).toBeNull();
    expect(matchAt(windowOf(CUTS[0]).end + 1)).toBeNull();
    expect(matchAt(1079)).toBeNull();
  });
  it("holds the outgoing act's out rect at full strength before the morph", () => {
    for (const c of CUTS) {
      const w = windowOf(c);
      for (let f = w.morphStart - HOLD_OUT; f <= w.morphStart; f += 1) {
        const m = matchAt(f)!;
        expect(m.opacity, `${c.at} @ ${f}`).toBe(1);
        for (const k of ["x", "y", "w", "h"] as const) expect(m.rect[k]).toBeCloseTo(CUT_RECTS[c.from].out[k], 5);
      }
    }
  });
  it("holds the incoming act's in rect at full strength after the morph", () => {
    for (const c of CUTS) {
      const w = windowOf(c);
      for (let f = w.morphEnd; f <= w.morphEnd + HOLD_IN; f += 1) {
        const m = matchAt(f)!;
        expect(m.opacity, `${c.at} @ ${f}`).toBe(1);
        for (const k of ["x", "y", "w", "h"] as const) expect(m.rect[k]).toBeCloseTo(CUT_RECTS[c.to].in[k], 5);
      }
    }
  });
  it("is exactly halfway between the two shapes on the cut frame", () => {
    for (const c of CUTS) {
      const m = matchAt(c.at)!;
      const a = CUT_RECTS[c.from].out;
      const b = CUT_RECTS[c.to].in;
      expect(m.rect.x).toBeCloseTo((a.x + b.x) / 2, 5);
      expect(m.rect.w).toBeCloseTo((a.w + b.w) / 2, 5);
      expect(m.rect.h).toBeCloseTo((a.h + b.h) / 2, 5);
      expect(m.opacity).toBe(1);
    }
  });
  it("moves monotonically from one shape to the other (no overshoot)", () => {
    for (const c of CUTS) {
      const a = CUT_RECTS[c.from].out;
      const b = CUT_RECTS[c.to].in;
      const w = windowOf(c);
      let prev = a.w;
      for (let f = w.morphStart; f <= w.morphEnd; f += 0.5) {
        const cur = matchAt(f)!.rect.w;
        expect(cur).toBeGreaterThanOrEqual(Math.min(a.w, b.w) - 1e-9);
        expect(cur).toBeLessThanOrEqual(Math.max(a.w, b.w) + 1e-9);
        if (b.w >= a.w) expect(cur).toBeGreaterThanOrEqual(prev - 1e-9);
        else expect(cur).toBeLessThanOrEqual(prev + 1e-9);
        prev = cur;
      }
    }
  });
  it("ramps in from nothing and fades back to nothing at the window ends", () => {
    for (const c of CUTS) {
      const w = windowOf(c);
      expect(matchAt(w.start)!.opacity).toBe(0);
      expect(matchAt(w.start + RAMP)!.opacity).toBe(1);
      expect(matchAt(w.end)!.opacity).toBe(0);
      expect(matchAt(w.end - FADE)!.opacity).toBe(1);
      expect(matchAt(w.start + RAMP / 2)!.opacity).toBeCloseTo(0.5, 5);
    }
  });
  it("gives every cut a line colour with at least 3:1 against the ground under it, before and after the cut", () => {
    for (const c of CUTS) {
      const before = matchAt(c.at - 1)!.color;
      const after = matchAt(c.at)!.color;
      expect(contrast(before, GROUND[c.from]), `${c.from} before`).toBeGreaterThanOrEqual(3);
      expect(contrast(after, GROUND[c.to]), `${c.to} after`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("lotPath", () => {
  it("cuts the top-right corner at 45 degrees, scaled with the rect and never more than half a side", () => {
    const wide = lotPath({ x: 0, y: 0, w: 400, h: 100 });
    const nums = (p: string) => p.match(/-?\d+(\.\d+)?/g)!.map(Number);
    // path: M x0 y0 H hx L lx ly V vy H x0 Z
    const [x0, y0, hx, lx, ly] = nums(wide);
    expect([x0, y0]).toEqual([0, 0]);
    expect(lx - hx).toBeCloseTo(ly - y0, 5);
    expect(lx - hx).toBeLessThanOrEqual(50);
    expect(lx).toBe(400);
    const small = nums(lotPath({ x: 0, y: 0, w: 40, h: 40 }));
    const big = nums(lotPath({ x: 0, y: 0, w: 200, h: 200 }));
    expect(small[3] - small[2]).toBeLessThan(big[3] - big[2]);
  });
});
