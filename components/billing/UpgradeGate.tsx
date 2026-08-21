import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single reusable "locked" presentation for every plan-gated capability
 * (builder templates, card activation, CSV export, team workspace, ...).
 *
 * Product requirement (task 11 — the builder used to just hide Pro features
 * with no upsell, which read as broken): a gated feature must stay VISIBLE,
 * never vanish, and always carry a lock badge + a "Get Pro" CTA to
 * /dashboard/billing. Every call site routes through this one component
 * instead of hand-rolling its own locked state, so that promise holds
 * everywhere without needing to audit each usage separately.
 *
 * Three variants, auto-selected from whether `children` is passed (override
 * with `variant` when the default guess is wrong):
 *  - "overlay" (children present): the real feature UI renders dimmed and
 *    non-interactive underneath a centered lock badge + CTA — used for
 *    block-level previews like a Pro-only template tile.
 *  - "banner" (no children): a full-width strip with the reason and a CTA —
 *    used for plan-limit errors surfaced from the server (see
 *    lib/plans.ts#isPlanLimitError) and standing "N items are locked"
 *    notices.
 *  - "inline": a compact pill CTA carrying `reason` as its accessible name
 *    — used where a hidden feature previously left an empty toolbar slot
 *    (e.g. the leads page's CSV export button for free users).
 */
export interface UpgradeGateProps {
  /** True when the wrapped/represented feature is not on the caller's plan. */
  locked: boolean;
  /** Short, user-facing reason shown next to the CTA (also its a11y text for "inline"). */
  reason: string;
  /** The feature's real UI. Rendered as-is when unlocked; dimmed under the overlay when locked. */
  children?: React.ReactNode;
  variant?: "overlay" | "banner" | "inline";
  ctaLabel?: string;
  className?: string;
}

const UPGRADE_HREF = "/dashboard/billing";

function GetProCta({
  label,
  ariaLabel,
  className,
}: {
  label: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={UPGRADE_HREF}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90",
        className
      )}
    >
      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function UpgradeGate({
  locked,
  reason,
  children,
  variant,
  ctaLabel = "Get Pro",
  className,
}: UpgradeGateProps) {
  if (!locked) {
    return <>{children}</>;
  }

  const effectiveVariant = variant ?? (children ? "overlay" : "banner");

  if (effectiveVariant === "inline") {
    return (
      <GetProCta
        label={ctaLabel}
        ariaLabel={`${reason} — ${ctaLabel}`}
        className={className}
      />
    );
  }

  if (effectiveVariant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4",
          className
        )}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {reason}
        </p>
        <GetProCta label={ctaLabel} />
      </div>
    );
  }

  // "overlay": the feature stays visible (dimmed, inert) with the CTA
  // layered on top — nothing about it silently disappears for a free user.
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <div aria-hidden="true" className="pointer-events-none opacity-40 grayscale">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 p-3 text-center backdrop-blur-[1px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Pro
        </span>
        <p className="max-w-[16rem] text-xs font-medium text-foreground">{reason}</p>
        <GetProCta label={ctaLabel} />
      </div>
    </div>
  );
}
