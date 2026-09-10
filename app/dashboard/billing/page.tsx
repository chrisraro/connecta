"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { formatPHP } from "@/lib/payment";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { PlanUpgradeButton } from "@/components/billing/PlanUpgradeButton";

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Billing & plans.
 *
 * There is no payment gateway and no checkout: every upgrade/renew action
 * goes through PlanUpgradeButton, which opens an inquiry dialog. Prices and
 * plan limits are real (convex/billing.ts still owns pricing and the
 * expiry/grace logic) — only the act of paying happens off-app for now.
 * There is likewise no payment history to show.
 */
export default function BillingPage() {
  const { user } = useUser();

  const myPlan = useQuery(api.billing.getMyPlan, user?.id ? { clerkId: user.id } : {});

  if (myPlan === undefined) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const currentPlan = myPlan.plan;
  const pricing = myPlan.pricing;
  const priceFor = (p: PlanId) => (p === "free" ? 0 : p === "pro" ? pricing.pro : pricing.business);

  const tiers: PlanId[] = ["free", "pro", "business"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing &amp; Plans</h1>
        <p className="text-muted-foreground">
          Prepaid 30-day plans. Renew anytime — time stacks on what you have left.
        </p>
      </div>

      {/* Current plan card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Current Plan
            </h3>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-3xl font-black tracking-tight">
                {PLAN_LIMITS[currentPlan].name}
              </span>
              {currentPlan !== "free" && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
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
            <PlanUpgradeButton
              label={`Renew ${PLAN_LIMITS[currentPlan].name}`}
              className="rounded-2xl"
            />
          )}
        </div>

        {myPlan.inGrace && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm text-foreground">
              Your plan expired on {fmtDate(myPlan.planExpiresAt)}. You&apos;re in a 3-day grace
              period — renew now to avoid downgrading to Free.
            </p>
          </div>
        )}
      </div>

      {/* Plan comparison grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((p) => {
          const limits = PLAN_LIMITS[p];
          const isCurrent = p === currentPlan;
          const highlight = p === "pro";
          return (
            <div
              key={p}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                highlight ? "border-primary ring-1 ring-primary/20" : "border-border"
              }`}
            >
              {highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold tracking-tight">{limits.name}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tighter">
                  {priceFor(p) === 0 ? "₱0" : formatPHP(priceFor(p))}
                </span>
                <span className="text-sm text-muted-foreground">
                  {p === "free" ? "forever" : "/ 30 days"}
                </span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {limits.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {p === "free" ? (
                  <Button variant="outline" disabled className="h-11 w-full rounded-2xl">
                    {isCurrent ? "Your plan" : "Free forever"}
                  </Button>
                ) : (
                  <PlanUpgradeButton
                    label={isCurrent ? `Renew ${limits.name}` : `Upgrade to ${limits.name}`}
                    variant={highlight ? "default" : "outline"}
                    className="h-11 w-full rounded-2xl font-semibold"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Prices above are final. Online checkout is on our roadmap — for now we set up upgrades with
        you directly.
      </p>
    </div>
  );
}
