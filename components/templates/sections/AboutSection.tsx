import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

export function AboutSection({
  agent,
  theme,
  index,
}: {
  agent: ProfileInfo;
  theme: TemplateTheme;
  index: number;
}) {
  if (!agent.about) return null;

  return (
    <SectionShell theme={theme} index={index} heading="About" surface>
      <p
        className="text-base leading-relaxed"
        style={{ color: theme.colors.inkSoft, lineHeight: "1.7" }}
      >
        {agent.about}
      </p>
    </SectionShell>
  );
}
