import { AbsoluteFill } from "remotion";
import { linesFor } from "../copy";
import { CameraPush } from "../fx/CameraPush";
import { CardMaterial } from "../fx/CardMaterial";
import { KineticCaption } from "../fx/KineticCaption";
import { Tilt3D } from "../fx/Tilt3D";
import type { Pose } from "../fx/pose";

const REST: Pose = { rx: 0, ry: 0, z: 0, x: 0, y: 0 };
// The paper card tips in from the back and settles flat well before the cut (frame 45 of 90), so the match-cut lot can trace it.
const CARD_FROM: Pose = { rx: 16, ry: -12, z: -90, x: 0, y: 70 };

export function Hook() {
  return (
    <AbsoluteFill style={{ background: "#12161F" }}>
      <CameraPush frames={90}>
        <AbsoluteFill style={{ padding: 96, justifyContent: "space-between" }}>
          <div>{linesFor("hook").map((l) => <KineticCaption key={l.text} line={l} ink="#EEF1F4" size={88} />)}</div>
          {/* A plain paper card. A fictional placeholder name and a dummy number. */}
          <Tilt3D from={CARD_FROM} to={REST} start={0} style={{ alignSelf: "center", width: 620 }}>
            <CardMaterial at={20} edge="#D7D7CF" radius={8}>
              <div style={{ width: 620, aspectRatio: "85.6 / 54", background: "#FAFAF7", borderRadius: 8, padding: 40, boxSizing: "border-box", boxShadow: "0 0 0 1px rgb(0 0 0 / 0.12), 0 14px 30px -12px rgb(0 0 0 / 0.5)" }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 40, color: "#222", margin: 0 }}>Juan Dela Cruz</p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#555", margin: "8px 0 0" }}>Sales Agent · 0900 000 0000</p>
              </div>
            </CardMaterial>
          </Tilt3D>
          <div style={{ height: 96 }} />
        </AbsoluteFill>
      </CameraPush>
    </AbsoluteFill>
  );
}
