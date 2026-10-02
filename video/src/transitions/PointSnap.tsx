import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export function PointSnap({ at, size = 28, color = "#FF5A52" }: { at: number; size?: number; color?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: 12 });
  return <div aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", background: color, transform: `scale(${s})` }} />;
}
