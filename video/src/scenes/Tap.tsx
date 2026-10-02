import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CardFace, MiniProfile, PhoneFrame } from "@/components/landing/Phone";
import { HomeScreen } from "@/components/landing/Ios";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { sheetVars, SHEETS } from "@/components/survey/sheet";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { progress } from "../motion";
import { PointSnap } from "../transitions/PointSnap";

export function Tap() {
  const frame = useCurrentFrame();
  const swing = progress(frame, 0, 24); // card flies in
  const ripple = progress(frame, 30, 24); // NFC ripple
  const open = progress(frame, 48, 18); // profile slides over the home screen
  return (
    <AbsoluteFill style={{ background: "#EEF1F4", padding: 96, gap: 64 }}>
      <div style={{ height: 120 }}>{linesFor("tap").map((l) => <Caption key={l.text} line={l} ink="#12161F" />)}</div>
      <div style={{ position: "relative", width: 888, height: 1300 }}>
        {/* The phone is drawn at its natural 300 px and scaled up to fill the frame. */}
        <div style={{ position: "absolute", left: 159, top: 0, transformOrigin: "top left", transform: "scale(1.9)" }}>
          <PhoneFrame className="relative">
            <div style={{ position: "absolute", inset: 0 }}><HomeScreen /></div>
            <div style={{ position: "absolute", inset: 0, ...sheetVars(SHEETS.whiteprint), transform: `translateY(${(1 - open) * 100}%)`, backgroundColor: "var(--sv-ground)" }}>
              <MiniProfile persona={PERSONAS.realtor} saveLabel="Save contact" />
            </div>
          </PhoneFrame>
        </div>
        <div style={{ position: "absolute", left: 320, top: 930, width: 540, transform: `translate(${(1 - swing) * 700}px, ${(1 - swing) * 400}px) rotate(${(1 - swing) * 14}deg)` }}>
          <CardFace skin="charcoal" realistic className="w-full" />
        </div>
        {ripple > 0 && ripple < 1 && (
          <div style={{ position: "absolute", left: 340, top: 830, width: 400, height: 400, borderRadius: "50%", border: "2px solid #2B3F8F", opacity: 1 - ripple, transform: `scale(${0.4 + ripple * 0.8})` }} />
        )}
        <div style={{ position: "absolute", left: 560, top: 1080 }}><PointSnap at={30} size={36} /></div>
      </div>
    </AbsoluteFill>
  );
}
