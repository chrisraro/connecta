import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";

export function Hook() {
  const frame = useCurrentFrame();
  const away = progress(frame, 45, 30);
  return (
    <AbsoluteFill style={{ background: "#12161F", padding: 96, justifyContent: "space-between" }}>
      <div>{linesFor("hook").map((l) => <Caption key={l.text} line={l} ink="#EEF1F4" />)}</div>
      {/* A plain paper card, sliding off frame. A fictional placeholder name and a dummy number. */}
      <div style={{ alignSelf: "center", width: 620, aspectRatio: "85.6 / 54", background: "#FAFAF7", borderRadius: 8, padding: 40, transform: `translateX(${away * 1100}px) rotate(${away * 12}deg)`, boxShadow: "0 0 0 1px rgb(0 0 0 / 0.12), 0 14px 30px -12px rgb(0 0 0 / 0.5)" }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 40, color: "#222", margin: 0 }}>Juan Dela Cruz</p>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#555", margin: "8px 0 0" }}>Sales Agent · 0900 000 0000</p>
      </div>
      <div style={{ height: 96 }} />
    </AbsoluteFill>
  );
}
