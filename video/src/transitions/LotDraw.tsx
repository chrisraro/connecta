import { useCurrentFrame } from "remotion";
import { progress } from "../motion";

// The brand's chamfered lot: a square with the top-right corner cut at 45°.
const LOT = "M2 2 H74 L98 26 V98 H2 Z";

export function LotDraw({ at, length = 30, size, color, stroke = 1.5 }: { at: number; length?: number; size: number; color: string; stroke?: number }) {
  const p = progress(useCurrentFrame(), at, length);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={LOT} fill="none" stroke={color} strokeWidth={(stroke * 100) / size} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
}
