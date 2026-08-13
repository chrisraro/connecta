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
 *   of the content (a magazine folio), instead of stacked above it. The
 *   folio column only exists from `sm:` up: it costs a flat 80px + a 16px
 *   gap, which a phone-width measure cannot spare. At 320px the section
 *   measure is ~168px inside the builder's preview frame, so the folio left
 *   72px for body copy — narrower than a single long word, and the
 *   resulting inline overflow was clipped by the preview frame's
 *   `overflow-hidden` (measured: frame scrollWidth 232 vs clientWidth 216).
 *   Below `sm:` the heading stacks above full-width content instead.
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

  // `sm:items-start` matters beyond alignment: flex's default `stretch` made
  // the 80px heading box as tall as the entire section (measured 1740px for
  // a one-line "About"), which is a nonsense hit area and makes any layout
  // probe read the heading as wrapped onto dozens of lines.
  const besideRowClass = "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4";

  // The narrow-folio sizing belongs to the *beside* layout, not to the
  // template's heading style: when `bleed` forces the heading to stack, a
  // `w-20 shrink-0` heading is just an 80px-wide block that wraps "Recent
  // Work" onto two lines against the content below it. Keep the folio's
  // type size (that is the template's voice) but only take the column when
  // the heading actually sits in one.
  const headingClass =
    headingPlacement === "beside"
      ? `text-base ${besideLayout ? "sm:w-20 sm:shrink-0" : "mb-6"}`
      : "text-2xl mb-6";

  const headingNode = heading ? (
    <h2
      className={headingClass}
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
          <div className={besideRowClass}>
            {headingNode}
            <div className="min-w-0 sm:flex-1">{children}</div>
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
