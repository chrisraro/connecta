"use client";

import { useEffect, useRef } from "react";
import { ProfileRenderer } from "@/components/templates/ProfileRenderer";
import { TiltCard } from "@/components/ui/tilt-card";
import { buildDemoProfile } from "./demoProfile";

/**
 * The landing hero used to show `NfcCardVisual` — a grey rectangle with
 * skeleton bars standing in for a "profile". A design audit's verdict:
 * "You're selling a look; show the look. Right now the landing page shows
 * gray rectangles." This renders an actual profile template (the same
 * `ProfileRenderer` every real customer's public page goes through) inside
 * a phone frame, at native phone width, clipped to a phone-screen aspect
 * ratio.
 *
 * Purely decorative: static demo data (no Convex fetch, no real customer
 * PII), `inert` so it and its interactive descendants (social links, the
 * tel/mailto CTAs) never enter the tab order or a11y tree, and no
 * per-frame animation — `TiltCard`'s pointer-move parallax only runs on
 * hover with a fine pointer and already no-ops under
 * `prefers-reduced-motion`, and `inert` also blocks pointer/mouse
 * interaction with the phone's own content so only the outer tilt reacts.
 */
export function HeroProfilePreview() {
  const demoProfile = {
    ...buildDemoProfile("editorial"),
    // Trim to just what's visible above the fold of the clipped phone
    // screen below — no lead-capture form mounts inside a decorative,
    // non-interactive preview.
    componentOrder: ["Hero", "About", "Services"],
  };

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This mounts the same ProfileRenderer (components/templates/**, owned
    // elsewhere) a real public profile uses, which correctly renders its
    // own <h1> and un-labelled icon-only social links for a *real* page.
    // Embedded here those become a second <h1> and three nameless sub-44px
    // touch targets on the landing page, even though the whole subtree is
    // already `inert` + aria-hidden and invisible to assistive tech either
    // way. Demote/neutralize the raw DOM nodes after mount: <h1> -> <h2>,
    // and any anchor -> <span> (an inert preview shouldn't expose real
    // `<a href>` navigation semantics anyway). Pure tag swap, no visual or
    // behavioral change.
    const root = previewRef.current;
    if (!root) return;

    const h1 = root.querySelector("h1");
    if (h1) {
      const h2 = document.createElement("h2");
      while (h1.firstChild) h2.appendChild(h1.firstChild);
      for (const attr of Array.from(h1.attributes)) h2.setAttribute(attr.name, attr.value);
      h1.replaceWith(h2);
    }

    root.querySelectorAll("a[href]").forEach((a) => {
      const span = document.createElement("span");
      while (a.firstChild) span.appendChild(a.firstChild);
      for (const attr of Array.from(a.attributes)) {
        if (attr.name === "href" || attr.name === "target" || attr.name === "rel") continue;
        span.setAttribute(attr.name, attr.value);
      }
      a.replaceWith(span);
    });
  }, []);

  return (
    <div
      ref={previewRef}
      inert={true}
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[320px] select-none"
    >
      <div className="aurora-blob aurora-b absolute inset-0 -z-10 bg-primary/20" />
      <TiltCard className="relative">
        <div
          className="rounded-[var(--r-lg)] border border-white/10 bg-zinc-950 p-3"
          style={{ boxShadow: "var(--e-overlay)" }}
        >
          <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-black/60" />
          <div className="relative aspect-[9/18.5] w-full overflow-hidden rounded-[var(--r-md)] bg-white">
            <ProfileRenderer data={demoProfile} templateId="editorial" />
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
