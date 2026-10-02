import { spring } from "remotion";

/** A 3D pose: rotations in degrees, z/x/y in px. */
export type Pose = { rx: number; ry: number; z: number; x: number; y: number };

/** Frames a settle takes to land exactly on its target. */
export const SETTLE_FRAMES = 45;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Pose at `frame` for a move that starts at `start`: critically damped spring (damping 200),
 * no overshoot, exactly `to` from start + 45 frames on.
 */
export function settle(frame: number, from: Pose, to: Pose, start: number, fps: number): Pose {
  const at = (f: number) => spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: SETTLE_FRAMES });
  // The spring only reaches ~0.999 at its duration; normalise so the landing is exact and seamless.
  const t = Math.min(1, Math.max(0, at(frame - start) / at(SETTLE_FRAMES)));
  return { rx: mix(from.rx, to.rx, t), ry: mix(from.ry, to.ry, t), z: mix(from.z, to.z, t), x: mix(from.x, to.x, t), y: mix(from.y, to.y, t) };
}

/** Start frame of each word of `text`, `stagger` frames apart from `at`. */
export function wordStarts(text: string, at: number, stagger = 4): number[] {
  return text.trim().split(/\s+/).filter(Boolean).map((_, i) => at + i * stagger);
}

/** CSS transform string for a pose. */
export function poseTransform(p: Pose): string {
  return `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg)`;
}
