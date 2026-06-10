import { cn } from "@/lib/utils";

/**
 * Skeleton — a soft, pulsing placeholder block used while data loads.
 * Respects prefers-reduced-motion via the `.motion-safe` handling in globals.css.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
