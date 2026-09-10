/**
 * PHP currency formatting helpers.
 *
 * Named for the amounts it formats, not for a payment gateway — there is
 * none. The shop routes purchases to an inquiry and plan upgrades are
 * arranged directly, so nothing here talks to a processor.
 *
 * It exposes formatters for TWO distinct storage conventions that coexist
 * in this codebase — pick the one that matches where the amount came from,
 * they are not interchangeable:
 *
 *   - `formatPHP` — for amounts stored as integer CENTAVOS (PHP cents).
 *     This is subscription/billing amounts (convex/plans.ts
 *     `priceCentavos`) and the shop catalog (convex/schema.ts
 *     `products.basePrice`, `carts.items.priceAtAdd`).
 *   - `formatCatalogPrice` — for a profile's Storefront/Portfolio catalog
 *     price (`profiles.products[].price`, convex/schema.ts), which the
 *     builder stores as a plain decimal PESO amount (`Number(p.price)`,
 *     no x100 conversion — see app/dashboard/builder/page.tsx
 *     `cleanProducts`). Feeding that value into `formatPHP` divides an
 *     already-in-pesos amount by 100 a second time (audit-journey Major
 *     #7: P19.99 rendered as P0.20 on the Storefront tab).
 */

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/** Format an amount in centavos as a PHP currency string, e.g. 12345 -> "₱123.45". */
export function formatPHP(centavos: number): string {
  return phpFormatter.format((centavos ?? 0) / 100);
}

/**
 * Format an amount already denominated in whole pesos (not centavos) as a
 * PHP currency string, e.g. 19.99 -> "₱19.99", 400 -> "₱400.00".
 *
 * Use this — never `formatPHP` — for a profile's Storefront/Portfolio
 * catalog price (`profiles.products[].price`, `profiles.services[].price`).
 * That field is written by the builder as a plain peso decimal, not
 * centavos; see the module doc comment above.
 */
export function formatCatalogPrice(pesos: number): string {
  const safe = typeof pesos === "number" && Number.isFinite(pesos) ? pesos : 0;
  return phpFormatter.format(safe);
}
