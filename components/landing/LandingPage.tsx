"use client";

import Link from "next/link";
import { SignedOut } from "@/components/auth/AuthGate";
import { CONNECTA } from "@/lib/brand";
import { SHEETS } from "@/components/survey/sheet";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { sheetVars } from "@/components/survey/SurveyProfile";
import survey from "@/components/survey/survey.module.css";
import { LANDING_COPY as t } from "./copy";
import { TapStory } from "./TapStory";
import { Pricing } from "./Pricing";
import { Roadmap } from "./Roadmap";
import { SkinShowcase } from "./SkinShowcase";
import styles from "./landing.module.css";

/** The marketing homepage in the Survey Plan world (whiteprint sheet). */
export function LandingPage() {
  const sheet = SHEETS.whiteprint;

  return (
    <div className={survey.sheet} style={sheetVars(sheet)}>
      <SiteHeader />

      <main>
        <TapStory
          t={t}
          intro={
            <div className="pb-6 pt-10 lg:pt-20">
          <h1 className={`${survey.expanded} mt-4 max-w-[16ch] text-[clamp(34px,5vw,64px)] font-bold leading-[1.02] tracking-[-0.015em]`} style={{ textWrap: "balance" }}>
            {t.heroTitle}
          </h1>
          <p className="mt-5 max-w-[56ch] text-[18px] leading-[1.6]" style={{ color: "var(--sv-soft)" }}>
            {t.heroSub}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth?mode=signup" className={`${survey.primary} ${survey.semiExpanded} flex h-14 items-center justify-center px-7 text-[17px] font-bold`}>
              {t.ctaFree}
            </Link>
            <a href="#demo" className={`${survey.cell} ${survey.semiExpanded} flex h-14 items-center justify-center border-[1.5px] px-7 text-[17px] font-bold`} style={{ borderColor: "var(--sv-line)" }}>
              {t.ctaDemo}
            </a>
          </div>
          <SignedOut>
            <p className="mt-4 text-[15px]" style={{ color: "var(--sv-soft)" }}>
              {t.haveAccount}{" "}
              <Link href="/auth" className={`${survey.link} font-semibold`} style={{ color: "var(--sv-ink)" }}>
                {t.nav.signIn}
              </Link>
            </p>
          </SignedOut>
            </div>

          }
        />

        <section aria-labelledby="compare-title" className="mx-auto max-w-[1180px] px-4 py-20 lg:px-14">
          <h2 id="compare-title" className={`${survey.expanded} text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`}>
            {t.compareTitle}
          </h2>
          <div className="mt-10 border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
            <div className="grid grid-cols-2 border-b-[1.5px] text-[15px] font-bold" style={{ borderColor: "var(--sv-line)" }}>
              <p className="px-4 py-3" style={{ color: "var(--sv-soft)" }}>{t.paper}</p>
              <p className="border-l-[1.5px] px-4 py-3" style={{ borderColor: "var(--sv-line)" }}>{t.tapCard(CONNECTA.name)}</p>
            </div>
            {t.compareRows.map(([a, b]) => (
              <div key={a} className={`grid grid-cols-2 border-b last:border-b-0 ${survey.rule}`}>
                <p className="px-4 py-4 text-[15px] leading-snug line-through decoration-1" style={{ color: "var(--sv-soft)" }}>{a}</p>
                <p className="border-l-[1.5px] px-4 py-4 text-[15px] font-medium leading-snug" style={{ borderColor: "var(--sv-line)" }}>{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="skins-title" className="mx-auto max-w-[1180px] px-4 py-20 lg:px-14">
          <h2 id="skins-title" className={`${survey.expanded} max-w-[20ch] text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`}>
            {t.skinsTitle}
          </h2>
          <p className="mt-3 max-w-[52ch] text-[17px]" style={{ color: "var(--sv-soft)" }}>
            {t.skinsNote}{" "}
            {t.from} <span className={`${styles.price} font-medium`} style={{ color: "var(--sv-ink)" }}>₱799</span>{" "}
            <span className={`${styles.price} line-through`}>₱888</span>.
          </p>
          <SkinShowcase />
        </section>

        <Pricing t={t} />

        <Roadmap t={t} />

        <section className="mx-auto max-w-[1180px] px-4 py-24 lg:px-14">
          <div className="border-[1.5px] px-6 py-14 text-center" style={{ borderColor: "var(--sv-line)" }}>
            <h2 className={`${survey.expanded} mx-auto max-w-[18ch] text-[clamp(28px,4.6vw,52px)] font-bold leading-[1.05]`} style={{ textWrap: "balance" }}>
              {t.finalTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-[48ch] text-[17px]" style={{ color: "var(--sv-soft)" }}>{t.finalSub}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/auth?mode=signup" className={`${survey.primary} ${survey.semiExpanded} flex h-14 items-center justify-center px-7 text-[17px] font-bold`}>
                {t.ctaFree}
              </Link>
              <Link href="/shop" className={`${survey.cell} ${survey.semiExpanded} flex h-14 items-center justify-center border-[1.5px] px-7 text-[17px] font-bold`} style={{ borderColor: "var(--sv-line)" }}>
                {t.orderCard}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
