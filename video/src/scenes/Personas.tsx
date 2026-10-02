import { AbsoluteFill, Sequence } from "remotion";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { CardMock } from "@/components/landing/CardMock";
import { SHOWCASE } from "@/components/landing/SkinShowcase";
import { PERSONAS } from "@/components/landing/IndustryDemo";
import { cardSkin } from "@/lib/cardSkins";
import { Caption } from "../Caption";
import { linesFor } from "../copy";
import { LineWipe } from "../transitions/LineWipe";

const EACH = 60; // 2 s per persona; 4 personas fill the 8 s beat

export function Personas() {
  return (
    <AbsoluteFill style={{ background: "#EEF1F4" }}>
      {SHOWCASE.map(({ skin, persona }, i) => {
        const p = PERSONAS[persona];
        return (
          <Sequence key={skin} from={i * EACH} durationInFrames={EACH + 15}>
            {/* Caption owns the top 300 px; the card and its skin label sit below it. */}
            <AbsoluteFill style={{ background: "#EEF1F4", alignItems: "center", justifyContent: "flex-start", paddingTop: 400, gap: 40 }}>
              <CardMock className="w-[760px] [&>[data-digital-card]]:max-w-none">
                <DigitalBusinessCard fullName={p.name} title={p.title} company={p.company} phone="" email="" avatarUrl={p.photo} config={{ skin }} orientation="portrait" qrValue="https://connectaph.vercel.app" />
              </CardMock>
              <p style={{ fontFamily: "Archivo", fontSize: 44, fontWeight: 700, color: "#12161F", margin: 0 }}>{cardSkin(skin).label}</p>
            </AbsoluteFill>
            {i < SHOWCASE.length - 1 && <LineWipe at={EACH - 15} />}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ padding: 96, justifyContent: "flex-start" }}>{linesFor("personas").map((l) => <Caption key={l.text} line={l} ink="#12161F" size={84} />)}</AbsoluteFill>
    </AbsoluteFill>
  );
}
