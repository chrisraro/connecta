/**
 * localStorage keys shared across the guest shopping flow. Kept in one file
 * so the call sites (CartContext, shop/cart, offline-leads) can never drift
 * from each other — a guest cart or a queue of offline leads is read back by
 * key elsewhere in the app, so the literal string must stay byte-identical
 * everywhere it's used.
 */
export const GUEST_CART_ID_KEY = "connecta_guest_cart_id";
export const OFFLINE_LEADS_KEY = "connecta_offline_leads";
// Per-browser identity for createLead's visitor-scoped rate limit
// (convex/leads.ts). Deliberately carries no brand prefix.
export const LEAD_VISITOR_ID_KEY = "lead_visitor_id";
