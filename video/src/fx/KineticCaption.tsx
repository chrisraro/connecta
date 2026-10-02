import { useCurrentFrame } from "remotion";
import { progress } from "../motion";
import type { Line } from "../copy";
import { wordStarts } from "./pose";

const RISE = 12; // frames a word takes to rise
const EXIT = 9; // frames the line takes to slide out
const ALL_IN = 45; // the last word is fully in this many frames after line.at

/** One copy line in wide display type: words rise one by one from masks, then the line slides down and out. */
export function KineticCaption({ line, ink, size = 96 }: { line: Line; ink: string; size?: number }) {
  const frame = useCurrentFrame();
  const words = line.text.trim().split(/\s+/);
  const stagger = words.length > 1 ? Math.min(4, Math.floor((ALL_IN - RISE) / (words.length - 1))) : 4;
  const starts = wordStarts(line.text, line.at, stagger);
  const outP = progress(frame, line.at + line.hold - EXIT, EXIT);
  if (frame < line.at || outP === 1) return null;
  return (
    <p aria-label={line.text} style={{ color: ink, fontFamily: "Archivo", fontVariationSettings: '"wdth" 125', fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.015em", maxWidth: 900, margin: 0, display: "flex", flexWrap: "wrap", columnGap: "0.26em" }}>
      {words.map((w, i) => {
        const inP = progress(frame, starts[i], RISE);
        const y = (1 - inP) * 110 + outP * 110;
        return (
          // The mask: overflow hidden, with room below so descenders are not clipped.
          <span key={i} aria-hidden="true" style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.14em", marginBottom: "-0.14em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${y}%)` }}>{w}</span>
          </span>
        );
      })}
    </p>
  );
}
