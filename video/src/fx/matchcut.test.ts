import { describe, expect, it } from "vitest";
import { CUT_RECTS, CUTS, MATCH, lotPath, matchAt, type Rect } from "./matchcut";
import { BEATS } from "../timeline";

const W = 1080;
const H = 1920;
const inside = (r: Rect) => r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= W && r.y + r.h <= H;

describe("match cut rects", () => {
  it("gives every beat an in and out rect inside the 1080 x 1920 frame", () => {
    for (const b of BEATS) {
      expect(CUT_RECTS[b.id], b.id).toBeDefined();
      expect(inside(CUT_RECTS[b.id].in), `${b.id} in`).toBe(true);
      expect(inside(CUT_RECTS[b.id].out), `${b.id} out`).toBe(true);
    }
  });
});

describe("match cut timing", () => {
  it("morphs for at least 9 frames (300 ms)", () => {
    expect(MATCH).toBeGreaterThanOrEqual(9);
  });
  it("has one cut per act boundary, on the beat starts", () => {
    expect(CUTS.map((c) => c.at)).toEqual(BEATS.slice(1).map((b) => b.from));
  });
  it("keeps morph windows from overlapping each other", () => {
    for (let i = 1; i < CUTS.length; i++) {
      expect(CUTS[i].at - MATCH / 2).toBeGreaterThanOrEqual(CUTS[i - 1].at + MATCH / 2);
    }
  });
  it("keeps each window inside both of its acts", () => {
    for (let i = 1; i < BEATS.length; i++) {
      expect(BEATS[i].from - MATCH / 2).toBeGreaterThanOrEqual(BEATS[i - 1].from);
      expect(BEATS[i].from + MATCH / 2).toBeLessThanOrEqual(BEATS[i].from + BEATS[i].frames);
    }
  });
});

describe("matchAt", () => {
  it("draws nothing outside a window", () => {
    expect(matchAt(0)).toBeNull();
    expect(matchAt(CUTS[0].at - MATCH / 2 - 1)).toBeNull();
    expect(matchAt(CUTS[0].at + MATCH / 2 + 1)).toBeNull();
    expect(matchAt(1079)).toBeNull();
  });
  it("starts on the outgoing act's out rect and ends on the incoming act's in rect", () => {
    for (let i = 0; i < CUTS.length; i++) {
      const c = CUTS[i];
      const s = matchAt(c.at - MATCH / 2 + 1e-6)!;
      const e = matchAt(c.at + MATCH / 2 - 1e-6)!;
      for (const k of ["x", "y", "w", "h"] as const) {
        expect(s.rect[k]).toBeCloseTo(CUT_RECTS[c.from].out[k], 1);
        expect(e.rect[k]).toBeCloseTo(CUT_RECTS[c.to].in[k], 1);
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
    }
  });
  it("moves monotonically from one shape to the other (no overshoot)", () => {
    for (const c of CUTS) {
      const a = CUT_RECTS[c.from].out;
      const b = CUT_RECTS[c.to].in;
      let prev = a.w;
      for (let f = c.at - 7; f <= c.at + 7; f++) {
        const w = matchAt(f)!.rect.w;
        const lo = Math.min(a.w, b.w);
        const hi = Math.max(a.w, b.w);
        expect(w).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(w).toBeLessThanOrEqual(hi + 1e-9);
        if (b.w >= a.w) expect(w).toBeGreaterThanOrEqual(prev - 1e-9);
        else expect(w).toBeLessThanOrEqual(prev + 1e-9);
        prev = w;
      }
    }
  });
  it("is fully visible on the cut frame and has faded out by the end of the window", () => {
    for (const c of CUTS) {
      expect(matchAt(c.at)!.opacity).toBe(1);
      expect(matchAt(c.at + 3)!.opacity).toBe(1);
      expect(matchAt(c.at + MATCH / 2 - 1e-6)!.opacity).toBeLessThan(0.01);
      expect(matchAt(c.at - MATCH / 2 + 1e-6)!.opacity).toBeLessThan(0.5);
    }
  });
  it("uses the line colour of the ground it sits on: out ground before the cut, in ground from it", () => {
    const dark = "#EEF1F4";
    const light = "#2B3F8F";
    expect(matchAt(90 - 1)!.color).toBe(dark); // hook (graphite) -> tap
    expect(matchAt(90)!.color).toBe(light); // tap (whiteprint)
    expect(matchAt(480 - 1)!.color).toBe(light); // profile -> leads
    expect(matchAt(480)!.color).toBe(dark); // leads (graphite)
    expect(matchAt(900)!.color).toBe(dark); // cta (blue)
  });
});

describe("lotPath", () => {
  it("cuts the top-right corner at 45 degrees, scaled with the rect and never more than half a side", () => {
    const wide = lotPath({ x: 0, y: 0, w: 400, h: 100 });
    const nums = (p: string) => p.match(/-?\d+(\.\d+)?/g)!.map(Number);
    // path: M x0 y0 H hx L lx ly V vy H x0 Z
    const [x0, y0, hx, lx, ly] = nums(wide);
    expect([x0, y0]).toEqual([0, 0]);
    // the cut: horizontal run equals vertical drop, from the top edge
    expect(lx - hx).toBeCloseTo(ly - y0, 5);
    expect(lx - hx).toBeLessThanOrEqual(50);
    expect(lx).toBe(400);
    const small = nums(lotPath({ x: 0, y: 0, w: 40, h: 40 }));
    const big = nums(lotPath({ x: 0, y: 0, w: 200, h: 200 }));
    expect(small[3] - small[2]).toBeLessThan(big[3] - big[2]);
  });
});
