/**
 * localStorage keys shared across the guest-checkout flow. Kept in one file
 * so the four call sites (CartContext, shop/cart, shop/checkout,
 * offline-leads) can never drift from each other — a guest cart, an applied
 * discount code, or queued offline leads are all read back by key elsewhere
 * in the app, so the literal string must stay byte-identical everywhere it's
 * used. These keys intentionally retain their original prefix from before
 * the product's rename: changing the value would orphan anything already
 * written to a real user's browser under the old key before the rename
 * shipped. See lib/brand.test.ts's INFRA_EXCEPTIONS, which allowlists
 * exactly the three `export const` lines below (and only those lines) for
 * the retired brand name.
 */
export const GUEST_CART_ID_KEY = "tapfolio_guest_cart_id";
export const DISCOUNT_CODE_KEY = "tapfolio_discount_code";
export const OFFLINE_LEADS_KEY = "tapfolio_offline_leads";
// Task 17 / I2: per-browser identity for createLead's visitor-scoped rate
// limit (convex/leads.ts). New key, added after the rename — deliberately
// carries no brand prefix, unlike the three above (which keep their
// pre-rename literal value on purpose; see the file-comment above).
export const LEAD_VISITOR_ID_KEY = "lead_visitor_id";
