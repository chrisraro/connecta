import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { poseTransform, settle, type Pose } from "./pose";

/** Enters from the tilted `from` pose and settles on `to` with a non-bouncy spring. */
export function Tilt3D({ from, to, start, style, children }: { from: Pose; to: Pose; start: number; style?: CSSProperties; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ perspective: 1400, ...style }}>
      <div style={{ transformStyle: "preserve-3d", transform: poseTransform(settle(frame, from, to, start, fps)) }}>{children}</div>
    </div>
  );
}
