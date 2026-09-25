import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// B8 (backlog 2026-09-25): the product page promised "Free Shipping on orders
// over ₱50" and "Secure Checkout, SSL encrypted". Neither exists: there is no
// shipping rule and checkout is an email hand-off. Keep them off until they do.
test("the product page makes no shipping or checkout promises", () => {
  const src = readFileSync(join(__dirname, "../app/shop/product/[slug]/page.tsx"), "utf8");
  for (const claim of ["Free Shipping", "SSL encrypted", "Secure Checkout"]) {
    expect(src, claim).not.toContain(claim);
  }
});
