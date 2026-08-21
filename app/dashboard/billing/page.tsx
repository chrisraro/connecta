"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { formatPHP } from "@/lib/payment";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { PlanUpgradeButton } from "@/components/billing/PlanUpgradeButton";

function fmtDate(ts: number | null | undefined): string {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function BillingContent() {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const paid = searchParams.get("paid") === "1";
    const cancelled = searchParams.get("cancelled") === "1";

    const myPlan = useQuery(api.billing.getMyPlan, user?.id ? { clerkId: user.id } : {});
    const createCheckout = useAction(api.billing.createUpgradeCheckout);

    const [busy, setBusy] = useState<PlanId | null>(null);

    if (myPlan === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    const currentPlan = myPlan.plan;
    const pricing = myPlan.pricing;
    const priceFor = (p: PlanId) =>
        p === "free" ? 0 : p === "pro" ? pricing.pro : pricing.business;

    const handleUpgrade = async (plan: "pro" | "business") => {
        setBusy(plan);
        try {
            const { url } = await createCheckout({ plan });
            window.location.href = url;
        } catch (error) {
            toast.error(toUserMessage(error));
            setBusy(null);
        }
    };

    const tiers: PlanId[] = ["free", "pro", "business"];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing &amp; Plans</h1>
                <p className="text-muted-foreground">
                    Prepaid 30-day plans. Renew anytime — time stacks on what you have left.
                </p>
            </div>

            {paid && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div className="text-sm">
                        <p className="font-semibold text-foreground">Payment received</p>
                        <p className="text-muted-foreground">
                            Your plan is being activated. This can take a few seconds while we
                            confirm with PayRex — refresh if it doesn&apos;t update shortly.
                        </p>
                    </div>
                </div>
            )}
            {cancelled && (
                <div className="rounded-2xl border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
                    Checkout cancelled — no changes were made to your plan.
                </div>
            )}

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
                            paymentsEnabled={PAYMENTS_ENABLED}
                            busy={busy === currentPlan}
                            disabled={busy !== null}
                            onUpgrade={() => handleUpgrade(currentPlan as "pro" | "business")}
                            className="rounded-2xl"
                        />
                    )}
                </div>

                {myPlan.inGrace && (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <p className="text-sm text-foreground">
                            Your plan expired on {fmtDate(myPlan.planExpiresAt)}. You&apos;re in a
                            3-day grace period — renew now to avoid downgrading to Free.
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
                                highlight
                                    ? "border-primary ring-1 ring-primary/20"
                                    : "border-border"
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
                                        label={
                                            isCurrent
                                                ? `Renew ${limits.name}`
                                                : `Upgrade to ${limits.name}`
                                        }
                                        paymentsEnabled={PAYMENTS_ENABLED}
                                        busy={busy === p}
                                        disabled={busy !== null}
                                        onUpgrade={() => handleUpgrade(p as "pro" | "business")}
                                        variant={highlight ? "default" : "outline"}
                                        className="h-11 w-full rounded-2xl font-semibold"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Invoice history */}
            <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold tracking-tight">Payment History</h3>
                {myPlan.invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Plan</th>
                                    <th className="pb-3 font-medium">Amount</th>
                                    <th className="pb-3 font-medium">Period</th>
                                    <th className="pb-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myPlan.invoices.map((inv) => (
                                    <tr key={inv._id} className="border-b border-border/50 last:border-0">
                                        <td className="py-3">{fmtDate(inv.createdAt)}</td>
                                        <td className="py-3 capitalize">{inv.plan}</td>
                                        <td className="py-3 font-medium">{formatPHP(inv.amountCentavos)}</td>
                                        <td className="py-3 text-muted-foreground">
                                            {inv.periodStart && inv.periodEnd
                                                ? `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}`
                                                : "—"}
                                        </td>
                                        <td className="py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                                                    inv.status === "paid"
                                                        ? "bg-emerald-500/10 text-emerald-500"
                                                        : inv.status === "pending"
                                                        ? "bg-amber-500/10 text-amber-500"
                                                        : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {PAYMENTS_ENABLED
                    ? "Payments processed securely by PayRex (GCash, Maya, Card, QR Ph)."
                    : "We're finalizing our payment provider — plan prices above are final, checkout is opening soon."}
            </p>
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="animate-spin text-primary w-8 h-8" />
                </div>
            }
        >
            <BillingContent />
        </Suspense>
    );
}
