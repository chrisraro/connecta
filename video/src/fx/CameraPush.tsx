import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../motion";

/** Slow push-in: the wrapped scene scales 1.00 → 1.05 over `frames`, ease-out cubic. */
export function CameraPush({ frames, children }: { frames: number; children: ReactNode }) {
  const scale = 1 + 0.05 * progress(useCurrentFrame(), 0, frames);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "50% 50%" }}>{children}</div>;
}
