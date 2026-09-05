"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Mouse-move parallax tilt wrapper.
 * - Caps rotation at ~8deg, rAF-throttled, transform-only (GPU friendly).
 * - Adds a gentle idle float (CSS keyframe `float-y`) when the pointer is away.
 * - Reduced motion / touch: renders static, no listeners attached.
 */
export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const frame = React.useRef<number | null>(null);
  const [interactive, setInteractive] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia?.("(pointer: fine)").matches;
    if (!reduce && finePointer) setInteractive(true);
  }, []);

  const handleMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      const rotY = (px - 0.5) * 16; // -8..8
      const rotX = (0.5 - py) * 16; // -8..8
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.transform = `perspective(1100px) rotateX(${rotX.toFixed(
          2,
        )}deg) rotateY(${rotY.toFixed(2)}deg)`;
      });
    },
    [interactive],
  );

  const reset = React.useCallback(() => {
    setHovering(false);
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.transform = "";
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={reset}
      className={cn(
        // Idle float only when interactive (so it degrades to static otherwise)
        interactive && !hovering && "motion-safe:animate-[float-y_6s_ease-in-out_infinite]",
        "transition-transform duration-300 ease-out [transform-style:preserve-3d]",
        className,
      )}
    >
      {children}
    </div>
  );
}
