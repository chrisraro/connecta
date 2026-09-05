/**
 * Single on/off switch for the real payment-gateway checkout flow.
 *
 * The team has not chosen a payment gateway yet — PayRex is not committed
 * and no keys are configured (convex/billing.ts#createUpgradeCheckout
 * throws immediately: `PAYREX_SECRET_KEY is not configured`). The billing
 * page and every "Get Pro" entry point (components/billing/UpgradeGate.tsx,
 * components/billing/PlanUpgradeButton.tsx) must never call that dead
 * checkout — they gate on this one constant instead of duplicating the
 * "is checkout wired up" question at each call site.
 *
 * The server-side payrex/billing code (convex/billing.ts, convex/payrex.ts)
 * stays in place for the future gateway decision; it's simply unreachable
 * from the UI while this is `false`. Flipping it back to `true` re-enables
 * the real flow with no further archaeology — every call site already reads
 * from here.
 */
export const PAYMENTS_ENABLED = false;

/**
 * Pure decision for /dashboard/billing's "Payment received… confirm with
 * PayRex" banner (`?paid=1`). That query param is only ever real when a
 * checkout redirect actually happened — which requires PAYMENTS_ENABLED.
 * With payments off, an old bookmarked/cached link carrying `?paid=1` must
 * not resurrect the banner as a confusing stale state; it must render
 * nothing. Extracted as a pure function (rather than inlined JSX) so the
 * decision is testable without mounting the page.
 */
export function showPaymentReceivedBanner(
  paid: boolean,
  paymentsEnabled: boolean = PAYMENTS_ENABLED,
): boolean {
  return paid && paymentsEnabled;
}
