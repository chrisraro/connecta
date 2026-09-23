"use client";

import { useState } from "react";
import Link from "next/link";
import survey from "@/components/survey/survey.module.css";
import type { LandingCopy } from "./copy";
import styles from "./landing.module.css";

// Confirmed 2026-09-24 (PRODUCT.md): standard and prelaunch prices in pesos.
const PRICES = {
  card: { standard: 888, prelaunch: 799 },
  lead: { monthly: { standard: 79, prelaunch: 49 }, yearly: { standard: 799, prelaunch: 499 } },
  team: { monthly: { standard: 299, prelaunch: 249 }, yearly: { standard: 3199, prelaunch: 2699 } },
};

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function Plan({
  name,
  tagline,
  items,
  prelaunch,
  standard,
  unit,
  t,
  cta,
}: {
  name: string;
  tagline: string;
  items: string[];
  prelaunch: number;
  standard: number;
  unit: string;
  t: LandingCopy;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="relative flex flex-col border-t-[1.5px] px-5 pb-7 pt-9 lg:border-l-[1.5px] lg:border-t-0 lg:first:border-l-0" style={{ borderColor: "var(--sv-line)" }}>
      <h3 className={`${survey.semiExpanded} absolute left-4 top-0 -translate-y-1/2 px-2 text-[19px] font-bold leading-none`} style={{ backgroundColor: "var(--sv-ground)" }}>
        {name}
      </h3>
      <p className="text-[14px]" style={{ color: "var(--sv-soft)" }}>
        {tagline}
      </p>
      <p className="mt-5 flex items-baseline gap-2">
        <span className={`${styles.price} text-[34px] font-medium`}>{peso(prelaunch)}</span>
        <span className="text-[14px]" style={{ color: "var(--sv-soft)" }}>
          {unit}
        </span>
      </p>
      <p className="mt-1 flex items-center gap-2 text-[13px]">
        <span className="border px-1.5 py-0.5 text-[11px] font-bold uppercase" style={{ borderColor: "var(--sv-mark)", color: "var(--sv-mark-text)" }}>
          {t.prelaunch}
        </span>
        <span style={{ color: "var(--sv-soft)" }}>
          {t.standard} <span className={`${styles.price} line-through`}>{peso(standard)}</span>
        </span>
      </p>
      <ul className="mb-6 mt-6 flex flex-col">
        {items.map((it) => (
          <li key={it} className={`flex items-center gap-3 border-b py-2.5 text-[15px] ${survey.rule}`}>
            <span aria-hidden="true" className="h-2 w-2 shrink-0" style={{ backgroundColor: "var(--sv-line)" }} />
            {it}
          </li>
        ))}
      </ul>
      {cta && (
        <Link href={cta.href} className={`${survey.primary} ${survey.semiExpanded} mt-auto flex h-12 items-center justify-center text-[15px] font-bold`}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function Pricing({ t }: { t: LandingCopy }) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const unit = cycle === "monthly" ? t.perMonth : t.perYear;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16 mx-auto max-w-[1180px] px-4 py-20 lg:px-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="pricing-title" className={`${survey.expanded} text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`}>
            {t.pricingTitle}
          </h2>
          <p className="mt-3 max-w-[52ch] text-[17px]" style={{ color: "var(--sv-soft)" }}>
            {t.pricingSub}
          </p>
        </div>
        <div role="group" aria-label={`${t.monthly} / ${t.yearly}`} className="flex border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cycle === c}
              onClick={() => setCycle(c)}
              className={`${survey.cell} h-11 px-4 text-[14px] font-bold`}
              style={cycle === c ? { backgroundColor: "var(--sv-line)", color: "var(--sv-ground)" } : undefined}
            >
              {c === "monthly" ? t.monthly : t.yearly}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-10 grid border-x-[1.5px] border-b-[1.5px] lg:grid-cols-3 lg:border-t-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
        <Plan {...t.plans.card} prelaunch={PRICES.card.prelaunch} standard={PRICES.card.standard} unit={t.oneTime} t={t} cta={{ href: "/shop", label: t.orderCard }} />
        <Plan {...t.plans.lead} prelaunch={PRICES.lead[cycle].prelaunch} standard={PRICES.lead[cycle].standard} unit={unit} t={t} cta={{ href: "/auth?mode=signup", label: t.nav.start }} />
        <Plan {...t.plans.team} prelaunch={PRICES.team[cycle].prelaunch} standard={PRICES.team[cycle].standard} unit={unit} t={t} cta={{ href: "/auth?mode=signup", label: t.nav.start }} />
      </div>
    </section>
  );
}
