import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/**
 * EmptyState — a reusable, on-brand empty/zero-state block.
 * icon + one-liner + optional CTA. Used across dashboard, shop, leads, etc.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const renderAction = (a: EmptyStateAction, variant: "default" | "outline") => {
    const btn = (
      <Button variant={variant} className="rounded-2xl px-6" onClick={a.onClick} type="button">
        {a.label}
      </Button>
    );
    return a.href ? <Link href={a.href}>{btn}</Link> : btn;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-[2rem] border border-dashed border-border bg-card/50 px-6 py-14",
        className,
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {action && renderAction(action, "default")}
          {secondaryAction && renderAction(secondaryAction, "outline")}
        </div>
      )}
    </div>
  );
}
