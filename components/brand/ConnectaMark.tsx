import type { CSSProperties } from "react";

/**
 * Inline SVG delivery for the product's mark: renders the mark directly in the
 * DOM, inheriting `currentColor` from its context and issuing no network
 * request, unlike an <img>/<Image> reference to the public asset.
 *
 * public/brand/connecta-mark.svg is the source of truth for this geometry;
 * this component is only its delivery mechanism, so do not edit the path data
 * here independently of that file.
 *
 * The mark is a surveyed lot: an eight-corner boundary with 45° chamfers and
 * its right side left open, drawn in currentColor. The red dot in the gap is
 * the point of beginning. The dot is always red; pass `dotColor` only to pick
 * the red that holds contrast on a dark ground.
 */
export function ConnectaMark({
  className,
  title,
  dotColor = "#D0312D",
  style,
}: {
  className?: string;
  /** Accessible name. Omit (leave undefined) when the mark sits next to the
   *  visible product name — it's then decorative and hidden from the
   *  accessibility tree so screen readers don't announce the name twice. */
  title?: string;
  dotColor?: string;
  style?: CSSProperties;
}) {
  const decorative = !title;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      style={style}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M50 23 L37 10 H19 L6 23 V41 L19 54 H37 L50 41"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinejoin="miter"
      />
      <circle cx="57" cy="32" r="4.5" fill={dotColor} />
    </svg>
  );
}
