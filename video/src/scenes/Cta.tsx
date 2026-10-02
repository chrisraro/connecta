import { AbsoluteFill } from "remotion";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { LotDraw } from "../transitions/LotDraw";
import { PointSnap } from "../transitions/PointSnap";

export function Cta() {
  const [title, url] = linesFor("cta");
  return (
    <AbsoluteFill style={{ background: "#2B3F8F", padding: 96, justifyContent: "center", gap: 56 }}>
      <div style={{ position: "relative", width: 220, height: 220 }}>
        {/* Arrives already drawn: the match cut carries the lot in from the personas card. */}
        <LotDraw at={-30} length={30} size={220} color="#EEF1F4" />
        <div style={{ position: "absolute", right: 18, bottom: 18 }}><PointSnap at={30} size={32} /></div>
      </div>
      <Caption line={title} ink="#F4F6FA" size={104} />
      <Caption line={url} ink="#C9D3F2" size={54} />
    </AbsoluteFill>
  );
}
