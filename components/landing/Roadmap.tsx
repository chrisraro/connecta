import survey from "@/components/survey/survey.module.css";
import type { LandingCopy } from "./copy";

/**
 * The owner's roadmap (2026-10-01). Everything here is planned, not
 * shipped: each item carries a dashed "Planned" tag, the survey plan's mark
 * for a lot that is drawn but not yet built, and the section gives no dates.
 */
export function Roadmap({ t }: { t: LandingCopy }) {
  const r = t.roadmap;
  return (
    <section id="roadmap" aria-labelledby="roadmap-title" className="scroll-mt-16 mx-auto max-w-[1180px] px-4 py-20 lg:px-14">
      <h2 id="roadmap-title" className={`${survey.expanded} text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`}>
        {r.title}
      </h2>
      <p className="mt-3 max-w-[52ch] text-[17px]" style={{ color: "var(--sv-soft)" }}>
        {r.sub}
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {r.groups.map((group) => (
          <div key={group.name} className="border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
            <h3
              className={`${survey.semiExpanded} border-b-[1.5px] px-5 py-4 text-[19px] font-bold`}
              style={{ borderColor: "var(--sv-line)" }}
            >
              {group.name}
            </h3>
            <ul aria-label={group.name}>
              {group.items.map((item) => (
                <li key={item.name} className={`border-b px-5 py-5 last:border-b-0 ${survey.rule}`}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <h4 className="text-[17px] font-bold leading-snug">{item.name}</h4>
                    <span
                      className={`${survey.mono} shrink-0 border-[1.5px] border-dashed px-2 py-0.5 text-[13px] uppercase tracking-[0.06em]`}
                      style={{ borderColor: "var(--sv-line)", color: "var(--sv-soft)" }}
                    >
                      {r.planned}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--sv-soft)" }}>
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
