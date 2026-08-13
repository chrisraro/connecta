import { Award } from "lucide-react";
import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

type Certification = NonNullable<ProfileInfo["certification"]>;

export function CertificationSection({
  certification,
  theme,
  index,
}: {
  certification: Certification;
  theme: TemplateTheme;
  index: number;
}) {
  return (
    <SectionShell theme={theme} index={index}>
      <div
        className="rounded-[var(--r-lg)] p-6"
        style={{ backgroundColor: theme.colors.surface, boxShadow: "var(--e-raised)" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme.colors.background }}
          >
            <Award className="w-6 h-6" style={{ color: theme.colors.accent }} />
          </div>
          <div>
            <h3
              className="font-medium text-base mb-1"
              style={{ fontFamily: `var(${theme.fontVars.display})`, color: theme.colors.ink }}
            >
              {certification.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: theme.colors.inkSoft }}>
              {certification.description}
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
