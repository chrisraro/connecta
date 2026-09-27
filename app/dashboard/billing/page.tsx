"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMyPlan } from "@/hooks/useCurrentUser";
import { usePlanPricing } from "@/hooks/useSettings";
import { Check, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { DEFAULT_PLAN_PRICING, PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { PRICING, type BillingCycle } from "@/lib/pricing";
import { PlanUpgradeButton } from "@/components/billing/PlanUpgradeButton";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PAID_PLANS: Extract<PlanId, "lead_tools" | "teams">[] = ["lead_tools", "teams"];

/** lib/pricing.ts key for a paid plan id. */
const PRICING_KEY = { lead_tools: "leadTools", teams: "teams" } as const;

/**
 * Standard monthly price for a paid plan, in pesos.
 *
 * The admin settings override (hooks/useSettings usePlanPricing) replaces
 * this ONE number -- the standard monthly price -- and nothing else. The
 * prelaunch price and both yearly prices are fixed in lib/pricing.ts; see
 * lib/plans.ts PlanPricing for why the override's scope stops there.
 */
function standardMonthlyPesos(plan: "lead_tools" | "teams", override: Record<string, number> | undefined) {
  const centavos = override?.[plan] ?? DEFAULT_PLAN_PRICING[plan];
  return centavos / 100;
}

/**
 * Billing & plans.
 *
 * There is no payment gateway and no checkout: every upgrade/renew action
 * goes through PlanUpgradeButton, which opens an inquiry dialog. Prices and
 * plan limits are real (enforced in Postgres, see lib/plans.ts) -- only the
 * act of paying happens off-app for now. There is likewise no payment
 * history to show.
 *
 * Styled to match the homepage's Survey Plan pricing table
 * (components/landing/Pricing.tsx): square 1.5px boundaries, no shadows, no
 * "Most popular" badge, the prelaunch price shown as the real price with the
 * standard price struck through beside it.
 */
export default function BillingPage() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const myPlan = useMyPlan();
  const { data: pricingData } = usePlanPricing();

  if (myPlan === undefined || !user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const currentPlan = myPlan.plan;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing &amp; plans</h1>
        <p className="text-muted-foreground">
          Prepaid plans. Renew anytime — time stacks on what you have left.
        </p>
      </div>

      {/* Current plan */}
      <div className="border-[1.5px] border-input p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Current plan</h3>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-3xl font-bold tracking-tight">
                {PLAN_LIMITS[currentPlan].name}
              </span>
              {currentPlan !== "free" && (
                <span className="border-[1.5px] border-primary px-3 py-1 text-xs font-bold text-primary">
                  Active
                </span>
              )}
            </div>
            {currentPlan !== "free" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Renews / expires {fmtDate(myPlan.planExpiresAt)}
              </p>
            )}
          </div>
          {currentPlan !== "free" && (
            <PlanUpgradeButton label={`Renew ${PLAN_LIMITS[currentPlan].name}`} className="rounded-none" />
          )}
        </div>

        {myPlan.inGrace && (
          <div className="mt-5 flex items-start gap-3 border-[1.5px] border-[var(--connecta-mark)] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--connecta-mark-text)]" />
            <p className="text-sm text-foreground">
              Your plan expired on {fmtDate(myPlan.planExpiresAt)}. You&apos;re in a 3-day grace
              period — renew now to avoid downgrading to Free.
            </p>
          </div>
        )}
      </div>

      {/* Monthly / yearly toggle */}
      <div role="group" aria-label="Billing cycle" className="flex w-fit border-[1.5px] border-input">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cycle === c}
            onClick={() => setCycle(c)}
            className={`flex h-11 items-center px-4 text-[14px] font-bold transition-colors ${
              cycle === c ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            {c === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      {/* Plan comparison grid */}
      <div className="grid border-[1.5px] border-input lg:grid-cols-3">
        {/* Free */}
        <div className="relative flex flex-col border-b-[1.5px] border-input px-5 pb-7 pt-9 lg:border-b-0 lg:border-r-[1.5px] lg:last:border-r-0">
          <h3 className="absolute left-4 top-0 -translate-y-1/2 bg-background px-2 text-[19px] font-bold leading-none">
            Free
          </h3>
          <p className="text-[14px] text-muted-foreground">Try it out</p>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-[34px] font-medium">₱0</span>
            <span className="text-[14px] text-muted-foreground">forever</span>
          </p>
          <ul className="mb-6 mt-6 flex flex-col">
            {PLAN_LIMITS.free.features.map((f) => (
              <li key={f} className="flex items-center gap-3 border-b border-input/60 py-2.5 text-[15px]">
                <Check className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <span className="mt-auto flex h-12 items-center justify-center border-[1.5px] border-input text-[15px] font-bold text-muted-foreground">
            {currentPlan === "free" ? "Your plan" : "Free forever"}
          </span>
        </div>

        {PAID_PLANS.map((planId) => {
          const limits = PLAN_LIMITS[planId];
          const priceKey = PRICING_KEY[planId];
          const homepage = PRICING[priceKey][cycle];
          const standard = standardMonthlyPesosOrYearly(planId, cycle, pricingData, homepage);
          const isCurrent = planId === currentPlan;
          const unit = cycle === "monthly" ? "/ month" : "/ year";

          return (
            <div
              key={planId}
              className="relative flex flex-col border-b-[1.5px] border-input px-5 pb-7 pt-9 last:border-b-0 lg:border-b-0 lg:border-r-[1.5px] lg:last:border-r-0"
            >
              <h3 className="absolute left-4 top-0 -translate-y-1/2 bg-background px-2 text-[19px] font-bold leading-none">
                {limits.name}
              </h3>
              <p className="text-[14px] text-muted-foreground">
                {planId === "lead_tools" ? "For one person" : "Up to 5 people"}
              </p>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-[34px] font-medium">{peso(homepage.prelaunch)}</span>
                <span className="text-[14px] text-muted-foreground">{unit}</span>
              </p>
              <p className="mt-1 flex items-center gap-2 text-[13px]">
                <span className="border-[1.5px] border-[var(--connecta-mark)] px-1.5 py-0.5 text-[11px] font-bold uppercase text-[var(--connecta-mark-text)]">
                  Prelaunch
                </span>
                <span className="text-muted-foreground">
                  Standard <span className="line-through">{peso(standard)}</span>
                </span>
              </p>
              <ul className="mb-6 mt-6 flex flex-col">
                {limits.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 border-b border-input/60 py-2.5 text-[15px]">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <PlanUpgradeButton
                label={isCurrent ? `Renew ${limits.name}` : `Upgrade to ${limits.name}`}
                className="mt-auto flex h-12 w-full items-center justify-center rounded-none text-[15px] font-bold"
              />
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        There is no online checkout yet. Send a request and we&apos;ll confirm payment by GCash or
        bank transfer, then switch your plan on — usually within a day.
      </p>
    </div>
  );
}

/**
 * The struck-through "standard" price beside the prelaunch price.
 *
 * Monthly: the admin-overridable standard price (see standardMonthlyPesos).
 * Yearly: the fixed constant in lib/pricing.ts -- the settings override only
 * ever applies to the standard MONTHLY price (lib/plans.ts PlanPricing).
 */
function standardMonthlyPesosOrYearly(
  planId: "lead_tools" | "teams",
  cycle: BillingCycle,
  pricingData: Record<string, number> | undefined,
  homepage: { standard: number; prelaunch: number },
): number {
  if (cycle === "yearly") return homepage.standard;
  return standardMonthlyPesos(planId, pricingData);
}
