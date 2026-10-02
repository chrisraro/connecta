import { BEATS, type BeatId } from "../timeline";

/** A rectangle in frame px (1080 x 1920); `c` overrides the lot's chamfer when the act draws its own lot. */
export type Rect = { x: number; y: number; w: number; h: number; c?: number };

/** Frames the morph itself lasts, centred on its cut: the cut lands on the morph's midpoint. */
export const MATCH = 15;
/** Frames the lot takes to appear, then holds at the outgoing act's shape before it moves. */
export const RAMP = 3;
export const HOLD_OUT = 5;
/** Frames the lot holds at the incoming act's shape after it lands, then fades. */
export const HOLD_IN = 5;
export const FADE = 4;
/** Line weight in frame px: heavy enough to read on a phone, still a line. */
export const STROKE = 3;
/** Biggest cut a chamfer takes off a corner (the card's own cut and the CTA lot are both ~53 px). */
const CHAMFER_MAX = 56;
const CHAMFER_RATIO = 0.25; // the brand lot: 24 of 96

/** Mid-blue: 3.8:1 on the whiteprint, 4.3:1 on graphite and the charcoal card. Too dim on the brand blue, where the light line takes over. */
const MID = "#5B73E0";
const LIGHT = "#EEF1F4";
/** Line colour on each side of the cut, keyed by the incoming act; each is at least 3:1 against the ground under it. */
const COLORS: Record<BeatId, { before: string; after: string }> = {
  hook: { before: MID, after: MID },
  tap: { before: MID, after: MID }, // graphite -> whiteprint
  profile: { before: MID, after: MID }, // whiteprint -> whiteprint
  leads: { before: MID, after: MID }, // whiteprint -> graphite
  personas: { before: MID, after: MID }, // graphite -> whiteprint, and over the charcoal card
  cta: { before: MID, after: LIGHT }, // whiteprint -> brand blue
};

const outset = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
/** A rect scaled about the frame centre, as CameraPush does. */
const pushed = (r: Rect, k: number): Rect => ({ x: 540 + (r.x - 540) * k, y: 960 + (r.y - 960) * k, w: r.w * k, h: r.h * k });

// Every shape is outset so the line sits on the ground beside the object, not on its edge.
// The shared phone stage sits at (96, 380) in the frame (96 padding + 220 caption + 64 gap); the phone body is 578 x 1210 at stage x 159.
const PHONE_BODY: Rect = { x: 255, y: 380, w: 578, h: 1210 };
// The tilted phone's bounding box at frame 97 (re-measured from the still: x 255-842, y 438-1636), as Tap settles it.
const PHONE_TILTED: Rect = { x: 255, y: 438, w: 587, h: 1198 };
// Profile draws its own 1000 px lot behind the phone (96 - 56, 380 - 80); the path is inset 2% and its chamfer is 24%.
const PROFILE_LOT: Rect = { x: 60, y: 320, w: 960, h: 960, c: 240 };
const PAPER_CARD: Rect = { x: 230, y: 806, w: 620, h: 391 };
const NEW_LEAD_BANNER: Rect = { x: 225, y: 400, w: 630, h: 161 };
const PERSONA_CARD: Rect = { x: 160, y: 400, w: 760, h: 1205 };
const CTA_LOT: Rect = { x: 100.4, y: 854, w: 211.2, h: 211.2 }; // LotDraw 220 px at (96, 850), path inset 2%

/** Each act's key shape when it starts (`in`) and when it ends (`out`). */
export const CUT_RECTS: Record<BeatId, { in: Rect; out: Rect }> = {
  hook: { in: outset(PAPER_CARD, 10), out: outset(PAPER_CARD, 10) },
  // Tap ends with the camera pushed 5%; its loose 24 px line tightens to a snug 6 px around the same phone in Profile.
  tap: { in: outset(PHONE_TILTED, 10), out: outset(pushed(PHONE_BODY, 1.05), 24) },
  profile: { in: outset(PHONE_BODY, 6), out: PROFILE_LOT },
  leads: { in: outset(PHONE_BODY, 10), out: outset(NEW_LEAD_BANNER, 10) },
  personas: { in: outset(PERSONA_CARD, 10), out: outset(PERSONA_CARD, 10) },
  cta: { in: CTA_LOT, out: CTA_LOT },
};

/** One cut per act boundary: the frame the scenes switch, and the acts either side. */
export const CUTS: { at: number; from: BeatId; to: BeatId }[] = BEATS.slice(1).map((b, i) => ({ at: b.from, from: BEATS[i].id, to: b.id }));

/** Every frame boundary of a cut's lot: ramp in, hold out, morph (cut at its midpoint), hold in, fade. */
export function windowOf(cut: { at: number }) {
  const morphStart = cut.at - MATCH / 2;
  const morphEnd = cut.at + MATCH / 2;
  return { start: morphStart - HOLD_OUT - RAMP, morphStart, morphEnd, end: morphEnd + HOLD_IN + FADE };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const chamferFor = (r: Rect) => Math.min(CHAMFER_MAX, CHAMFER_RATIO * Math.min(r.w, r.h));

/** The lot's outline for a rect: top-right corner cut at 45 degrees, the cut scaling with the rect. */
export function lotPath(r: Rect): string {
  const c = r.c ?? chamferFor(r);
  const [x0, y0, x1, y1] = [r.x, r.y, r.x + r.w, r.y + r.h];
  return `M${x0} ${y0} H${x1 - c} L${x1} ${y0 + c} V${y1} H${x0} Z`;
}

/** The lot at `frame` (absolute): its rect, opacity and line colour, or null outside every window. */
export function matchAt(frame: number): { rect: Rect; opacity: number; color: string } | null {
  const cut = CUTS.find((c) => {
    const w = windowOf(c);
    return frame >= w.start && frame <= w.end;
  });
  if (!cut) return null;
  const w = windowOf(cut);
  const t = easeInOut(clamp01((frame - w.morphStart) / MATCH));
  const a = CUT_RECTS[cut.from].out;
  const b = CUT_RECTS[cut.to].in;
  const rect = { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t), c: mix(a.c ?? chamferFor(a), b.c ?? chamferFor(b), t) };
  const opacity = Math.min(clamp01((frame - w.start) / RAMP), clamp01((w.end - frame) / FADE));
  const colors = COLORS[cut.to];
  return { rect, opacity, color: frame < cut.at ? colors.before : colors.after };
}
