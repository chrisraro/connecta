import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Convex HTTP actions.
 *
 * This file also hosted a payment-gateway webhook until payments were
 * removed entirely — the shop now routes purchases to an inquiry rather
 * than a checkout, so there is no gateway to receive callbacks from. The
 * Clerk webhook below is the only remaining route.
 *
 * Convex runtime has no node:crypto, so signature verification uses Web
 * Crypto (crypto.subtle).
 */

// How long a webhook timestamp is considered fresh, in either direction
// (accounts for clock skew as well as delivery delay). Svix signs each
// request with a unix-seconds timestamp; without a freshness check a
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
 * Web Crypto.
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
  // valid — signature validity alone does not prevent replay.
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
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhook,
});

export default http;
