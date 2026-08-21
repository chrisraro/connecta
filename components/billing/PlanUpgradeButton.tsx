"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentPlaceholderDialog } from "@/components/billing/PaymentPlaceholderDialog";

/**
 * The one button every "upgrade"/"renew" action on the billing page goes
 * through. It gates on a single `paymentsEnabled` prop (the billing page
 * passes `PAYMENTS_ENABLED` from lib/payments.ts) instead of each call site
 * deciding for itself whether checkout is safe to call:
 *
 *  - `paymentsEnabled` true: clicking calls `onUpgrade` (the real
 *    createUpgradeCheckout flow) exactly as before.
 *  - `paymentsEnabled` false (current state — no gateway chosen, no keys
 *    configured, convex/billing.ts#createUpgradeCheckout throws): clicking
 *    NEVER calls `onUpgrade`. It opens a placeholder dialog instead, so the
 *    plan cards keep their prices and "Upgrade" buttons (the funnel looks
 *    intentional) without ever reaching the dead checkout action.
 *
 * Flipping lib/payments.ts#PAYMENTS_ENABLED back to `true` is the entire
 * migration back to the real flow — this component needs no further
 * changes.
 */
export interface PlanUpgradeButtonProps {
  label: string;
  paymentsEnabled: boolean;
  onUpgrade: () => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline";
  className?: string;
}

export function PlanUpgradeButton({
  label,
  paymentsEnabled,
  onUpgrade,
  busy = false,
  disabled = false,
  variant = "default",
  className,
}: PlanUpgradeButtonProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const handleClick = () => {
    if (paymentsEnabled) {
      void onUpgrade();
    } else {
      setShowPlaceholder(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || busy}
        variant={variant}
        className={className}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>

      <PaymentPlaceholderDialog
        open={showPlaceholder}
        onOpenChange={setShowPlaceholder}
        title="Pro upgrades are opening soon"
        description="We're finalizing our payment provider — Pro upgrades are opening soon. Your plan and prices are ready; checkout just isn't live yet."
        mailSubject="Pro upgrade"
      />
    </>
  );
}
