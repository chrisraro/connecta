import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * PayRex Hosted Checkout (https://api.payrexhq.com)
 *
 * Implemented with plain fetch (no SDK). Creates a hosted Checkout Session and
 * returns its redirect URL. Amounts are sent in centavos. The customer is then
 * redirected to PayRex; payment confirmation arrives asynchronously via the
 * webhook in convex/http.ts.
 */

const PAYREX_BASE_URL = "https://api.payrexhq.com";

// Shape of the subset of the PayRex checkout-session response we consume.
interface PayrexCheckoutSession {
  id: string;
  url: string;
  payment_intent?: string | { id?: string };
}

// Encode a flat list of [key, value] pairs as application/x-www-form-urlencoded.
// Keys already include PayRex bracket syntax (e.g. line_items[][name]).
function encodeForm(pairs: Array<[string, string]>): string {
  return pairs
    .map(
      ([k, val]) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`
    )
    .join("&");
}

export const createCheckoutSession = action({
  args: {
    orderNumber: v.string(),
    // Required for guest checkout (see schema.ts#orders.guestOrderToken).
    // Ignored for a signed-in caller's own order — ownership there is
    // proven by the auth token instead.
    guestOrderToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const secretKey = process.env.PAYREX_SECRET_KEY;
    if (!secretKey) {
      throw new Error("PAYREX_SECRET_KEY is not configured");
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    // SECURITY (Task 19 / C2): this action used to load ANY order by number
    // with no ownership check at all — order numbers are predictable
    // (timestamp + 3-char suffix, see convex/checkout.ts#getOrderByNumber),
    // and this action returns a live PayRex checkout URL and writes the
    // payrexCheckoutId/paymentIntentId that convex/http.ts's webhook later
    // trusts to resolve the order. Anyone who could guess/enumerate an
    // order number could hijack a stranger's checkout. getOrderForPaymentAuthorized
    // mirrors getOrderByNumber's isOwner/isAdmin check for signed-in orders
    // and adds the guest-token check for guest orders (no Convex identity to
    // check ownership against there).
    const identity = await ctx.auth.getUserIdentity();
    const { order, authorized } = await ctx.runQuery(
      internal.checkout.getOrderForPaymentAuthorized,
      {
        orderNumber: args.orderNumber,
        clerkSubject: identity?.subject,
        guestOrderToken: args.guestOrderToken,
      }
    );
    if (!order) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Order not found" });
    }
    if (!authorized) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You do not have access to this order",
      });
    }
    if (order.paymentStatus === "paid") {
      throw new ConvexError({
        code: "ALREADY_PAID",
        message: "Order is already paid",
      });
    }

    // Build line items (amounts already in centavos).
    const pairs: Array<[string, string]> = [
      ["currency", "PHP"],
      ["success_url", `${appUrl}/shop/order/${order.orderNumber}?paid=1`],
      ["cancel_url", `${appUrl}/shop/checkout?cancelled=1`],
      ["billing_details_collection", "auto"],
    ];

    // Supported payment methods.
    for (const method of ["gcash", "maya", "card", "qrph"]) {
      pairs.push(["payment_methods[]", method]);
    }

    // Product line items.
    for (const item of order.items) {
      const name = item.variationName
        ? `${item.productName} (${item.variationName})`
        : item.productName;
      pairs.push(["line_items[][name]", name]);
      pairs.push(["line_items[][amount]", String(item.unitPrice)]);
      pairs.push(["line_items[][quantity]", String(item.quantity)]);
    }

    // Shipping as its own line item, if nonzero.
    if (order.shipping && order.shipping > 0) {
      pairs.push(["line_items[][name]", "Shipping"]);
      pairs.push(["line_items[][amount]", String(order.shipping)]);
      pairs.push(["line_items[][quantity]", "1"]);
    }

    // Tax as its own line item, if nonzero.
    if (order.tax && order.tax > 0) {
      pairs.push(["line_items[][name]", "Tax"]);
      pairs.push(["line_items[][amount]", String(order.tax)]);
      pairs.push(["line_items[][quantity]", "1"]);
    }

    // Discount as a negative adjustment line item, if nonzero.
    if (order.discount && order.discount > 0) {
      pairs.push(["line_items[][name]", "Discount"]);
      pairs.push(["line_items[][amount]", String(-order.discount)]);
      pairs.push(["line_items[][quantity]", "1"]);
    }

    // Metadata so the webhook can resolve the order (+ discount code for usage).
    pairs.push(["metadata[order_number]", order.orderNumber]);

    const body = encodeForm(pairs);

    // HTTP Basic auth: username = secret key, empty password.
    const authHeader =
      "Basic " + btoa(`${secretKey}:`);

    const res = await fetch(`${PAYREX_BASE_URL}/checkout_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader,
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `PayRex checkout session creation failed (${res.status}): ${errText}`
      );
    }

    const session = (await res.json()) as PayrexCheckoutSession;

    // Normalize the payment intent id (it may be a string or an object).
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    // Persist the session + intent ids on the order.
    await ctx.runMutation(internal.checkout.attachPayrexSession, {
      orderNumber: order.orderNumber,
      payrexCheckoutId: session.id,
      paymentIntentId,
    });

    return { url: session.url };
  },
});
