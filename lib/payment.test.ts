import { expect, test, describe } from "vitest";
import { formatPHP, formatCatalogPrice } from "./payment";

/**
 * Task 16 / audit-journey Major #7 — product prices rendered 100x too small
 * on the Storefront tab ("₱19.99" showed as "₱0.20"), and disagreed with the
 * Portfolio tab's rendering of the same price (which showed the right scale
 * but the wrong currency symbol, "$19.99").
 *
 * Root cause: two genuinely different storage conventions exist in this
 * codebase and got crossed at the render boundary.
 *   - Subscription/shop/order amounts are stored in integer CENTAVOS
 *     (convex/plans.ts `priceCentavos: 29900` = ₱299.00; convex/schema.ts
 *     `products.basePrice`, `carts.items.priceAtAdd`, billing's
 *     `amountCentavos`) and are correctly rendered via `formatPHP`, which
 *     divides by 100.
 *   - A profile's Storefront/Portfolio catalog price
 *     (`profiles.products[].price`, convex/schema.ts:132) is written by the
 *     builder as a plain decimal PESO amount — `Number(p.price)` with no
 *     ×100 conversion (app/dashboard/builder/page.tsx, `cleanProducts`,
 *     `PRODUCT_FIELDS` "Price (optional)" — a bare number input, e.g. the
 *     user types "19.99" or "400" and that's exactly what's stored).
 *
 * `StorefrontView.tsx` fed that peso value into `formatPHP` (which assumes
 * centavos), dividing it by 100 a second time. `ProductsSection.tsx` (the
 * Portfolio tab) rendered the same peso value raw with a hardcoded "$".
 *
 * The fix is at the render boundary, not the data: `formatCatalogPrice`
 * formats an already-in-pesos amount (no /100), and both tabs are routed
 * through it. `formatPHP` is untouched — it's still correct for every
 * genuinely centavos-denominated amount elsewhere (billing, shop, admin
 * analytics).
 */

describe("formatCatalogPrice (profile Storefront/Portfolio product prices, stored in pesos)", () => {
  test("formats a peso price with cents using the correct PHP symbol", () => {
    // The audit's own repro value: a product saved with price 19.99 must
    // render as ₱19.99, not ₱0.20 (old centavos-formatter bug) and not
    // $19.99 (old Portfolio hardcoded-symbol bug).
    expect(formatCatalogPrice(19.99)).toBe("₱19.99");
  });

  test("formats zero as ₱0.00, not a blank or dropped price", () => {
    expect(formatCatalogPrice(0)).toBe("₱0.00");
  });

  test("formats a whole-peso integer price with two trailing zeros (e.g. the NFC Cards product at 400)", () => {
    expect(formatCatalogPrice(400)).toBe("₱400.00");
  });

  test("pads a single-decimal price to two digits instead of dropping the trailing zero", () => {
    expect(formatCatalogPrice(10.5)).toBe("₱10.50");
  });

  test("keeps a genuine 5-centavo price distinguishable from a whole peso", () => {
    expect(formatCatalogPrice(0.05)).toBe("₱0.05");
  });

  test("inserts thousands separators for a large price", () => {
    expect(formatCatalogPrice(12345.5)).toBe("₱12,345.50");
  });

  test("rounds cleanly through float-drift-prone arithmetic instead of leaking binary-float noise", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE-754 double arithmetic.
    expect(formatCatalogPrice(0.1 + 0.2)).toBe("₱0.30");
  });

  test("treats a missing/non-finite price as ₱0.00 rather than throwing or rendering NaN", () => {
    expect(formatCatalogPrice(undefined as unknown as number)).toBe("₱0.00");
    expect(formatCatalogPrice(NaN)).toBe("₱0.00");
  });
});

describe("formatPHP (centavos — unchanged; regression guard for the convention this module still uses everywhere else)", () => {
  test("divides integer centavos by 100, e.g. a ₱299.00 plan price stored as 29900", () => {
    expect(formatPHP(29900)).toBe("₱299.00");
  });

  test("formats the module doc comment's own worked example", () => {
    expect(formatPHP(12345)).toBe("₱123.45");
  });
});
