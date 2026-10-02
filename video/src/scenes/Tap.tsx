import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CardFace, MiniProfile, PhoneFrame } from "@/components/landing/Phone";
import { HomeScreen } from "@/components/landing/Ios";
import { VIDEO_REALTOR } from "../personas";
import { sheetVars, SHEETS } from "@/components/survey/sheet";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { PointSnap } from "../transitions/PointSnap";
import { CameraPush } from "../fx/CameraPush";
import { Tilt3D } from "../fx/Tilt3D";
import { CardMaterial } from "../fx/CardMaterial";
import { KineticCaption } from "../fx/KineticCaption";
import type { Pose } from "../fx/pose";
import { TAP } from "../fx/tap";

const LINE = "#B4C1F2"; // the line colour, lifted to read on the dark home screen
const REST: Pose = { rx: 0, ry: 0, z: 0, x: 0, y: 0 };
// The phone tips in slightly and settles flat; the card drops in from above, tilted back, and lands behind the phone's top edge.
const PHONE_FROM: Pose = { rx: 9, ry: -7, z: -60, x: 0, y: 40 };
const CARD_FROM: Pose = { rx: 22, ry: 10, z: 60, x: 150, y: -300 };
const CARD_START = 8; // settles by frame 53, holds ~7 frames before contact
const RING_DIAMETER = 420;
const RINGS = [0, 5, 10]; // frames after contact each ring starts

export function Tap() {
  const frame = useCurrentFrame();
  const { contactFrame, phone, contact, card } = TAP;
  const open = progress(frame, contactFrame + 4, 18); // profile rises just after contact
  const nudge = frame >= contactFrame && frame < contactFrame + 3 ? 2 : 0; // phone takes the tap
  return (
    <AbsoluteFill style={{ background: "#EEF1F4" }}>
      <CameraPush frames={150}>
        <AbsoluteFill style={{ padding: 96, gap: 64 }}>
          <div style={{ height: 220 }}>{linesFor("tap").map((l) => <KineticCaption key={l.text} line={l} ink="#12161F" size={88} />)}</div>
          <div style={{ position: "relative", width: 888, height: 1300 }}>
            {/* Behind the phone: the card, so its lower part is hidden by the phone's top edge. */}
            <Tilt3D from={CARD_FROM} to={REST} start={CARD_START} style={{ position: "absolute", left: card.x, top: card.y, width: card.width, height: card.height, zIndex: 1 }}>
              <div style={{ transform: "rotate(-7deg)" }}>
                <CardMaterial at={CARD_START + 14} edge="#0A0C10" radius={12}>
                  <CardFace skin="charcoal" realistic className="w-full" />
                </CardMaterial>
              </div>
            </Tilt3D>
            <Tilt3D from={PHONE_FROM} to={REST} start={0} style={{ position: "absolute", left: phone.x, top: phone.y, width: phone.width, height: phone.height, zIndex: 2 }}>
              <div style={{ width: phone.width, height: phone.height, transform: `translateY(${nudge}px)` }}>
                {/* The phone is drawn at its natural 300 px and scaled up to fill the frame. */}
                <div style={{ transformOrigin: "top left", transform: "scale(1.9)" }}>
                  <PhoneFrame className="relative">
                    <div style={{ position: "absolute", inset: 0 }}><HomeScreen /></div>
                    <div style={{ position: "absolute", inset: 0, ...sheetVars(SHEETS.whiteprint), transform: `translateY(${(1 - open) * 100}%)`, backgroundColor: "var(--sv-ground)" }}>
                      <MiniProfile persona={VIDEO_REALTOR} saveLabel="Save contact" />
                    </div>
                  </PhoneFrame>
                </div>
              </div>
            </Tilt3D>
            {/* Contact cues on top: hairline rings from the contact point, then the red point. */}
            <div style={{ position: "absolute", left: contact.x, top: contact.y, width: 0, height: 0, zIndex: 3 }}>
              {RINGS.map((delay) => {
                const p = progress(frame, contactFrame + delay, 18);
                if (frame < contactFrame + delay || p >= 1) return null;
                return <div key={delay} aria-hidden="true" style={{ position: "absolute", left: -RING_DIAMETER / 2, top: -RING_DIAMETER / 2, width: RING_DIAMETER, height: RING_DIAMETER, borderRadius: "50%", border: `1.5px solid ${LINE}`, opacity: 1 - p, transform: `scale(${0.15 + p * 0.85})` }} />;
              })}
              <div style={{ position: "absolute", left: -14, top: -14, transform: `scale(${1 - progress(frame, contactFrame + 20, 12)})` }}><PointSnap at={contactFrame} size={28} /></div>
            </div>
          </div>
        </AbsoluteFill>
      </CameraPush>
    </AbsoluteFill>
  );
}
