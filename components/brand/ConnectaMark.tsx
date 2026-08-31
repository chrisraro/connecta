/**
 * Inline SVG delivery for the product's mark: renders the mark's <path>
 * directly in the DOM, inheriting `currentColor` from its surrounding
 * context and issuing no network request, unlike an <img>/<Image>
 * reference to the public asset.
 *
 * public/brand/connecta-mark.svg is the source of truth for this geometry;
 * this component is just its inline delivery mechanism — do not edit the
 * path data here independently of that file.
 *
 * PLACEHOLDER ARTWORK: the geometry below is carried over unchanged from
 * the previous identity (a solid Greek sigma). It has not yet been
 * replaced with the product's own lettermark — treat this as provisional,
 * not finished.
 */
export function ConnectaMark({
  className,
  title,
}: {
  className?: string;
  /** Accessible name. Omit (leave undefined) when the mark sits next to the
   *  visible product name — it's then decorative and hidden from the
   *  accessibility tree so screen readers don't announce the name twice. */
  title?: string;
}) {
  const decorative = !title;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16 10 H50 V18 H32 L44 30 V34 L32 46 H50 V54 H16 V46 L30 32 L16 18 Z"
      />
    </svg>
  );
}
