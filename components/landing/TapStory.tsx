"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell } from "lucide-react";
import survey from "@/components/survey/survey.module.css";
import type { LandingCopy } from "./copy";
import { CardFace, MiniProfile, PhoneFrame, type FormPhase } from "./Phone";
import { IndustrySwitch, PERSONAS, type Industry } from "./IndustryDemo";
import { HomeScreen, NfcBanner, SafariBar, StatusBar } from "./Ios";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import styles from "./landing.module.css";

/**
 * The scroll-pinned tap story. One phone stays pinned while three beats scroll
 * past; whichever beat is in the middle of the screen sets the phone's state.
 * Before any beat the phone sits unlocked on its Home Screen. 0 the card
 * touches and iOS shows its "Website NFC Tag" banner, 1 Safari opens the profile,
 * 2 the visitor scrolls to "Leave your details", sends it, and the lead
 * notification lands, 3 the industry switch remaps the same phone. With
 * reduced motion the states swap without movement.
 */
export function TapStory({ t, intro }: { t: LandingCopy; intro: ReactNode }) {
  const [beat, setBeat] = useState(-1);
  const [industry, setIndustry] = useState<Industry>("realtor");
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setBeat(Number((e.target as HTMLElement).dataset.beat));
        }
      },
      { rootMargin: "-58% 0px -32% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // Beat 2 plays the visitor's side: scroll to the form, fill it, send.
  // The lead notification lands only once the form is sent.
  const [form, setForm] = useState<FormPhase>(0);
  useEffect(() => {
    const steps: [number, FormPhase][] = beat === 2 ? [[0, 1], [1400, 2], [3400, 3]] : [[0, 0]];
    const timers = steps.map(([ms, phase]) => window.setTimeout(() => setForm(phase), ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [beat]);

  const opened = beat >= 1;
  const cardClass = beat < 0 ? styles.cardAway : beat === 0 ? styles.cardTouch : styles.cardGone;

  return (
    <section id="how" aria-label={t.nav.how} className="relative">
      <div className="mx-auto grid max-w-[1180px] gap-x-16 px-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-14">
        <div className="lg:col-start-1 lg:row-start-1 lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center">{intro}</div>
        <div className="sticky top-[64px] z-10 -mx-4 flex justify-center self-start border-b-[1.5px] bg-[var(--sv-ground)] px-4 py-3 lg:bg-transparent lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:top-20 lg:mx-0 lg:h-[calc(100vh-6rem)] lg:items-center lg:border-b-0 lg:py-0"
          style={{ borderColor: "var(--sv-line)" }}>
          <div className="relative h-[292px] w-[184px] [--mini-zoom:0.6] [clip-path:inset(-100%_-100%_0_-100%)] lg:h-auto lg:w-[300px] lg:[--mini-zoom:1] lg:[clip-path:none]">
            {/* The card meets the back of the phone near the top, where the NFC reader sits. */}
            <div aria-hidden="true" className={`${styles.card} ${cardClass} pointer-events-none absolute -left-[26%] -top-[7%] w-[80%]`}>
              <CardFace skin="charcoal" className="w-full shadow-lg" />
            </div>
            <PhoneFrame className="relative">
              <div className={`${styles.homeLayer} ${opened ? styles.homeAway : ""} absolute inset-0`} aria-hidden={opened}>
                <div className={`${styles.mini} relative h-full`}>
                  <HomeScreen />
                </div>
              </div>
              {/* Safari over the profile. MiniProfile applies the miniature zoom itself. */}
              <div className={`${styles.profileLayer} ${opened ? "" : styles.appClosed} relative h-full overflow-hidden`} aria-hidden={!opened}>
                <div className={`${styles.mini} absolute left-0 top-0 z-[1]`} style={{ backgroundColor: "var(--sv-ground)" }}>
                  <StatusBar tone="dark" />
                </div>
                <div className="pt-[26px]">
                  <MiniProfile key={industry} persona={PERSONAS[industry]} saveLabel={t.saveContact} form={beat === 2 ? form : 0} />
                </div>
                <div className={`${styles.mini} absolute bottom-0 left-0`}>
                  <SafariBar />
                </div>
              </div>
              {/* Overlays share the miniature's scale so they stay in proportion. */}
              <div className={`${styles.mini} pointer-events-none absolute left-0 top-0 h-full`}>
                <NfcBanner shown={beat === 0} />
                <div
                  role="status"
                  className={`${styles.toast} ${styles.glassLight} ${beat === 2 && form === 3 ? "" : styles.toastHidden} absolute inset-x-[7px] top-[40px] flex items-center gap-[8px] rounded-[20px] px-[10px] py-[9px] text-black`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "Segoe UI", system-ui, sans-serif' }}
                >
                  <span className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[6px]" style={{ backgroundColor: "#2B3F8F" }}>
                    <ConnectaMark className="h-[17px] w-[17px]" style={{ color: "#FFFFFF" }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2 text-[10.5px] font-semibold leading-tight">
                      <span className="flex items-center gap-1">
                        <Bell className="h-[9px] w-[9px]" strokeWidth={2.2} aria-hidden="true" /> {t.newLead}
                      </span>
                      <span className="text-[9px] font-normal" style={{ color: "rgb(60 60 67 / 0.6)" }}>now</span>
                    </span>
                    <span className="block truncate text-[10.5px] leading-tight">Maria D. · {t.leadDemo}</span>
                  </span>
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>

        <div className="flex flex-col lg:col-start-1 lg:row-start-2">
          {t.beats.map((b, i) => (
            <div
              key={b.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-beat={i}
              className="flex min-h-[70vh] flex-col justify-center py-16"
            >
              <h2 className={`${survey.expanded} max-w-[18ch] text-[clamp(28px,4.4vw,48px)] font-bold leading-[1.05]`} style={{ textWrap: "balance" }}>
                {b.title}
              </h2>
              <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.65]" style={{ color: "var(--sv-soft)" }}>
                {b.body}
              </p>
            </div>
          ))}
          <div
            ref={(el) => {
              refs.current[3] = el;
            }}
            data-beat={3}
            className="flex min-h-[70vh] flex-col justify-center py-16"
          >
            <IndustrySwitch t={t} industry={industry} setIndustry={setIndustry} />
          </div>
          <p className="pb-10 text-[12px]" style={{ color: "var(--sv-soft)" }}>
            {t.demoTag}
          </p>
          {/* Room for the pinned phone to hold the last beat before it scrolls away. */}
          <div aria-hidden="true" className="hidden h-[45vh] lg:block" />
        </div>
      </div>
    </section>
  );
}
