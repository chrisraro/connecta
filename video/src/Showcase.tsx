import { AbsoluteFill } from "remotion";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { CardMock } from "@/components/landing/CardMock";

export function Showcase() {
  return (
    <AbsoluteFill className="items-center justify-center" style={{ background: "#EEF1F4" }}>
      <CardMock className="w-[640px]">
        <DigitalBusinessCard fullName="Nicole Bautista" title="Interior Designer" company="Demo" phone="" email="" orientation="portrait" config={{ skin: "charcoal" }} />
      </CardMock>
    </AbsoluteFill>
  );
}
