import { PAGE_TITLE, SITE_CONTAINER, SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

/**
 * Shared shell for /privacy and /terms.
 *
 * Both pages state only what the product actually does (checked against the
 * code, 2026-09-27) and name the operator from CONNECTA.operator. Keep them
 * in step with the product: lib/legalPages.test.ts fails on a draft banner,
 * a bracketed placeholder or a retired provider.
 */

export function LegalPage({
  title,
  lastUpdated,
  toc,
  children,
}: {
  title: string;
  lastUpdated: string;
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className={`${SITE_CONTAINER} py-12 sm:py-16`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,68ch)_16rem] lg:gap-16">
          <div>
            <h1 className={PAGE_TITLE}>
              {title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: <time>{lastUpdated}</time>
            </p>

            <div className="mt-10 max-w-[70ch] text-[15px] leading-7 text-foreground/90 [&_h2]:[font-stretch:112%]">
              {children}
            </div>
          </div>

          {/* Table of contents — hidden on small screens to avoid pushing the
              actual content below the fold on a 390px viewport. */}
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24 border-[1.5px] border-input bg-background p-5">
              <p className="text-[13px] font-bold">
                On this page
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-12 text-xl font-bold [font-stretch:112%] first:mt-0 sm:text-2xl">
        {heading}
      </h2>
      <div className="mt-3 space-y-4 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-foreground [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  );
}

/** A highlighted note inside a section. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-[1.5px] border-input bg-background p-4 text-sm leading-6">
      {children}
    </div>
  );
}
