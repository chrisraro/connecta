/**
 * localStorage keys shared across the guest-checkout flow. Kept in one file
 * so the four call sites (CartContext, shop/cart, shop/checkout,
 * offline-leads) can never drift from each other — a guest cart, an applied
 * discount code, or queued offline leads are all read back by key elsewhere
 * in the app, so the literal string must stay byte-identical everywhere it's
 * used.
 */
export const GUEST_CART_ID_KEY = "connecta_guest_cart_id";
export const DISCOUNT_CODE_KEY = "connecta_discount_code";
export const OFFLINE_LEADS_KEY = "connecta_offline_leads";
// Per-browser identity for createLead's visitor-scoped rate limit
// (convex/leads.ts). Deliberately carries no brand prefix.
export const LEAD_VISITOR_ID_KEY = "lead_visitor_id";
