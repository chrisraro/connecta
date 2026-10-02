import { AbsoluteFill, useCurrentFrame } from "remotion";
import { linesFor } from "../copy";
import { CameraPush } from "../fx/CameraPush";
import { KineticCaption } from "../fx/KineticCaption";
import { LotDraw } from "../transitions/LotDraw";
import { PointSnap } from "../transitions/PointSnap";

// The lot is pinned where the match cut lands it; the title and URL sit below at fixed positions, so nothing shifts when they rise.
const LOT_TOP = 650;
const LANDED = 8; // the match-cut morph ends at frame 7.5

export function Cta() {
  const [title, url] = linesFor("cta");
  // Until the match-cut lot has landed on this spot the overlay is the only lot on screen; then this one takes over, in place.
  const landed = useCurrentFrame() >= LANDED;
  return (
    <AbsoluteFill style={{ background: "#2B3F8F" }}>
      <CameraPush frames={180}>
        <div style={{ position: "absolute", left: 96, top: LOT_TOP, width: 220, height: 220 }}>
          {/* Arrives already drawn: the match cut carries the lot in from the personas card. 3 px, as that lot. */}
          <div style={{ opacity: landed ? 1 : 0 }}><LotDraw at={-30} length={30} size={220} color="#EEF1F4" stroke={3} /></div>
          <div style={{ position: "absolute", right: 18, bottom: 18 }}><PointSnap at={30} size={32} /></div>
        </div>
        <div style={{ position: "absolute", left: 96, right: 96, top: LOT_TOP + 220 + 56 }}><KineticCaption line={title} ink="#F4F6FA" size={104} /></div>
        <div style={{ position: "absolute", left: 96, right: 96, top: LOT_TOP + 220 + 56 + 212 + 56 }}><KineticCaption line={url} ink="#C9D3F2" size={54} /></div>
      </CameraPush>
    </AbsoluteFill>
  );
}
