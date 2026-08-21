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

// How long a webhook timestamp is considered fresh, in either direction
// (accounts for clock skew as well as delivery delay). PayRex signs each
// request with the unix-seconds timestamp `t`; without a freshness check a
// captured request+signature pair (e.g. from a proxy log or MITM) can be
// replayed against the endpoint indefinitely.
export const WEBHOOK_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

// Pure helper: is signature timestamp `t` (unix seconds, as a decimal
// string) within `windowMs` of `nowMs`? Exported and kept side-effect-free
// so the boundary conditions can be tested directly without going through
// signature verification or HTTP plumbing.
export function isWebhookTimestampFresh(
  t: string,
  nowMs: number,
  windowMs: number
): boolean {
  if (!/^\d+$/.test(t)) return false;
  const tMs = Number(t) * 1000;
  return Math.abs(nowMs - tMs) <= windowMs;
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

  // Reject stale or far-future timestamps even when the signature itself is
  // valid — otherwise a captured request+signature pair can be replayed
  // against the endpoint indefinitely.
  if (!isWebhookTimestampFresh(t, Date.now(), WEBHOOK_TIMESTAMP_WINDOW_MS)) {
    return new Response("Stale webhook timestamp", { status: 400 });
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
  const isFailed =
    event.type === "payment_intent.payment_failed" ||
    event.type === "checkout_session.expire" ||
    event.type === "checkout_session.payment.failed";

  if ((isPaid || isFailed) && event.data) {
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

    // Wrapped so a thrown error from the internal mutation (an unexpected
    // failure, not a normal business-rule rejection — those already return
    // a handled `{ success: false, reason }` and leave the order in a
    // correct terminal state) turns into a 500 instead of silently
    // acking with 200. A 500 makes PayRex retry the delivery instead of
    // treating a captured-and-lost payment confirmation as delivered.
    // The processed-event idempotency guard in internalConfirmOrderPayment
    // (and the analogous checks in the billing mutations) makes that retry
    // safe: a retried event that already applied is a no-op.
    try {
      if (invoiceId) {
        if (isPaid) {
          await ctx.runMutation(internal.billing.internalActivateInvoice, {
            invoiceId: invoiceId as Id<"subscriptionInvoices">,
            paymentIntentId,
          });
        } else {
          await ctx.runMutation(internal.billing.internalFailInvoice, {
            invoiceId: invoiceId as Id<"subscriptionInvoices">,
          });
        }
      } else {
        // Existing shop order flow.
        const orderNumber =
          (typeof metaA?.order_number === "string"
            ? (metaA.order_number as string)
            : undefined) ??
          (typeof metaB?.order_number === "string"
            ? (metaB.order_number as string)
            : undefined);

        const result = await ctx.runMutation(
          internal.checkout.internalConfirmOrderPayment,
          {
            orderNumber,
            paymentIntentId,
            paymentStatus: isPaid ? "paid" : "failed",
          }
        );

        if (!result.success) {
          // A handled business-rule rejection (order not found, insufficient
          // stock, discount limit reached) — not a thrown error, so the
          // try/catch below never sees it. Without this, the ack below still
          // returns 200 and the failure is completely invisible. For
          // "order_not_found" specifically this is the closest thing to a
          // genuinely lost payment: PayRex captured money for an order
          // number that never existed, was deleted, or doesn't match — a
          // permanent mismatch, not a transient one, so retrying the same
          // event for PayRex's full retry window wouldn't fix it. We still
          // ack 200 (no retry storm for a mismatch that will never resolve
          // itself) but log once so it can be triaged. No payload dump, no
          // PII — only the ids/reason needed to correlate against PayRex's
          // dashboard and this app's orders table.
          console.error("payrex webhook: order payment confirmation did not apply", {
            eventId: event.id ?? "unknown",
            eventType: event.type ?? "unknown",
            orderNumber: orderNumber ?? "unknown",
            reason: result.reason,
          });
        }
      }
    } catch {
      // No payload dump, no PII — only the event id/type identify which
      // delivery failed so this can be correlated with PayRex's dashboard.
      console.error("payrex webhook: mutation dispatch failed", {
        eventId: event.id ?? "unknown",
        eventType: event.type ?? "unknown",
      });
      return new Response("Webhook processing failed", { status: 500 });
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
