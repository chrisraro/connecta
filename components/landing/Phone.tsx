"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, Download, Mail, Phone as PhoneIcon } from "lucide-react";
import { PROFILE_COPY } from "@/components/survey/copy";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";
import { ProfileImage } from "@/components/templates/ProfileImage";
import survey from "@/components/survey/survey.module.css";
import { cardSkin, type CardSkinId } from "@/lib/cardSkins";
import styles from "./landing.module.css";

export type DemoPersona = {
  name: string;
  title: string;
  company?: string;
  photo?: string;
  rows: string[];
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

// iPhone 17 Pro Max side controls: [top, length] in mm from the top of the
// body, from Apple's dimensional drawing. Action, volume up and down on the
// left; the Side button and Camera Control on the right.
const MM = 284 / 72.86;
const LEFT_CONTROLS = [[30.83, 6.9], [42.83, 11.2], [57.03, 11.2]] as const;
const RIGHT_CONTROLS = [[46.68, 17.7], [103.27, 17.1]] as const;

function controlStyle([top, length]: readonly [number, number]) {
  return {
    top: `calc(${(top * MM).toFixed(2)} * var(--u))`,
    height: `calc(${(length * MM).toFixed(2)} * var(--u))`,
  };
}

/** An iPhone 17 Pro Max at 1:1 proportions; the screen fills the display area. */
export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.phone} ${className}`}>
      {LEFT_CONTROLS.map((c) => (
        <span key={c[0]} aria-hidden="true" className={`${styles.button} ${styles.buttonLeft}`} style={controlStyle(c)} />
      ))}
      {RIGHT_CONTROLS.map((c) => (
        <span key={c[0]} aria-hidden="true" className={`${styles.button} ${styles.buttonRight}`} style={controlStyle(c)} />
      ))}
      <div className={styles.coverGlass}>
        <div className={`${styles.screen} relative h-full w-full`}>{children}</div>
      </div>
    </div>
  );
}

/** Where the demo lead form is: 0 not reached, 1 scrolled to, 2 filled in, 3 sent. */
export type FormPhase = 0 | 1 | 2 | 3;

// A sample visitor, labelled as demo content with the rest of the story.
const DEMO_LEAD = { name: "Maria Dela Cruz", contact: "0917 555 0142", message: "Wants a viewing this Saturday" };

function MiniField({ label, value, tall = false }: { label: string; value: string; tall?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-semibold">{label}</span>
      <span
        className={`flex border-[1.5px] px-2 text-[10px] ${tall ? "h-[38px] items-start pt-1.5" : "h-[26px] items-center"}`}
        style={{ borderColor: value ? "var(--sv-line)" : "color-mix(in srgb, var(--sv-line) 55%, transparent)" }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A miniature of the real public profile: the one-ink portrait in its lot,
 * the title block and Save contact, a few section rows, then the "Leave your
 * details" lot. `form` scrolls the miniature to that lot and plays the send.
 */
export function MiniProfile({ persona, saveLabel, form = 0 }: { persona: DemoPersona; saveLabel: string; form?: FormPhase }) {
  const t = PROFILE_COPY;
  const first = persona.name.split(/\s+/)[0] ?? persona.name;
  const scroller = useRef<HTMLDivElement>(null);
  const formLot = useRef<HTMLElement>(null);
  const reached = form > 0;
  const filled = form >= 2;

  // Scroll the page inside the phone so the form lot sits under the status
  // bar. Measured in the miniature's own units, so it holds at every zoom.
  useEffect(() => {
    const el = scroller.current;
    const lot = formLot.current;
    if (!el || !lot) return;
    if (!reached) {
      el.style.transform = "";
      return;
    }
    const box = el.getBoundingClientRect();
    const scale = box.width / el.offsetWidth || 1;
    const offset = (lot.getBoundingClientRect().top - box.top) / scale;
    el.style.transform = `translateY(${-(offset - 150)}px)`;
  }, [reached]);

  return (
    <div className={`${styles.mini} text-[var(--sv-ink)]`}>
     <div ref={scroller} className={`${styles.pageScroll} flex flex-col px-3 pt-5`}>
      <div className={`${survey.lotClip} ${persona.photo ? survey.duotone : ""} mx-auto aspect-[5/6] w-[72%]`}>
        {persona.photo ? (
          <ProfileImage src={persona.photo} alt="" className="h-full w-full" />
        ) : (
          <div
            className={`${survey.expanded} flex h-full w-full items-center justify-center border-[1.5px] text-[34px] font-bold`}
            style={{ borderColor: "var(--sv-line)", color: "var(--sv-line)" }}
            aria-hidden="true"
          >
            {initials(persona.name)}
          </div>
        )}
      </div>
      <div className="mt-3 border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
        <div className="px-2.5 pb-2 pt-2.5">
          <p className={`${survey.expanded} text-[15px] font-bold leading-tight`}>{persona.name}</p>
          <p className="mt-1 text-[10px] leading-snug">{persona.title}</p>
          {persona.company && (
            <p className="text-[9.5px] leading-snug" style={{ color: "var(--sv-soft)" }}>
              {persona.company}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 border-t-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
          <span className="flex h-8 items-center justify-center gap-1 text-[9px] font-semibold">
            <PhoneIcon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> {t.call}
          </span>
          <span className="flex h-8 items-center justify-center gap-1 border-l-[1.5px] text-[9px] font-semibold" style={{ borderColor: "var(--sv-line)" }}>
            <Mail className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> {t.email}
          </span>
        </div>
        <div className="flex h-9 items-center justify-center gap-1.5 text-[11px] font-bold" style={{ backgroundColor: "var(--sv-action-bg)", color: "var(--sv-action-ink)" }}>
          <Download className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          {saveLabel}
        </div>
      </div>
      <ul className="mt-3 flex flex-col">
        {persona.rows.map((r) => (
          <li key={r} className="flex items-center gap-2 border-b py-1.5 text-[10px]" style={{ borderColor: "color-mix(in srgb, var(--sv-line) 38%, transparent)" }}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: "var(--sv-line)" }} />
            {r}
          </li>
        ))}
      </ul>

      {/* The lead lot, as on the real profile: heading on the boundary line. */}
      <section ref={formLot} className="relative mt-7 border-[1.5px] px-2.5 pb-3 pt-4" style={{ borderColor: "var(--sv-line)" }}>
        <p
          className={`${survey.semiExpanded} absolute left-2 top-0 -translate-y-1/2 px-1.5 text-[11.5px] font-bold leading-none`}
          style={{ backgroundColor: "var(--sv-ground)" }}
        >
          {t.contactHeading}
        </p>
        <p className="text-[9.5px] leading-snug" style={{ color: "var(--sv-soft)" }}>
          {t.contactIntro(first)}
        </p>
        {form === 3 ? (
          <div className="mt-3 flex items-center gap-2 border-[1.5px] p-2.5" style={{ borderColor: "var(--sv-line)" }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center" style={{ backgroundColor: "var(--sv-action-bg)", color: "var(--sv-action-ink)" }}>
              <Check className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold leading-snug">{t.sent(first)}</span>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-col gap-2">
            <MiniField label={t.yourName} value={filled ? DEMO_LEAD.name : ""} />
            <MiniField label={t.yourContact} value={filled ? DEMO_LEAD.contact : ""} />
            <MiniField label={`${t.message} (${t.optional})`} value={filled ? DEMO_LEAD.message : ""} tall />
            <span
              className={`${survey.semiExpanded} ${filled ? styles.pressReady : ""} mt-1 flex h-8 items-center justify-center text-[10.5px] font-bold`}
              style={{ backgroundColor: "var(--sv-action-bg)", color: "var(--sv-action-ink)" }}
            >
              {t.send}
            </span>
          </div>
        )}
      </section>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-[9.5px]" style={{ color: "var(--sv-soft)" }}>
        {t.poweredBy} <ConnectaMark className="h-3 w-3" style={{ color: "var(--sv-line)" }} />
        <span className={`${survey.expanded} font-bold tracking-[0.08em]`} style={{ color: "var(--sv-ink)" }}>{CONNECTA.name.toUpperCase()}</span>
      </p>
      <div className="h-24" aria-hidden="true" />
     </div>
    </div>
  );
}

/** The physical card, drawn in its skin colours. */
export function CardFace({ skin: id, className = "" }: { skin: CardSkinId; className?: string }) {
  // Colours come from the one skin registry the builder and digital card use.
  const skin = cardSkin(id);
  const lot = skin.split?.line ?? skin.lineColor;
  return (
    <div className={`relative overflow-hidden rounded-[12px] ${className}`} style={{ aspectRatio: "85.6 / 54", background: skin.swatch }}>
      <svg viewBox="0 0 400 252" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M262 44 H342 L362 64 V160 L342 180 H262 L242 160 V64 Z" fill="none" stroke={lot} strokeOpacity="0.6" strokeWidth="2" />
        <g transform="translate(26 26) scale(0.6)">
          <path d="M50 23 L37 10 H19 L6 23 V41 L19 54 H37 L50 41" fill="none" stroke={skin.lineColor} strokeWidth="6" />
          <circle cx="57" cy="32" r="4.5" fill={skin.dotColor} />
        </g>
      </svg>
    </div>
  );
}
