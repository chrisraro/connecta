import survey from "@/components/survey/survey.module.css";

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
