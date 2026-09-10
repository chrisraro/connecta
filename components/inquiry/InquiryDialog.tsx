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
 * The single dialog every "upgrade" / "buy" entry point opens. There is no
 * payment gateway in the product: plan upgrades and shop purchases are
 * handled as inquiries (email support), and checkout is a future roadmap
 * item. Callers pass their own copy so one component keeps the "polite
 * hand-off to a human, not a dead action" promise consistent across every
 * commerce surface.
 */
export interface InquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Body copy above the support CTA. Defaults to a generic nudge. */
  supportBody?: string;
  /** Subject line for the mailto: support link. */
  mailSubject: string;
  /** Optional prefilled mailto: body — e.g. the items being inquired about. */
  mailBody?: string;
}

export function InquiryDialog({
  open,
  onOpenChange,
  title,
  description,
  supportBody = "Want to be notified the moment it opens, or need help sooner? Reach out and we'll take care of it directly.",
  mailSubject,
  mailBody,
}: InquiryDialogProps) {
  const mailto =
    `mailto:${CONNECTA.supportEmail}?subject=${encodeURIComponent(mailSubject)}` +
    (mailBody ? `&body=${encodeURIComponent(mailBody)}` : "");
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
            <a href={mailto}>
              <Mail className="mr-2 h-4 w-4" />
              Email support
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
