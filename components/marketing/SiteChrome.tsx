"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut } from "@/components/auth/AuthGate";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA, publicHost } from "@/lib/brand";
import { SHEETS } from "@/components/survey/sheet";
import { sheetVars } from "@/components/survey/SurveyProfile";
import survey from "@/components/survey/survey.module.css";
import { LANDING_COPY as t } from "@/components/landing/copy";

/**
 * The one header and footer of the public site: the homepage, the shop and
 * the legal pages (2026-10-01). Both carry the whiteprint sheet's colours
 * themselves, so they look the same whatever page hosts them; the public
 * routes are light-only (components/ThemeProvider.tsx).
 */

/** Same measure as the homepage sections. */
export const SITE_CONTAINER = "mx-auto w-full max-w-[1180px] px-4 lg:px-14";

/** Page titles, matching the homepage section headings. */
export const PAGE_TITLE = `${survey.expanded} text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`;

const whiteprint = sheetVars(SHEETS.whiteprint);

const NAV_LINKS = [
  { href: "/#how", label: t.nav.how },
  { href: "/#demo", label: t.nav.demo },
  { href: "/#pricing", label: t.nav.pricing },
  { href: "/shop", label: t.nav.shop },
];

export function SiteHeader({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const inShop = pathname.startsWith("/shop");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Escape closes the phone menu and hands focus back to its button.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const current = (href: string) => (href === "/shop" && inShop ? "page" : undefined);

  return (
    <header
      className="sticky top-0 z-30 border-b-[1.5px]"
      style={{ ...whiteprint, backgroundColor: "var(--sv-ground)", color: "var(--sv-ink)", borderColor: "var(--sv-line)" }}
    >
      <nav aria-label="Main" className={`${SITE_CONTAINER} flex h-16 items-center justify-between gap-3`}>
        <Link href="/" className="flex min-h-11 items-center gap-2" aria-label={`${CONNECTA.name} home`}>
          <ConnectaMark className="h-7 w-7" style={{ color: "var(--sv-line)" }} />
          <span className={`${survey.expanded} hidden text-[15px] font-bold tracking-[0.1em] min-[420px]:inline`}>
            {CONNECTA.name.toUpperCase()}
          </span>
        </Link>
        <div className="hidden items-center gap-6 text-[15px] font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={survey.link}
              aria-current={current(l.href)}
              style={current(l.href) ? { textDecorationThickness: "2px" } : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <SignedOut>
            <Link href="/auth" className={`${survey.link} hidden px-2 text-[14px] font-medium md:inline`}>
              {t.nav.signIn}
            </Link>
            <Link href="/auth?mode=signup" className={`${survey.primary} flex h-11 items-center px-4 text-[14px] font-bold`}>
              {t.nav.start}
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className={`${survey.primary} flex h-11 items-center px-4 text-[14px] font-bold`}>
              {t.nav.dashboard}
            </Link>
          </SignedIn>
          <button
            ref={menuButton}
            type="button"
            className={`${survey.cell} flex size-11 items-center justify-center border-[1.5px] md:hidden`}
            style={{ borderColor: "var(--sv-line)" }}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Phone menu: the same links as the desktop nav, one 48px row each. */}
      {menuOpen && (
        <div
          id="site-menu"
          className="absolute inset-x-0 top-full border-b-[1.5px] md:hidden"
          style={{ backgroundColor: "var(--sv-ground)", borderColor: "var(--sv-line)" }}
        >
          <ul className={`${SITE_CONTAINER} py-2`}>
            {NAV_LINKS.map((l) => (
              <li key={l.href} className={`border-b last:border-b-0 ${survey.rule}`}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={current(l.href)}
                  className={`${survey.cell} flex min-h-12 items-center text-[17px] font-semibold`}
                  style={current(l.href) ? { color: "var(--sv-line)" } : undefined}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <SignedOut>
              <li>
                <Link
                  href="/auth"
                  onClick={() => setMenuOpen(false)}
                  className={`${survey.cell} flex min-h-12 items-center text-[17px] font-semibold`}
                  style={{ color: "var(--sv-soft)" }}
                >
                  {t.nav.signIn}
                </Link>
              </li>
            </SignedOut>
          </ul>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t-[1.5px]"
      style={{ ...whiteprint, backgroundColor: "var(--sv-ground)", color: "var(--sv-ink)", borderColor: "var(--sv-line)" }}
    >
      <div className={`${SITE_CONTAINER} flex flex-wrap items-center justify-between gap-4 py-8 text-[14px]`}>
        <p className="flex items-center gap-2" style={{ color: "var(--sv-soft)" }}>
          <ConnectaMark className="h-5 w-5" style={{ color: "var(--sv-line)" }} />
          <span>
            {t.footerLine} &copy; {new Date().getFullYear()} {CONNECTA.name}
          </span>
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2" style={{ color: "var(--sv-soft)" }}>
          <Link href="/shop" className={survey.link}>{t.nav.shop}</Link>
          <Link href="/privacy" className={survey.link}>{t.privacy}</Link>
          <Link href="/terms" className={survey.link}>{t.terms}</Link>
          {/* Shown only once a real public domain is configured (not localhost or the placeholder). */}
          {publicHost(CONNECTA) === CONNECTA.domain && (
            <a href={`mailto:${CONNECTA.supportEmail}`} className={survey.link}>{CONNECTA.supportEmail}</a>
          )}
        </div>
      </div>
    </footer>
  );
}
