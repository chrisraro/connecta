import { Check } from "lucide-react";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { PRICING, formatPeso } from "@/lib/pricing";
import { PlanUpgradeButton } from "@/components/billing/PlanUpgradeButton";

/**
 * The plans step (skippable = continue on Free): the paywall. Names,
 * features and prices come from lib/plans.ts and lib/pricing.ts, the same
 * sources as the homepage and billing page. There is no online checkout:
 * continuing on Free needs no action, and each paid plan's button opens the
 * request flow the billing page uses (PlanUpgradeButton / InquiryDialog).
 * The owner confirms payment (GCash or bank) and switches the plan on.
 */
const MONTHLY: Record<Exclude<PlanId, "free">, { standard: number; prelaunch: number }> = {
  lead_tools: PRICING.leadTools.monthly,
  teams: PRICING.teams.monthly,
};

const TIERS: PlanId[] = ["free", "lead_tools", "teams"];

export function PlansStep() {
  return (
    <div className="flex-1 space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Start on Free, or ask for a paid plan now. You decide; nothing is charged today.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIERS.map((p) => {
          const limits = PLAN_LIMITS[p];
          const price = p === "free" ? null : MONTHLY[p];
          return (
            <div key={p} className="flex flex-col border-[1.5px] border-input p-4">
              <h3 className="text-sm font-bold">{limits.name}</h3>
              <p className="mt-1 flex flex-wrap items-baseline font-mono text-lg font-medium">
                {price ? (
                  <>
                    {formatPeso(price.prelaunch)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">
                      {formatPeso(price.standard)}
                    </span>
                    <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                  </>
                ) : (
                  <>
                    ₱0
                    <span className="ml-1 text-xs font-normal text-muted-foreground">forever</span>
                  </>
                )}
              </p>
              {price && <p className="text-xs text-muted-foreground">Prelaunch price</p>}
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
                  <p className="text-center text-xs text-muted-foreground">Selected when you continue</p>
                ) : (
                  <PlanUpgradeButton label={`Ask for ${limits.name}`} variant="outline" className="w-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        No online payment yet: we confirm by GCash or bank transfer and switch your plan on, usually
        within a day.
      </p>
    </div>
  );
}
