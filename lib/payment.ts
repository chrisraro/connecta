/**
 * Payment helpers (PayRex)
 *
 * DEPRECATION NOTE
 * ----------------
 * The previous Stripe/PayPal provider-abstraction layer has been removed.
 * Payments are now handled exclusively by PayRex via hosted Checkout Sessions:
 *   - Session creation: convex/payrex.ts (Convex action `createCheckoutSession`)
 *   - Webhook confirmation: convex/http.ts (`/webhooks/payrex`)
 *
 * This module now only exposes PHP currency formatting helpers. All amounts in
 * the system are stored in centavos (PHP cents).
 */

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/** Format an amount in centavos as a PHP currency string, e.g. 12345 -> "₱123.45". */
export function formatPHP(centavos: number): string {
  return phpFormatter.format((centavos ?? 0) / 100);
}
