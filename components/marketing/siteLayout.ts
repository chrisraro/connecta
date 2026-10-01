import survey from "@/components/survey/survey.module.css";
import { LANDING_COPY as t } from "@/components/landing/copy";

/**
 * Layout classes shared by the public pages. Kept out of SiteChrome.tsx
 * ("use client"): a server component (components/legal/LegalPage.tsx) that
 * imports a plain value from a client module gets a client reference, not
 * the string, and its className renders as that reference's source.
 */

/** Same measure as the homepage sections. */
export const SITE_CONTAINER = "mx-auto w-full max-w-[1180px] px-4 lg:px-14";

/** Page titles, matching the homepage section headings. */
export const PAGE_TITLE = `${survey.expanded} text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`;

/** The homepage's call-to-action buttons. Pair SECONDARY_CTA with borderColor var(--sv-line). */
export const PRIMARY_CTA = `${survey.primary} ${survey.semiExpanded} flex h-14 items-center justify-center gap-2 px-7 text-[17px] font-bold`;
export const SECONDARY_CTA = `${survey.cell} ${survey.semiExpanded} flex h-14 items-center justify-center gap-2 border-[1.5px] px-7 text-[17px] font-bold`;

/** The public header's links, in order (desktop nav and phone menu). */
export const NAV_LINKS = [
  { href: "/#how", label: t.nav.how },
  { href: "/#demo", label: t.nav.demo },
  { href: "/#pricing", label: t.nav.pricing },
  { href: "/#roadmap", label: t.nav.roadmap },
  { href: "/shop", label: t.nav.shop },
];
