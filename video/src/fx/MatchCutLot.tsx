import { AbsoluteFill, useCurrentFrame } from "remotion";
import { STROKE, lotPath, matchAt } from "./matchcut";

/** The brand's chamfered lot, carried across each act cut: stroke only, 3 px, morphing from one act's key shape to the next's. */
export function MatchCut() {
  const m = matchAt(useCurrentFrame());
  if (!m) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" aria-hidden="true">
        <path d={lotPath(m.rect)} fill="none" stroke={m.color} strokeWidth={STROKE} strokeLinejoin="miter" opacity={m.opacity} />
      </svg>
    </AbsoluteFill>
  );
}
