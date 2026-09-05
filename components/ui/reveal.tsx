"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  /** Stagger delay in ms before the reveal transition begins. */
  delay?: number;
  /** Translate direction of the entrance. */
  from?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  as?: React.ElementType;
  /** Render only once (default) or re-animate every time it enters. */
  once?: boolean;
};

/**
 * Tiny scroll-reveal wrapper built on IntersectionObserver (broadest support).
 *
 * Progressive enhancement contract:
 * - Content is VISIBLE by default. We only add the hidden/translated state
 *   AFTER mount, and only when IntersectionObserver exists AND the user has
 *   not requested reduced motion. So with JS off, IO unsupported, or
 *   reduced-motion on, the content simply renders in place — never stuck at
 *   opacity:0.
 */
export function Reveal({
  children,
  delay = 0,
  from = "up",
  className,
  as: Tag = "div",
  once = true,
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  // armed = we are allowed to animate (enhancement available); starts false so SSR/no-JS shows content.
  const [armed, setArmed] = React.useState(false);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      // No enhancement: leave content fully visible.
      return;
    }

    setArmed(true);
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setShown(false);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const translateMap: Record<string, string> = {
    up: "translate3d(0, 1.75rem, 0)",
    down: "translate3d(0, -1.75rem, 0)",
    left: "translate3d(1.75rem, 0, 0)",
    right: "translate3d(-1.75rem, 0, 0)",
    none: "translate3d(0, 0, 0)",
  };

  // When not armed -> no inline transform/opacity, content is plainly visible.
  const style: React.CSSProperties = armed
    ? {
        opacity: shown ? 1 : 0,
        transform: shown ? "translate3d(0,0,0)" : translateMap[from],
        transition:
          "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
        transitionDelay: `${delay}ms`,
        willChange: "opacity, transform",
      }
    : {};

  return (
    <Tag ref={ref as never} className={cn(className)} style={style}>
      {children}
    </Tag>
  );
}
