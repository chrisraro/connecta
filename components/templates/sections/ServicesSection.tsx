import { ProfileInfo } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

type Services = NonNullable<ProfileInfo["services"]>;

export function ServicesSection({ services, theme, index }: { services: Services; theme: TemplateTheme; index: number }) {
  return (
    <SectionShell theme={theme} index={index} heading="Services">
      <div className="flex flex-wrap gap-3">
        {services.map((service, i) => (
          <span
            key={i}
            className="px-5 py-2.5 rounded-full text-sm"
            style={{ backgroundColor: theme.colors.surface, color: theme.colors.accent }}
          >
            {service}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}
