import { GraduationCap } from "lucide-react";
import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

type Education = NonNullable<ProfileInfo["education"]>;

export function EducationSection({
  education,
  theme,
  index,
}: {
  education: Education;
  theme: TemplateTheme;
  index: number;
}) {
  return (
    <SectionShell theme={theme} index={index} heading="Education">
      <div className="space-y-4">
        {education.map((edu, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 rounded-[var(--r-md)]"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <div
              className="w-10 h-10 rounded-[var(--r-sm)] flex items-center justify-center shrink-0"
              style={{ backgroundColor: theme.colors.background }}
            >
              <GraduationCap className="w-5 h-5" style={{ color: theme.colors.accent }} />
            </div>
            <div>
              <h3 className="font-medium text-sm" style={{ color: theme.colors.ink }}>
                {edu.degree}
              </h3>
              <p className="text-sm mt-1" style={{ color: theme.colors.inkSoft }}>
                {edu.school}
              </p>
              {edu.year && (
                <p className="text-xs mt-1" style={{ color: theme.colors.inkSoft }}>
                  {edu.year}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
