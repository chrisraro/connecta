import { FPS, type BeatId } from "./timeline";

/** `stay`: the line is still on screen on the last frame of its beat (no exit), for the closing frame. */
export type Line = { beat: BeatId; text: string; at: number; hold: number; stay?: boolean };

const s = (n: number) => Math.round(n * FPS);

export const LINES: Line[] = [
  { beat: "hook", text: "Still handing out paper cards?", at: s(0.3), hold: s(2.5) },
  { beat: "tap", text: "Tap once.", at: s(1.5), hold: s(3.3) },
  { beat: "profile", text: "Your profile opens. Instantly.", at: s(0.5), hold: s(3.5) },
  { beat: "profile", text: "No app. Any phone.", at: s(4.3), hold: s(3.5) },
  { beat: "leads", text: "They leave their details.", at: s(0.5), hold: s(2.5) },
  { beat: "leads", text: "You follow up.", at: s(3.2), hold: s(2.6) },
  { beat: "personas", text: "Your card. Your work.", at: s(0.5), hold: s(7.3) },
  { beat: "cta", text: "Create your free profile", at: s(1.2), hold: s(4.8), stay: true },
  { beat: "cta", text: "connectaph.vercel.app", at: s(1.8), hold: s(4.2), stay: true },
];

export function linesFor(id: BeatId): Line[] {
  return LINES.filter((l) => l.beat === id);
}
