import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

type TechStack = NonNullable<ProfileInfo["techStack"]>;

export function TechStackSection({
  techStack,
  theme,
  index,
}: {
  techStack: TechStack;
  theme: TemplateTheme;
  index: number;
}) {
  return (
    <SectionShell theme={theme} index={index} heading="Tech Stack" surface>
      <div className="space-y-6">
        {techStack.map((stack, i) => (
          <div key={i}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: theme.colors.inkSoft }}>
              {stack.category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {stack.skills.map((skill, j) => (
                <span
                  key={j}
                  className="px-4 py-2 rounded-full text-xs"
                  style={{ backgroundColor: theme.colors.background, color: theme.colors.ink }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
