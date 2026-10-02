import { describe, expect, it } from "vitest";
import { BPM, CUES, FRAMES_PER_BEAT, RISER_FRAMES, SFX_PREROLL } from "./audio";
import { BEATS, FPS, LEADS_BANNER_AT, TOTAL_FRAMES, beat } from "./timeline";
import { TAP } from "./fx/tap";

const at = (sfx: string) => CUES.filter((c) => c.sfx === sfx).map((c) => c.frame);

describe("audio cues", () => {
  it("runs at 120 BPM, 15 frames per beat", () => {
    expect(BPM).toBe(120);
    expect(FRAMES_PER_BEAT).toBe((FPS * 60) / BPM);
    expect(FRAMES_PER_BEAT).toBe(15);
  });
  it("keeps every cue on the beat grid and inside the video", () => {
    for (const c of CUES) {
      expect(c.frame % FRAMES_PER_BEAT).toBe(0);
      expect(c.frame).toBeGreaterThanOrEqual(0);
      expect(c.frame).toBeLessThan(TOTAL_FRAMES);
    }
  });
  it("whooshes at every act boundary", () => {
    expect(at("whoosh")).toEqual(BEATS.slice(1).map((b) => b.from));
    expect(at("whoosh")).toEqual([90, 240, 480, 660, 900]);
  });
  it("ticks at the tap contact", () => {
    expect(at("tick")).toEqual([beat("tap").from + TAP.contactFrame]);
  });
  it("chimes after the tick, before the profile beat settles", () => {
    const [tick] = at("tick");
    const [chime] = at("chime");
    expect(chime).toBeGreaterThan(tick);
    expect(chime).toBeLessThan(beat("profile").from);
  });
  it("pops at the New lead banner", () => {
    expect(at("pop")).toEqual([beat("leads").from + LEADS_BANNER_AT]);
    expect(at("pop")).toEqual([585]);
  });
  it("ends the riser on the CTA cut", () => {
    expect(at("riser").length).toBe(1);
    expect(at("riser")[0] + RISER_FRAMES).toBe(beat("cta").from);
  });
  it("never mounts an effect before frame 0", () => {
    for (const c of CUES) expect(c.frame - SFX_PREROLL[c.sfx]).toBeGreaterThanOrEqual(0);
  });
});
