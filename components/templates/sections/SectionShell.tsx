import { ReactNode } from "react";
import { TemplateTheme } from "../theme";
import { measureClass, rhythmClass } from "./measure";

/**
 * Shared frame for every content section (About, TechStack, Testimonials,
 * etc). Owns the parts of composition that would otherwise be re-typed in
 * every section file: background alternation, content measure/rhythm, the
 * section's rule style, and heading placement.
 *
 * - rule "hairline": a 1px top border reads section boundaries quietly.
 * - rule "numbered": a monospace index tag ("03") stands in for a border.
 * - rule "none": no divider at all — only background alternation reads.
 * - headingPlacement "beside": heading sits in a narrow column to the left
 *   of the content (a magazine folio), instead of stacked above it.
 *
 * `bleed` (only meaningful when headingPlacement is "beside", i.e. only
 * Editorial): the caller's content uses the `-mx-6` "bleed" imagery classes
 * from sections/imagery.ts, which cancel exactly the measure container's
 * own `px-6`. Nesting that inside the beside two-column flex row would only
 * let it bleed on one side (the row's `gap-4` + the ~80px heading column
 * eat into the other), producing a lopsided offset instead of a true
 * edge-to-edge bleed, and risking visual collision with the heading text.
 * When `bleed` is set, the heading is stacked above full-width content
 * instead of sitting beside it, so the bleed classes cancel the same
 * container padding every other layout does.
 */
export function SectionShell({
  theme,
  index,
  heading,
  surface = false,
  bleed = false,
  children,
}: {
  theme: TemplateTheme;
  index: number;
  heading?: string;
  surface?: boolean;
  bleed?: boolean;
  children: ReactNode;
}) {
  const { rule, headingPlacement } = theme.composition;
  const background = surface ? theme.colors.surface : theme.colors.background;
  const besideLayout = headingPlacement === "beside" && !bleed;

  const headingNode = heading ? (
    <h2
      className={headingPlacement === "beside" ? "text-base shrink-0 w-20" : "text-2xl mb-6"}
      style={{
        fontFamily: `var(${theme.fontVars.display})`,
        color: theme.colors.ink,
        fontWeight: rule === "numbered" ? 700 : 400,
      }}
    >
      {rule === "numbered" && (
        <span
          className="mr-3 text-xs"
          style={{ fontFamily: `var(${theme.fontVars.body})`, color: theme.colors.accent }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      {heading}
    </h2>
  ) : null;

  return (
    <section
      style={{
        backgroundColor: background,
        borderTop: rule === "hairline" ? `1px solid ${theme.colors.line}` : undefined,
      }}
    >
      <div className={`${measureClass(theme)} ${rhythmClass(theme)}`}>
        {besideLayout && headingNode ? (
          <div className="flex flex-row gap-4">
            {headingNode}
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          <>
            {headingNode}
            {children}
          </>
        )}
      </div>
    </section>
  );
}
