"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONNECTA } from "@/lib/brand";

/**
 * The single dialog every payment entry point opens instead of calling a
 * dead checkout action while `PAYMENTS_ENABLED` is `false` (see
 * lib/payments.ts). Task 11 introduced this for the Pro-upgrade funnel
 * (PlanUpgradeButton); the shop checkout (PayrexCheckoutButton) reuses the
 * exact same component with its own copy instead of duplicating the
 * markup — one place to keep the "polite placeholder, not a dead action"
 * promise consistent across every payment surface.
 */
export interface PaymentPlaceholderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Body copy above the support CTA. Defaults to a generic nudge. */
  supportBody?: string;
  /** Subject line for the mailto: support link. */
  mailSubject: string;
}

export function PaymentPlaceholderDialog({
  open,
  onOpenChange,
  title,
  description,
  supportBody = "Want to be notified the moment it opens, or need help sooner? Reach out and we'll take care of it directly.",
  mailSubject,
}: PaymentPlaceholderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{supportBody}</p>
        <DialogFooter>
          <Button asChild variant="outline">
            <a
              href={`mailto:${CONNECTA.supportEmail}?subject=${encodeURIComponent(
                mailSubject
              )}`}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email support
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
