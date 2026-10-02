import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MiniProfile, PhoneFrame } from "@/components/landing/Phone";
import { VIDEO_REALTOR } from "../personas";
import { sheetVars, SHEETS } from "@/components/survey/sheet";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { LotDraw } from "../transitions/LotDraw";
import { Annotation } from "../fx/Annotation";
import { CameraPush } from "../fx/CameraPush";
import { KineticCaption } from "../fx/KineticCaption";
import { TAP } from "../fx/tap";

const NFC_AT = 24; // the pointer draws just after the first caption starts
const NFC_END = 810; // stage x where the leader ends, just past the phone's right edge (737) and clear of the lot's cut corner

export function Profile() {
  const frame = useCurrentFrame();
  const scroll = progress(frame, 90, 120); // gentle scroll down to the listings
  const nfc = 1 - progress(frame, 96, 12); // the pointer has said its piece; it leaves before the scroll
  return (
    <AbsoluteFill style={{ background: "#EEF1F4" }}>
      <CameraPush frames={240}>
        <AbsoluteFill style={{ padding: 96, gap: 64 }}>
          <div style={{ height: 220 }}>{linesFor("profile").map((l) => <KineticCaption key={l.text} line={l} ink="#12161F" size={88} />)}</div>
          {/* Same stage as Tap: 888 = 1080 frame width minus 96 px padding each side; phone drawn at 300 px, scaled 1.9x. */}
          <div style={{ position: "relative", width: 888, height: 1300 }}>
            {/* The lot sits behind the phone; 1000 px centres on the frame, top edge 80 px above the phone. 3 px line, as the match-cut lot that lands on it. */}
            <div style={{ position: "absolute", left: -56, top: -80 }}><LotDraw at={10} length={70} size={1000} color="#2B3F8F" stroke={3} /></div>
            <div style={{ position: "absolute", left: 159, top: 0, transformOrigin: "top left", transform: "scale(1.9)" }}>
              <PhoneFrame className="relative">
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...sheetVars(SHEETS.whiteprint), backgroundColor: "var(--sv-ground)" }}>
                  <div style={{ transform: `translateY(${-scroll * 45}%)` }}>
                    <MiniProfile persona={VIDEO_REALTOR} saveLabel="Save contact" />
                  </div>
                </div>
              </PhoneFrame>
            </div>
            {/* NFC: the reader sits at the top back of the phone, where the card tapped. A leader runs from that spot out past the phone's edge, where its label sits on the open ground. */}
            <div style={{ position: "absolute", inset: 0, opacity: nfc, pointerEvents: "none" }}>
              <Annotation x1={TAP.contact.x} y1={TAP.contact.y} x2={NFC_END} y2={TAP.contact.y} label="NFC" labelPos={{ x: NFC_END - 20, y: TAP.contact.y + 32 }} at={NFC_AT} color="#2B3F8F" />
            </div>
          </div>
        </AbsoluteFill>
      </CameraPush>
    </AbsoluteFill>
  );
}
