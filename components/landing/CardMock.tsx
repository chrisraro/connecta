import type { CSSProperties, ReactNode } from "react";

/**
 * A card mockup's physical frame (2026-10-02): a hairline edge so a light
 * skin (Crimson's split half) can't dissolve into the light page, and a low
 * contact shadow plus a soft ambient one so the card sits on the page like
 * printed stock. Marketing mockups only: the real card component stays flat,
 * so the PNG a user downloads carries no shadow.
 */
export const CARD_MOCK_STYLE: CSSProperties = {
  borderRadius: 12,
  boxShadow: [
    "0 0 0 1px rgb(18 22 31 / 0.16)",
    "0 1px 2px rgb(18 22 31 / 0.18)",
    "0 14px 30px -12px rgb(18 22 31 / 0.38)",
  ].join(", "),
};

/** Decorative: a mockup repeats sample content, so screen readers skip it. */
export function CardMock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-card-mock aria-hidden="true" className={`relative ${className}`} style={CARD_MOCK_STYLE}>
      {children}
    </div>
  );
}
