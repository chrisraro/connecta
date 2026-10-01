import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { PAGE_TITLE } from "@/components/marketing/siteLayout";
import { SHEETS } from "@/components/survey/sheet";
import { sheetVars } from "@/components/survey/sheet";
import survey from "@/components/survey/survey.module.css";

/**
 * A public dead end (404, a card that can't open yet): the site header and
 * footer around one centred message, on the light whiteprint sheet whatever
 * the visitor's theme, so it reads as part of the public site (2026-10-01).
 */
export function PublicNotice({
  mark,
  title,
  children,
  actions,
}: {
  mark?: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={survey.sheet} style={sheetVars(SHEETS.whiteprint)}>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        {mark}
        <h1 className={`${PAGE_TITLE} ${mark ? "mt-8" : ""} max-w-[20ch]`} style={{ textWrap: "balance" }}>
          {title}
        </h1>
        {children && (
          <div className="mt-4 max-w-[48ch] text-[17px]" style={{ color: "var(--sv-soft)" }}>
            {children}
          </div>
        )}
        {actions && <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">{actions}</div>}
      </main>
      <SiteFooter />
    </div>
  );
}
