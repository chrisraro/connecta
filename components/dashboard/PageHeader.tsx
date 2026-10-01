import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * The top of every dashboard page (2026-10-01): one title style, one
 * description style, actions on the right. The title is the section's name
 * from lib/dashboardNav.ts, except Overview's greeting.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold [font-stretch:112%]">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A dashboard page that is still loading its data. */
export function PageLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
