import { useCurrentFrame } from "remotion";
import { progress } from "../motion";

const DRAW = 18; // frames to draw the dimension line
const TICK = 14; // px, length of each end tick

/** A hairline dimension line with end ticks. Coordinates are px in the parent's box (parent must be positioned). */
export function Annotation({ x1, y1, x2, y2, label, at, color, labelPos }: { x1: number; y1: number; x2: number; y2: number; label: string; at: number; color: string; labelPos?: { x: number; y: number } }) {
  const frame = useCurrentFrame();
  const draw = progress(frame, at, DRAW);
  const labelP = progress(frame, at + DRAW, 9);
  if (frame < at) return null;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = -uy * (TICK / 2); // half-tick normal
  const ny = ux * (TICK / 2);
  const tick = (x: number, y: number) => `M${x + nx} ${y + ny} L${x - nx} ${y - ny}`;
  // Each end tick appears with the line: the start tick as it leaves its end, the far tick as the line arrives.
  const startTick = Math.min(1, draw * 12);
  const endTick = Math.min(1, Math.max(0, (draw - 0.85) / 0.15));
  // Label sits 36 px off the line's midpoint, on the side that faces up (right for a vertical line).
  let px = -uy;
  let py = ux;
  if (py > 0 || (py === 0 && px < 0)) { px = -px; py = -py; }
  // `labelPos` moves the label off the line's midpoint, for a leader that crosses something the label must not sit on.
  const lx = labelPos?.x ?? (x1 + x2) / 2 + px * 36;
  const ly = labelPos?.y ?? (y1 + y2) / 2 + py * 36;
  return (
    <svg aria-hidden="true" width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="butt" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      <path d={tick(x1, y1)} fill="none" stroke={color} strokeWidth={1.5} opacity={startTick} />
      <path d={tick(x2, y2)} fill="none" stroke={color} strokeWidth={1.5} opacity={endTick} />
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={color} opacity={labelP} style={{ fontFamily: "'JetBrains Mono'", fontWeight: 500, fontSize: 32, letterSpacing: "0.04em" }}>
        {label}
      </text>
    </svg>
  );
}
