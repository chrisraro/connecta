import { useId, type ReactNode } from "react";

/**
 * A lot on the app's sheet: a 1.5px plan-line boundary with one chamfered
 * corner, and the heading lettered on the top line (the Survey Plan
 * "heading on the boundary" pattern, from the public profile's Lot).
 *
 * Built on the app tokens (--background, --input), so it follows the theme:
 * whiteprint in light, graphite in dark.
 */
export function PlanPanel({
  heading,
  level = 2,
  children,
  className = "",
}: {
  heading?: string;
  level?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const Heading = `h${level}` as const;
  const named = Boolean(heading);

  return (
    <section
      role={named ? "region" : undefined}
      aria-labelledby={named ? id : undefined}
      className={`relative border-[1.5px] border-input bg-background px-5 pb-6 sm:px-7 ${named ? "pt-8" : "pt-6"} ${className}`}
    >
      {named && (
        <Heading
          id={id}
          className="absolute left-4 top-0 -translate-y-1/2 bg-background px-2 text-[19px] font-bold leading-none [font-stretch:112%] sm:left-6"
        >
          {heading}
        </Heading>
      )}
      {children}
      {/* The chamfer: a ground-coloured mask hides the square corner and the
          45° boundary is drawn across it. */}
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        className="absolute -bottom-[1.5px] -right-[1.5px]"
      >
        <path d="M18 0 V18 H0 Z" fill="var(--background)" />
        <path d="M17.25 0 L0 17.25" fill="none" stroke="var(--input)" strokeWidth="1.5" />
      </svg>
    </section>
  );
}
