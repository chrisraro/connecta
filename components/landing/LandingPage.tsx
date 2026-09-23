"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@/components/auth/AuthGate";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";
import { SHEETS } from "@/components/survey/sheet";
import { sheetVars } from "@/components/survey/SurveyProfile";
import survey from "@/components/survey/survey.module.css";
import { useLandingLang, type Lang } from "./copy";
import { TapStory } from "./TapStory";
import { Pricing } from "./Pricing";
import { CardFace } from "./Phone";
import styles from "./landing.module.css";

const SKINS = [
  { id: "charcoal", label: "Charcoal" },
  { id: "scarlet", label: "Scarlet" },
  { id: "crimson", label: "Crimson" },
  { id: "gradient", label: "Plan Blue" },
] as const;

function LangToggle({ lang, setLang, label }: { lang: Lang; setLang: (l: Lang) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
      {(["en", "fil"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`${survey.cell} flex h-11 min-w-11 items-center justify-center px-3 text-[13px] font-bold tracking-[0.06em]`}
          style={lang === l ? { backgroundColor: "var(--sv-line)", color: "var(--sv-ground)" } : undefined}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** The marketing homepage in the Survey Plan world (whiteprint sheet). */
export function LandingPage() {
  const { lang, setLang, t } = useLandingLang();
  const sheet = SHEETS.whiteprint;

  return (
    <div className={survey.sheet} style={sheetVars(sheet)}>
      <header className="sticky top-0 z-30 border-b-[1.5px]" style={{ backgroundColor: "var(--sv-ground)", borderColor: "var(--sv-line)" }}>
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 lg:px-14">
          <Link href="/" className="flex items-center gap-2">
            <ConnectaMark className="h-7 w-7" style={{ color: "var(--sv-line)" }} />
            <span className={`${survey.expanded} hidden text-[15px] font-bold tracking-[0.1em] min-[420px]:inline`}>{CONNECTA.name.toUpperCase()}</span>
          </Link>
          <div className="hidden items-center gap-6 text-[15px] font-medium md:flex">
            <a href="#how" className={survey.link}>{t.nav.how}</a>
            <a href="#demo" className={survey.link}>{t.nav.demo}</a>
            <a href="#pricing" className={survey.link}>{t.nav.pricing}</a>
            <Link href="/shop" className={survey.link}>{t.nav.shop}</Link>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} label={t.language} />
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
          </div>
        </nav>
      </header>

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
          <p className="mt-3 max-w-[52ch] text-[17px]" style={{ color: "var(--sv-soft)" }}>{t.skinsNote}</p>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {SKINS.map((s) => (
              <li key={s.id}>
                <CardFace skin={s.id} className="w-full shadow-md" />
                <p className="mt-3 text-[16px] font-bold">{s.label}</p>
                <p className="text-[14px]" style={{ color: "var(--sv-soft)" }}>
                  {t.from} <span className={`${styles.price} font-medium`} style={{ color: "var(--sv-ink)" }}>₱799</span>{" "}
                  <span className={`${styles.price} line-through`}>₱888</span>
                </p>
                <div className="mt-3 flex aspect-[4/3] items-center justify-center border-[1.5px] border-dashed px-3 text-center text-[12px]" style={{ borderColor: "var(--sv-line)", color: "var(--sv-soft)" }}>
                  {t.photoSlot}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Pricing t={t} />

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

      <footer className="border-t-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[14px] lg:px-14">
          <p className="flex items-center gap-2">
            <ConnectaMark className="h-5 w-5" style={{ color: "var(--sv-line)" }} />
            <span style={{ color: "var(--sv-soft)" }}>{t.footerLine}</span>
          </p>
          <div className="flex gap-5" style={{ color: "var(--sv-soft)" }}>
            <Link href="/privacy" className={survey.link}>{t.privacy}</Link>
            <Link href="/terms" className={survey.link}>{t.terms}</Link>
            {/* Shown only once a real domain is configured; the fallback is a placeholder. */}
            {!CONNECTA.domain.endsWith(".example") && (
              <a href={`mailto:${CONNECTA.supportEmail}`} className={survey.link}>{CONNECTA.supportEmail}</a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
