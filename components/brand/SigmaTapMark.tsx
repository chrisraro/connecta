/**
 * SigmaTap's monogram — a solid Greek sigma. Inlined from the source SVG
 * (public/brand/sigmatap-mark.svg) so it inherits `currentColor` from
 * context and never issues a network request, unlike an <img>/<Image>
 * reference to the public asset.
 *
 * Deliberately has no radiating NFC arcs — see the design-rationale comment
 * in public/brand/sigmatap-mark.svg for why that variant was rejected.
 *
 * Do not edit the path geometry here independently of
 * public/brand/sigmatap-mark.svg — that file is the source of truth; this
 * component is just its inline delivery mechanism.
 */
export function SigmaTapMark({
  className,
  title,
}: {
  className?: string;
  /** Accessible name. Omit (leave undefined) when the mark sits next to the
   *  visible word "SigmaTap" — it's then decorative and hidden from the
   *  accessibility tree so screen readers don't announce "SigmaTap" twice. */
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
