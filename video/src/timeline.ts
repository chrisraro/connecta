export const FPS = 30;

export type BeatId = "hook" | "tap" | "profile" | "leads" | "personas" | "cta";

const SECONDS: [BeatId, number][] = [
  ["hook", 3],
  ["tap", 5],
  ["profile", 8],
  ["leads", 6],
  ["personas", 8],
  ["cta", 6],
];

export const BEATS = SECONDS.reduce<{ id: BeatId; from: number; frames: number }[]>((acc, [id, s]) => {
  const prev = acc[acc.length - 1];
  return [...acc, { id, from: prev ? prev.from + prev.frames : 0, frames: s * FPS }];
}, []);

export const TOTAL_FRAMES = BEATS[BEATS.length - 1].from + BEATS[BEATS.length - 1].frames;

export function beat(id: BeatId): { from: number; frames: number } {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown beat ${id}`);
  return { from: b.from, frames: b.frames };
}
