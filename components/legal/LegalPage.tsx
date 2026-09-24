import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";

/**
 * Shared shell for /privacy and /terms.
 *
 * Both pages are long-form legal text generated from a factual data-flow
 * inventory (see the audit that produced them), NOT reviewed by a lawyer.
 * Every render carries a fixed, un-dismissable draft notice so nobody mistakes
 * this for a launch-ready policy. Do not remove DraftNotice from either page
 * without a real legal sign-off replacing it.
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b-[1.5px] border-input bg-background">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"
        >
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
          >
            <ConnectaMark className="h-7 w-7 text-primary" />
            <span className="text-[15px] font-bold tracking-[0.1em] [font-stretch:125%]">
              {CONNECTA.name.toUpperCase()}
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back home
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <DraftNotice />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,68ch)_16rem] lg:gap-16">
          <div>
            <h1 className="text-3xl font-bold [font-stretch:112%] sm:text-4xl">
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

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          &copy; {new Date().getFullYear()} {CONNECTA.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export function DraftNotice() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-[1.5px] border-[var(--connecta-mark)] p-4 sm:p-5"
    >
      <TriangleAlert
        className="mt-0.5 size-5 shrink-0 text-[var(--connecta-mark-text)]"
        aria-hidden="true"
      />
      <div className="text-sm leading-6 text-[var(--connecta-mark-text)]">
        <p className="font-semibold">Draft — not legal advice, not yet approved for launch.</p>
        <p className="mt-1">
          This page was generated from an engineering audit of what {CONNECTA.name}&apos;s codebase
          actually does. It has not been reviewed by a Philippine-qualified lawyer or the
          company&apos;s Data Protection Officer, and must not be treated as a compliant policy
          until it has been. Placeholders in brackets — like{" "}
          <Placeholder>[COMPANY LEGAL NAME]</Placeholder> — mark facts that have not been supplied
          yet and must be filled in before publication.
        </p>
      </div>
    </div>
  );
}

/** Inline marker for a fact that must be supplied by the human owner. */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-dashed border-[var(--connecta-mark-text)]/60 bg-[var(--connecta-mark)]/10 px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--connecta-mark-text)]">
      {children}
    </span>
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

/** Highlighted call-out for an honest "here's a known gap" statement. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-[1.5px] border-input bg-background p-4 text-sm leading-6">
      {children}
    </div>
  );
}
