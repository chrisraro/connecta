import { MapPin, ExternalLink } from "lucide-react";
import { PropertyListingItem } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";

export function PropertyListingsSection({
  propertyListings,
  theme,
  index,
}: {
  propertyListings: PropertyListingItem[];
  theme: TemplateTheme;
  index: number;
}) {
  return (
    <SectionShell theme={theme} index={index} heading="Properties">
      <div className="space-y-4">
        {propertyListings.map((property, i) => (
          <div
            key={i}
            className="rounded-[var(--r-lg)] p-5"
            style={{ backgroundColor: theme.colors.surface, boxShadow: "var(--e-raised)" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3
                  className="font-medium text-base"
                  style={{ fontFamily: `var(${theme.fontVars.display})`, color: theme.colors.ink }}
                >
                  {property.title}
                </h3>
                {property.location && (
                  <p
                    className="text-xs flex items-center gap-1 mt-1"
                    style={{ color: theme.colors.inkSoft }}
                  >
                    <MapPin className="w-3 h-3" /> {property.location}
                  </p>
                )}
                {property.description && (
                  <p
                    className="text-sm mt-2 leading-relaxed"
                    style={{ color: theme.colors.inkSoft }}
                  >
                    {property.description}
                  </p>
                )}
              </div>
              {property.price && (
                <span
                  className="text-lg font-medium ml-4 shrink-0"
                  style={{ color: theme.colors.accent }}
                >
                  {property.price}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3">
              {property.status && (
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ backgroundColor: theme.colors.background, color: theme.colors.accent }}
                >
                  {property.status.replace("-", " ")}
                </span>
              )}
              {property.link && (
                <a
                  href={property.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 font-medium"
                  style={{ color: theme.colors.accent }}
                >
                  Details <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
