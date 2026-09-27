import { Check } from "lucide-react";
import { PLAN_LIMITS, DEFAULT_PLAN_PRICING, type PlanId } from "@/lib/plans";
import { usePlanPricing } from "@/hooks/useSettings";
import { formatPHP } from "@/lib/payment";
import { PlanUpgradeButton } from "@/components/billing/PlanUpgradeButton";

/**
 * Display names for lib/plans.ts's internal "pro"/"business" ids. The plan
 * IDS and their limits/prices stay exactly as lib/plans.ts defines them
 * (that file is the enforcement source); only the label shown to a person
 * setting up their profile matches the current product naming (Free / Lead
 * tools / Teams — see components/landing/copy.ts).
 */
const PLAN_DISPLAY_NAME: Record<PlanId, string> = {
  free: "Free",
  pro: "Lead tools",
  business: "Teams",
};

/**
 * Step 10 (skippable = continue on Free): the paywall. There is no online
 * checkout — continuing on Free needs no action, and every paid plan's
 * button opens the same inquiry flow the billing page uses
 * (components/billing/PlanUpgradeButton.tsx / InquiryDialog): the owner
 * confirms payment (GCash or bank) and switches the plan on, usually within
 * a day. Never implies instant checkout.
 */
export function PlansStep() {
  const { data: pricingData } = usePlanPricing();
  const pricing = pricingData ?? DEFAULT_PLAN_PRICING;
  const priceFor = (p: PlanId) => (p === "free" ? 0 : p === "pro" ? pricing.pro : pricing.business);
  const tiers: PlanId[] = ["free", "pro", "business"];

  return (
    <div className="flex-1 space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Start on Free, or ask to move to a paid plan now — you decide, no card required today.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {tiers.map((p) => {
          const limits = PLAN_LIMITS[p];
          return (
            <div key={p} className="flex flex-col border-[1.5px] border-input p-4">
              <h3 className="text-sm font-bold">{PLAN_DISPLAY_NAME[p]}</h3>
              <p className="mt-1 font-mono text-lg font-medium">
                {priceFor(p) === 0 ? "₱0" : formatPHP(priceFor(p))}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {p === "free" ? "forever" : "/ 30 days"}
                </span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {limits.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[13px]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {p === "free" ? (
                  <p className="text-center text-xs text-muted-foreground">Selected by continuing</p>
                ) : (
                  <PlanUpgradeButton label={`Ask about ${PLAN_DISPLAY_NAME[p]}`} variant="outline" className="w-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        No online payment yet: we confirm by GCash or bank transfer and switch your plan on
        directly, usually within a day.
      </p>
    </div>
  );
}
