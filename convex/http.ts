import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * PayRex Webhook (Convex HTTP action)
 *
 * Public URL: https://<deployment>.convex.site/webhooks/payrex
 *
 * PayRex POSTs a JSON event { id, type, data } with header:
 *   Payrex-Signature: t=<ts>,te=<testsig>,li=<livesig>
 *
 * Verification: computed = HMAC_SHA256_hex(`${t}.${rawBody}`, PAYREX_WEBHOOK_SECRET).
 * Compare to li (if non-empty) else te, using a constant-time comparison.
 * Convex runtime has no node:crypto, so we use Web Crypto (crypto.subtle).
 */

// Parse the Payrex-Signature header into its components.
function parseSignatureHeader(header: string): {
  t?: string;
  te?: string;
  li?: string;
} {
  const out: { t?: string; te?: string; li?: string } = {};
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") out.t = value;
    else if (key === "te") out.te = value;
    else if (key === "li") out.li = value;
  }
  return out;
}

// Compute lowercase hex HMAC-SHA256 of `message` keyed by `secret`.
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

// Constant-time string comparison.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const payrexWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.PAYREX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PAYREX_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 400 });
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get("Payrex-Signature");
  if (!sigHeader) {
    return new Response("Missing signature", { status: 400 });
  }

  const { t, te, li } = parseSignatureHeader(sigHeader);
  if (!t) {
    return new Response("Malformed signature", { status: 400 });
  }

  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  // Prefer the live signature when present, else the test signature.
  const provided = li && li.length > 0 ? li : te;
  if (!provided || !timingSafeEqual(expected, provided)) {
    return new Response("Invalid signature", { status: 400 });
  }

  // Signature valid — parse the event.
  let event: {
    id?: string;
    type?: string;
    data?: {
      id?: string;
      metadata?: Record<string, unknown>;
      attributes?: { metadata?: Record<string, unknown> };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Bad JSON but valid signature — ack to avoid retries.
    return new Response("ok", { status: 200 });
  }

  const isPaid =
    event.type === "payment_intent.succeeded" ||
    event.type === "checkout_session.payment.paid";

  if (isPaid && event.data) {
    // Metadata may live in either location depending on the event type.
    const metaA = event.data.attributes?.metadata;
    const metaB = event.data.metadata;

    // Subscription invoice id (Phase 4 plan upgrades) takes priority — it
    // routes to the billing activation path instead of the shop order path.
    const invoiceId =
      (typeof metaA?.invoice_id === "string"
        ? (metaA.invoice_id as string)
        : undefined) ??
      (typeof metaB?.invoice_id === "string"
        ? (metaB.invoice_id as string)
        : undefined);

    // Fall back to the payment intent id (event.data.id for payment_intent.*).
    const paymentIntentId =
      typeof event.data.id === "string" ? event.data.id : undefined;

    if (invoiceId) {
      // Plan upgrade/renewal: activate the subscription invoice.
      await ctx.runMutation(internal.billing.internalActivateInvoice, {
        invoiceId: invoiceId as Id<"subscriptionInvoices">,
        paymentIntentId,
      });
    } else {
      // Existing shop order flow.
      const orderNumber =
        (typeof metaA?.order_number === "string"
          ? (metaA.order_number as string)
          : undefined) ??
        (typeof metaB?.order_number === "string"
          ? (metaB.order_number as string)
          : undefined);

      await ctx.runMutation(internal.checkout.internalConfirmOrderPayment, {
        orderNumber,
        paymentIntentId,
        paymentStatus: "paid",
      });
    }
  }

  // Always 200 on a verified event.
  return new Response("ok", { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/webhooks/payrex",
  method: "POST",
  handler: payrexWebhook,
});

export default http;
