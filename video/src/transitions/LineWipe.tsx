import { AbsoluteFill, useCurrentFrame } from "remotion";
import { progress } from "../motion";

/** A 1.5 px rule sweeps left to right; the panel behind it covers the outgoing scene. */
export function LineWipe({ at, length = 15, color = "#2B3F8F", ground = "#EEF1F4" }: { at: number; length?: number; color?: string; ground?: string }) {
  const p = progress(useCurrentFrame(), at, length);
  if (p === 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${p * 100}%`, background: ground }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${p * 100}%`, width: 1.5, background: color }} />
    </AbsoluteFill>
  );
}
