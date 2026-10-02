import { BEATS, FPS, LEADS_BANNER_AT, beat } from "./timeline";
import { TAP } from "./fx/tap";
import sfxTiming from "./sfx-timing.json";

export const BPM = 120;
export const FRAMES_PER_BEAT = (FPS * 60) / BPM; // 15

export type Sfx = "whoosh" | "tick" | "chime" | "pop" | "riser";
export type Cue = { frame: number; sfx: Sfx };

/** The riser is two seconds long, so it ends exactly on the CTA cut. */
export const RISER_FRAMES = 2 * FPS;

/** Absolute start frame of every sound effect; compose.mjs bakes each file so its peak lands where the picture lands. */
export const CUES: Cue[] = ([
  // a paper whoosh on every act cut (its peak sits a few frames into the file, so the file is mixed on the cut)
  ...BEATS.slice(1).map((b) => ({ frame: b.from, sfx: "whoosh" as const })),
  { frame: beat("tap").from + TAP.contactFrame, sfx: "tick" as const },
  { frame: beat("tap").from + TAP.contactFrame + FRAMES_PER_BEAT, sfx: "chime" as const },
  { frame: beat("leads").from + LEADS_BANNER_AT, sfx: "pop" as const },
  // two seconds long: it builds through bar 15 and ends on the CTA cut
  { frame: beat("cta").from - RISER_FRAMES, sfx: "riser" as const },
] satisfies Cue[]).sort((a, b) => a.frame - b.frame);

/** Frames of lead-in baked into each effect file before its moment (e.g. the whoosh peaks 6 frames in); shared with compose.mjs. */
export const SFX_PREROLL: Record<Sfx, number> = sfxTiming;
