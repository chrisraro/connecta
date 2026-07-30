/**
 * Herald's monogram — an "H" whose crossbar is a chevron, the fundamental
 * heraldic charge. Inlined from the source SVG (public/brand/herald-mark.svg)
 * so it inherits `currentColor` from context and never issues a network
 * request, unlike an <img>/<Image> reference to the public asset.
 *
 * Do not edit the path geometry here independently of
 * public/brand/herald-mark.svg — that file is the source of truth; this
 * component is just its inline delivery mechanism.
 */
export function HeraldMark({
  className,
  title,
}: {
  className?: string;
  /** Accessible name. Omit (leave undefined) when the mark sits next to the
   *  visible word "Herald" — it's then decorative and hidden from the
   *  accessibility tree so screen readers don't announce "Herald" twice. */
  title?: string;
}) {
  const decorative = !title;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M17 16h7v32h-7zM40 16h7v32h-7zM24 32l8-4 8 4v6l-8-4-8 4v-6z"
      />
    </svg>
  );
}
