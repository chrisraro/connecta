"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/components/inquiry/InquiryDialog";

/**
 * The one button every "upgrade"/"renew" action on the billing page goes
 * through.
 *
 * There is no payment gateway: clicking never starts a checkout, it opens
 * an inquiry dialog that hands the user to support. The plan cards keep
 * their prices and their call to action (the funnel reads as intentional
 * rather than broken), but the only thing behind the click is a
 * conversation. Wiring a real checkout later means changing this one
 * component, not every call site.
 */
export interface PlanUpgradeButtonProps {
  label: string;
  disabled?: boolean;
  variant?: "default" | "outline";
  className?: string;
}

export function PlanUpgradeButton({
  label,
  disabled = false,
  variant = "default",
  className,
}: PlanUpgradeButtonProps) {
  const [showInquiry, setShowInquiry] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowInquiry(true)}
        disabled={disabled}
        variant={variant}
        className={className}
      >
        {label}
      </Button>

      <InquiryDialog
        open={showInquiry}
        onOpenChange={setShowInquiry}
        title="Talk to us about upgrading"
        description="Plan upgrades are handled personally for now — online checkout is on the roadmap. Your plan and prices are ready; we'll get you set up directly."
        mailSubject="Pro upgrade"
      />
    </>
  );
}
