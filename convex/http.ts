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
    ["sign"],
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
export function isWebhookTimestampFresh(t: string, nowMs: number, windowMs: number): boolean {
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
    event.type === "payment_intent.succeeded" || event.type === "checkout_session.payment.paid";
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
      (typeof metaA?.invoice_id === "string" ? (metaA.invoice_id as string) : undefined) ??
      (typeof metaB?.invoice_id === "string" ? (metaB.invoice_id as string) : undefined);

    // Fall back to the payment intent id (event.data.id for payment_intent.*).
    const paymentIntentId = typeof event.data.id === "string" ? event.data.id : undefined;

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
          (typeof metaA?.order_number === "string" ? (metaA.order_number as string) : undefined) ??
          (typeof metaB?.order_number === "string" ? (metaB.order_number as string) : undefined);

        const result = await ctx.runMutation(internal.checkout.internalConfirmOrderPayment, {
          orderNumber,
          paymentIntentId,
          paymentStatus: isPaid ? "paid" : "failed",
        });

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

/**
 * Clerk Webhook (Convex HTTP action)
 *
 * Public URL: https://<deployment>.convex.site/clerk-webhook
 *
 * Fixes the audit's "no Clerk webhook" finding: an account deleted any way
 * other than the app's own Settings button (Clerk dashboard, Backend API, or
 * the user's own Clerk-hosted account portal) previously orphaned its Convex
 * rows forever. On a verified `user.deleted` event, this calls the exact
 * same erasure mutation `deleteMyAccount` uses (see convex/users.ts —
 * `internalEraseUserByClerkId`), so there is one erasure code path, not two.
 *
 * Clerk delivers webhooks via Svix. Verification (per Svix's documented
 * protocol): the signing secret is `whsec_<base64>`; base64-decode the part
 * after the prefix to get the HMAC key; sign
 * `${svix-id}.${svix-timestamp}.${rawBody}` with HMAC-SHA256; base64-encode
 * the result; compare against each space-separated `v1,<signature>`
 * candidate in the `svix-signature` header. Deliberately NOT using the svix
 * npm package — this is a small, pure, directly-testable implementation on
 * Web Crypto, mirroring the PayRex webhook above rather than introducing a
 * second verification idiom.
 */

// Decode a base64 string to raw bytes.
function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Encode raw bytes as a base64 string.
function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Compute base64 HMAC-SHA256 of `message` keyed by raw `secretBytes`.
async function hmacSha256Base64(secretBytes: Uint8Array, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64Encode(new Uint8Array(sig));
}

/**
 * Pure, directly-testable Svix signature verification. Never throws — a
 * malformed secret or signature header is a verification failure (`false`),
 * not an exception, so the caller only has one branch to handle.
 */
export async function verifyClerkWebhookSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignatureHeader: string,
  rawBody: string,
): Promise<boolean> {
  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;

  let secretBytes: Uint8Array;
  try {
    secretBytes = base64Decode(secretB64);
  } catch {
    return false;
  }

  const expected = await hmacSha256Base64(secretBytes, `${svixId}.${svixTimestamp}.${rawBody}`);

  // The header can carry multiple space-separated "v<version>,<signature>"
  // candidates (e.g. during a Clerk secret rotation) — any match is valid.
  const candidates = svixSignatureHeader
    .split(" ")
    .map((part) => {
      const idx = part.indexOf(",");
      return idx === -1 ? part : part.slice(idx + 1);
    })
    .filter((sig) => sig.length > 0);

  return candidates.some((sig) => timingSafeEqual(expected, sig));
}

const clerkWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // Fail closed: log so this is visible in ops, and do not read the body
    // or process anything — never silently treat an unconfigured secret as
    // an open (unverified) endpoint.
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const rawBody = await request.text();

  const validSignature = await verifyClerkWebhookSignature(
    secret,
    svixId,
    svixTimestamp,
    svixSignature,
    rawBody,
  );
  if (!validSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  // Reject stale or far-future timestamps even when the signature itself is
  // valid — the same replay protection as the PayRex webhook above.
  if (!isWebhookTimestampFresh(svixTimestamp, Date.now(), WEBHOOK_TIMESTAMP_WINDOW_MS)) {
    return new Response("Stale webhook timestamp", { status: 400 });
  }

  let event: { type?: string; data?: { id?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Bad JSON but valid signature — ack to avoid retries.
    return new Response("ok", { status: 200 });
  }

  if (event.type === "user.deleted" && typeof event.data?.id === "string") {
    try {
      await ctx.runMutation(internal.users.internalEraseUserByClerkId, {
        clerkId: event.data.id,
      });
    } catch {
      // No payload dump, no PII — only the event type identifies which
      // delivery failed, for correlation with Clerk's dashboard.
      console.error("clerk webhook: user.deleted erasure dispatch failed", {
        eventType: event.type,
      });
      return new Response("Webhook processing failed", { status: 500 });
    }
  }

  // Every other event type (including a malformed user.deleted with no
  // usable id) is acknowledged without processing.
  return new Response("ok", { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/webhooks/payrex",
  method: "POST",
  handler: payrexWebhook,
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhook,
});

export default http;
