import { useCurrentFrame } from "remotion";
import { progress } from "./motion";
import type { Line } from "./copy";

/** One copy line in the site's wide display type: rises and fades in, fades out. */
export function Caption({ line, ink, size = 96 }: { line: Line; ink: string; size?: number }) {
  const frame = useCurrentFrame();
  const inP = progress(frame, line.at, 12);
  const outP = progress(frame, line.at + line.hold - 9, 9);
  const opacity = inP * (1 - outP);
  if (opacity === 0) return null;
  return (
    <p style={{ color: ink, fontFamily: "Archivo", fontVariationSettings: '"wdth" 125', fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.015em", opacity, transform: `translateY(${(1 - inP) * 24}px)`, maxWidth: 900, margin: 0 }}>
      {line.text}
    </p>
  );
}
