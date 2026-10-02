import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MiniProfile, PhoneFrame } from "@/components/landing/Phone";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { LotDraw } from "../transitions/LotDraw";

export function Profile() {
  const frame = useCurrentFrame();
  const scroll = progress(frame, 90, 120); // gentle scroll down to the listings
  return (
    <AbsoluteFill style={{ background: "#EEF1F4", padding: 96, gap: 64 }}>
      <div style={{ height: 220 }}>{linesFor("profile").map((l) => <Caption key={l.text} line={l} ink="#12161F" size={84} />)}</div>
      {/* Same stage as Tap: 888 = 1080 frame width minus 96 px padding each side; phone drawn at 300 px, scaled 1.9x. */}
      <div style={{ position: "relative", width: 888, height: 1300 }}>
        {/* The lot sits behind the phone; 1000 px centres on the frame, top edge 80 px above the phone. */}
        <div style={{ position: "absolute", left: -56, top: -80 }}><LotDraw at={10} length={70} size={1000} color="#2B3F8F" /></div>
        <div style={{ position: "absolute", left: 159, top: 0, transformOrigin: "top left", transform: "scale(1.9)" }}>
          <PhoneFrame className="relative">
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#EEF1F4" }}>
              <div style={{ transform: `translateY(${-scroll * 45}%)` }}>
                <MiniProfile persona={PERSONAS.realtor} saveLabel="Save contact" />
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
}
