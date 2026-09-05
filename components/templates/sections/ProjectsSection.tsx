import { ExternalLink } from "lucide-react";
import { ProjectItem, ProfileData } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";
import { projectListClass, projectCardClass } from "./imagery";
import { ProfileImage } from "../ProfileImage";

export function ProjectsSection({
  projects,
  theme,
  index,
  resolvedImages,
}: {
  projects: ProjectItem[];
  theme: TemplateTheme;
  index: number;
  resolvedImages?: ProfileData["resolvedImages"];
}) {
  return (
    <SectionShell
      theme={theme}
      index={index}
      heading="Recent Work"
      bleed={theme.composition.imagery === "bleed"}
    >
      <div className={projectListClass(theme)}>
        {projects.slice(0, 3).map((project, i) => (
          <div
            key={i}
            className={projectCardClass(theme)}
            style={{
              backgroundColor: theme.colors.surface,
              boxShadow: theme.composition.imagery === "inset" ? "var(--e-raised)" : undefined,
            }}
          >
            {project.images && project.images[0] && (
              <div className="relative aspect-video">
                <ProfileImage
                  src={project.images[0]}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  resolvedImages={resolvedImages}
                />
              </div>
            )}
            <div className="p-5">
              <h3
                className="font-medium text-base mb-2"
                style={{ fontFamily: `var(${theme.fontVars.display})`, color: theme.colors.ink }}
              >
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: theme.colors.inkSoft }}>
                  {project.description}
                </p>
              )}
              {project.externalUrl && (
                <a
                  href={project.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 font-medium"
                  style={{ color: theme.colors.accent }}
                >
                  View Project <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
