import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

type Experience = NonNullable<ProfileInfo["experience"]>;

export function ExperienceSection({ experience, theme, index }: { experience: Experience; theme: TemplateTheme; index: number }) {
  return (
    <SectionShell theme={theme} index={index} heading="Experience" surface>
      <div className="space-y-8">
        {experience.map((exp, i) => (
          <div key={i} className="relative pl-6">
            {/* 1px timeline rule + a small accent dot marker — not an accent stripe. */}
            <div className="absolute left-0 top-1 bottom-0 w-px" style={{ backgroundColor: theme.colors.line }} />
            <div
              className="absolute left-0 top-1 w-2 h-2 rounded-full -translate-x-1/2"
              style={{ backgroundColor: theme.colors.accent }}
            />
            <div>
              <h3 className="font-medium text-base mb-1" style={{ color: theme.colors.ink }}>{exp.title}</h3>
              <p className="text-sm" style={{ color: theme.colors.inkSoft }}>{exp.company}</p>
              <p className="text-xs mt-1" style={{ color: theme.colors.inkSoft }}>{exp.period}</p>
              {exp.description && (
                <p className="text-sm mt-3 leading-relaxed" style={{ color: theme.colors.inkSoft }}>{exp.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
