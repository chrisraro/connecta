import { ExternalLink } from "lucide-react";
import { InlineProject } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";
import { projectListClass, projectCardClass } from "./imagery";

export function InlineProjectsSection({
  inlineProjects,
  theme,
  index,
}: {
  inlineProjects: InlineProject[];
  theme: TemplateTheme;
  index: number;
}) {
  return (
    <SectionShell
      theme={theme}
      index={index}
      heading="Projects"
      bleed={theme.composition.imagery === "bleed"}
    >
      <div className={projectListClass(theme)}>
        {inlineProjects.map((project, i) => (
          <div
            key={i}
            className={`${projectCardClass(theme)} p-5`}
            style={{ backgroundColor: theme.colors.surface }}
          >
            <h3
              className="font-medium text-base mb-1"
              style={{ fontFamily: `var(${theme.fontVars.display})`, color: theme.colors.ink }}
            >
              {project.title}
            </h3>
            {project.category && (
              <p className="text-xs mb-2 font-medium" style={{ color: theme.colors.accent }}>
                {project.category.replace("-", " ")}
              </p>
            )}
            {project.description && (
              <p className="text-sm leading-relaxed" style={{ color: theme.colors.inkSoft }}>
                {project.description}
              </p>
            )}
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1 font-medium mt-3"
                style={{ color: theme.colors.accent }}
              >
                View Project <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
