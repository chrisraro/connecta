"use client";

import { DEMO_PHOTOS } from "@/components/marketing/demoProfile";
import survey from "@/components/survey/survey.module.css";
import type { LandingCopy } from "./copy";
import type { DemoPersona } from "./Phone";

export type Industry = "realtor" | "shop" | "pro" | "student";

// Synthetic demo personas, labelled as sample content wherever they appear.
export const PERSONAS: Record<Industry, DemoPersona> = {
  realtor: {
    name: "Andrea Villanueva",
    title: "Licensed Real Estate Broker",
    company: "Villanueva Realty · Naga City",
    photo: DEMO_PHOTOS.broker,
    rows: ["3-bedroom house and lot · ₱4,850,000", "Two-storey family home · ₱7,200,000", "Bungalow for rent · ₱18,000 / month"],
  },
  shop: {
    name: "Rosa Dela Cruz",
    title: "Owner, Dela Cruz Bakeshop",
    company: "Naga City",
    rows: ["Pan de sal (10 pcs) · ₱60", "Ensaymada · ₱35", "Custom cakes · made to order"],
  },
  pro: {
    name: "Nicole Bautista",
    title: "Interior Designer & Creative Director",
    company: "Nicole Bautista Design Co.",
    photo: DEMO_PHOTOS.designer,
    rows: ["Interior design", "Space planning", "Styling & staging"],
  },
  student: {
    name: "Paolo Santos",
    title: "BS Information Technology",
    company: "Class of 2027",
    rows: ["Web development", "UI design", "Internship-ready"],
  },
};

/**
 * One control drives the demo: the industry switch remaps the story's pinned
 * phone live. It is the tap story's last beat, not a second phone.
 */
export function IndustrySwitch({
  t,
  industry,
  setIndustry,
}: {
  t: LandingCopy;
  industry: Industry;
  setIndustry: (i: Industry) => void;
}) {
  const ids = Object.keys(PERSONAS) as Industry[];
  return (
    <div id="demo" className="scroll-mt-24">
      <h2 className={`${survey.expanded} max-w-[18ch] text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`} style={{ textWrap: "balance" }}>{t.demoTitle}</h2>
      <div role="tablist" aria-label={t.demoTitle} className="mt-8 grid grid-cols-2 border-[1.5px] sm:grid-cols-4" style={{ borderColor: "var(--sv-line)" }}>
        {ids.map((id, i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={industry === id}
            onClick={() => setIndustry(id)}
            className={`${survey.cell} min-h-12 px-3 text-[15px] font-bold ${i % 2 === 1 ? "border-l-[1.5px]" : ""} ${i === 2 ? "sm:border-l-[1.5px]" : ""} ${i > 1 ? "border-t-[1.5px] sm:border-t-0" : ""}`}
            style={industry === id ? { backgroundColor: "var(--sv-line)", color: "var(--sv-ground)", borderColor: "var(--sv-line)" } : { borderColor: "var(--sv-line)" }}
          >
            {t.industries[id]}
          </button>
        ))}
      </div>
      <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.65]" aria-live="polite">{t.industryNotes[industry]}</p>
    </div>
  );
}
