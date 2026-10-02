import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MiniProfile, PhoneFrame, type FormPhase } from "@/components/landing/Phone";
import { VIDEO_REALTOR } from "../personas";
import { LANDING_COPY } from "@/components/landing/copy";
import { sheetVars, SHEETS } from "@/components/survey/sheet";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { CameraPush } from "../fx/CameraPush";
import { KineticCaption } from "../fx/KineticCaption";
import { Tilt3D } from "../fx/Tilt3D";
import type { Pose } from "../fx/pose";

const BANNER_AT = 105; // absolute 585, on the 15-frame grid
// The notification leans back from its top edge and drops flat: it settles, it does not bounce.
const BANNER_FROM: Pose = { rx: -16, ry: 0, z: -30, x: 0, y: -80 };
const BANNER_REST: Pose = { rx: 0, ry: 0, z: 0, x: 0, y: 0 };

export function Leads() {
  const frame = useCurrentFrame();
  const form: FormPhase = frame < 30 ? 1 : frame < 85 ? 2 : 3; // shown, filled, sent
  const banner = progress(frame, BANNER_AT, 12);
  return (
    <AbsoluteFill style={{ background: "#12161F" }}>
      <CameraPush frames={180}>
        <AbsoluteFill style={{ padding: 96, gap: 64 }}>
          <div style={{ height: 220 }}>{linesFor("leads").map((l) => <KineticCaption key={l.text} line={l} ink="#EEF1F4" size={88} />)}</div>
          {/* Same stage as Tap: 888 = 1080 frame width minus 96 px padding each side; phone drawn at 300 px, scaled 1.9x. */}
          <div style={{ position: "relative", width: 888, height: 1300 }}>
            <div style={{ position: "absolute", left: 159, top: 0, transformOrigin: "top left", transform: "scale(1.9)" }}>
              <PhoneFrame className="relative">
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...sheetVars(SHEETS.whiteprint), backgroundColor: "var(--sv-ground)" }}>
                  <MiniProfile persona={VIDEO_REALTOR} saveLabel="Save contact" form={form} />
                </div>
              </PhoneFrame>
            </div>
            {/* The owner's notification; red is the status colour. */}
            <Tilt3D from={BANNER_FROM} to={BANNER_REST} start={BANNER_AT} style={{ position: "absolute", left: 129, width: 630, top: 20, opacity: banner }}>
              <div style={{ background: "#EEF1F4", border: "1.5px solid #D0312D", padding: "28px 32px", fontFamily: "Archivo" }}>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: "#C42A26" }}>{LANDING_COPY.newLead}</p>
                <p style={{ margin: "8px 0 0", fontSize: 34, color: "#12161F" }}>{LANDING_COPY.leadDemo}</p>
              </div>
            </Tilt3D>
          </div>
        </AbsoluteFill>
      </CameraPush>
    </AbsoluteFill>
  );
}
