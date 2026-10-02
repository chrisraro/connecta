import { BEATS, type BeatId } from "../timeline";

/** A rectangle in frame px (1080 x 1920); `c` overrides the lot's chamfer when the act draws its own lot. */
export type Rect = { x: number; y: number; w: number; h: number; c?: number };

/** Frames a morph lasts, centred on its cut: the cut lands on the window's midpoint. */
export const MATCH = 15;
/** Frames after the cut the lot holds at full strength before it fades out within the window. */
const HOLD = 4;
/** Frames the lot takes to appear at the start of the window. */
const LEAD = 2;
/** Biggest cut a chamfer takes off a corner (the card's own cut and the CTA lot are both ~53 px). */
const CHAMFER_MAX = 56;
const CHAMFER_RATIO = 0.25; // the brand lot: 24 of 96

/** Line colour on each act's ground: #EEF1F4 on graphite and on the blue, #2B3F8F on the whiteprint. */
const LIGHT_LINE = "#EEF1F4";
const DARK_LINE = "#2B3F8F";
const LINE: Record<BeatId, string> = { hook: LIGHT_LINE, tap: DARK_LINE, profile: DARK_LINE, leads: LIGHT_LINE, personas: DARK_LINE, cta: LIGHT_LINE };

// The shared phone stage sits at (96, 380) in the frame (96 padding + 220 caption + 64 gap); the phone body is 578 x 1210 at stage x 159.
// The lot hugs the body, 10 px outside it, so the line reads on the ground instead of on the dark bezel.
const PHONE_BODY: Rect = { x: 245, y: 370, w: 598, h: 1230 };
// Tap ends with the camera pushed 5% about the frame centre (CameraPush), so the same body is 5% larger there.
const PHONE_BODY_PUSHED: Rect = { x: 540 + (245 - 540) * 1.05, y: 960 + (370 - 960) * 1.05, w: 598 * 1.05, h: 1230 * 1.05 };
// Profile draws its own 1000 px lot behind the phone (96 - 56, 380 - 80); the path is inset 2% and its chamfer is 24%.
const PROFILE_LOT: Rect = { x: 60, y: 320, w: 960, h: 960, c: 240 };
const PAPER_CARD: Rect = { x: 230, y: 806, w: 620, h: 391 };
const TAP_CARD: Rect = { x: 436, y: 200, w: 540, h: 340 }; // the card at rest: stage (340, -180) + (96, 380)
const NEW_LEAD_BANNER: Rect = { x: 225, y: 400, w: 630, h: 161 };
const PERSONA_CARD: Rect = { x: 160, y: 400, w: 760, h: 1205 };
const CTA_LOT: Rect = { x: 100.4, y: 854, w: 211.2, h: 211.2 }; // LotDraw 220 px at (96, 850), path inset 2%

/** Each act's key shape when it starts (`in`) and when it ends (`out`). */
export const CUT_RECTS: Record<BeatId, { in: Rect; out: Rect }> = {
  hook: { in: PAPER_CARD, out: PAPER_CARD },
  tap: { in: TAP_CARD, out: PHONE_BODY_PUSHED },
  profile: { in: PHONE_BODY, out: PROFILE_LOT },
  leads: { in: PHONE_BODY, out: NEW_LEAD_BANNER },
  personas: { in: PERSONA_CARD, out: PERSONA_CARD },
  cta: { in: CTA_LOT, out: CTA_LOT },
};

/** One cut per act boundary: the frame the scenes switch, and the acts either side. */
export const CUTS: { at: number; from: BeatId; to: BeatId }[] = BEATS.slice(1).map((b, i) => ({ at: b.from, from: BEATS[i].id, to: b.id }));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const chamferFor = (r: Rect) => Math.min(CHAMFER_MAX, CHAMFER_RATIO * Math.min(r.w, r.h));

/** The lot's outline for a rect: top-right corner cut at 45 degrees, the cut scaling with the rect. */
export function lotPath(r: Rect): string {
  const c = r.c ?? chamferFor(r);
  const [x0, y0, x1, y1] = [r.x, r.y, r.x + r.w, r.y + r.h];
  return `M${x0} ${y0} H${x1 - c} L${x1} ${y0 + c} V${y1} H${x0} Z`;
}

/** The lot at `frame` (absolute): its rect, opacity and line colour, or null outside every window. */
export function matchAt(frame: number): { rect: Rect; opacity: number; color: string } | null {
  const cut = CUTS.find((c) => Math.abs(frame - c.at) <= MATCH / 2);
  if (!cut) return null;
  const start = cut.at - MATCH / 2;
  const end = cut.at + MATCH / 2;
  const t = easeInOut((frame - start) / MATCH);
  const a = CUT_RECTS[cut.from].out;
  const b = CUT_RECTS[cut.to].in;
  const rect = { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t), c: mix(a.c ?? chamferFor(a), b.c ?? chamferFor(b), t) };
  const appear = Math.min(1, (frame - start) / LEAD);
  const fade = frame <= cut.at + HOLD ? 1 : Math.max(0, (end - frame) / (end - cut.at - HOLD));
  return { rect, opacity: Math.min(appear, fade), color: LINE[frame < cut.at ? cut.from : cut.to] };
}
