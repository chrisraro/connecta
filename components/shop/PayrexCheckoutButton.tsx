"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentPlaceholderDialog } from "@/components/billing/PaymentPlaceholderDialog";

/**
 * The one button the shop checkout's "Pay" step goes through. Mirrors
 * components/billing/PlanUpgradeButton.tsx's PAYMENTS_ENABLED gate (Task 11)
 * so the same "no gateway chosen yet, terminate in a polite placeholder"
 * contract holds for this payment surface too.
 *
 *  - `paymentsEnabled` true: clicking calls `onCheckout` (creates the order,
 *    creates the PayRex checkout session, redirects) exactly as before.
 *  - `paymentsEnabled` false (current state — no gateway chosen, no keys
 *    configured, convex/payrex.ts#createCheckoutSession throws
 *    "PAYREX_SECRET_KEY is not configured"): clicking NEVER calls
 *    `onCheckout`. Crucially, `createOrder` — the mutation that clears the
 *    cart server-side as part of creating the pending order — is bundled
 *    inside `onCheckout` and is therefore never invoked either, so the cart
 *    stays intact and no unpayable pending order is created. A placeholder
 *    dialog opens instead, offering a support contact.
 *
 * Flipping lib/payments.ts#PAYMENTS_ENABLED back to `true` is the entire
 * migration back to the real flow — this component needs no further
 * changes.
 */
export interface PayrexCheckoutButtonProps {
  paymentsEnabled: boolean;
  onCheckout: () => void | Promise<void>;
  /** Label shown when idle, e.g. "Pay ₱1,234.00 with PayRex". */
  totalLabel: string;
  /** Label shown while `busy` is true. */
  busyLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PayrexCheckoutButton({
  paymentsEnabled,
  onCheckout,
  totalLabel,
  busyLabel = "Redirecting to PayRex...",
  busy = false,
  disabled = false,
  className,
}: PayrexCheckoutButtonProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const handleClick = () => {
    if (paymentsEnabled) {
      void onCheckout();
    } else {
      setShowPlaceholder(true);
    }
  };

  return (
    <>
      <Button
        size="lg"
        onClick={handleClick}
        disabled={disabled || busy}
        className={className}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {busyLabel}
          </>
        ) : (
          totalLabel
        )}
      </Button>

      <PaymentPlaceholderDialog
        open={showPlaceholder}
        onOpenChange={setShowPlaceholder}
        title="Online payment is opening soon"
        description="We're finalizing our payment provider — online checkout isn't live yet. Your cart is saved, so you can complete this order as soon as checkout opens."
        mailSubject="Shop order"
      />
    </>
  );
}
