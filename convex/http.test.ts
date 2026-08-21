import { expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import {
  isWebhookTimestampFresh,
  WEBHOOK_TIMESTAMP_WINDOW_MS,
  verifyClerkWebhookSignature,
} from "./http";

const FIVE_MIN_MS = 5 * 60 * 1000;
const WEBHOOK_SECRET = "whsec_test_secret";

// Mirrors the handler's own HMAC computation so tests can produce a request
// PayRex would consider validly signed.
async function signPayrex(secret: string, t: string, rawBody: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function postSignedWebhook(
  t: ReturnType<typeof convexTest>,
  body: unknown,
  tSeconds: string
): Promise<Response> {
  const rawBody = JSON.stringify(body);
  const sig = await signPayrex(WEBHOOK_SECRET, tSeconds, rawBody);
  return t.fetch("/webhooks/payrex", {
    method: "POST",
    headers: { "Payrex-Signature": `t=${tSeconds},te=${sig}` },
    body: rawBody,
  });
}

test("isWebhookTimestampFresh accepts a timestamp exactly at the window boundary (past)", () => {
  const nowMs = 1_000_000_000_000;
  const tSeconds = String((nowMs - FIVE_MIN_MS) / 1000);
  expect(isWebhookTimestampFresh(tSeconds, nowMs, FIVE_MIN_MS)).toBe(true);
});

test("isWebhookTimestampFresh rejects a timestamp one second beyond the window (past)", () => {
  const nowMs = 1_000_000_000_000;
  const tSeconds = String((nowMs - FIVE_MIN_MS - 1000) / 1000);
  expect(isWebhookTimestampFresh(tSeconds, nowMs, FIVE_MIN_MS)).toBe(false);
});

test("isWebhookTimestampFresh accepts a timestamp exactly at the window boundary (future, clock skew)", () => {
  const nowMs = 1_000_000_000_000;
  const tSeconds = String((nowMs + FIVE_MIN_MS) / 1000);
  expect(isWebhookTimestampFresh(tSeconds, nowMs, FIVE_MIN_MS)).toBe(true);
});

test("isWebhookTimestampFresh rejects a timestamp one second beyond the window (future, clock skew)", () => {
  const nowMs = 1_000_000_000_000;
  const tSeconds = String((nowMs + FIVE_MIN_MS + 1000) / 1000);
  expect(isWebhookTimestampFresh(tSeconds, nowMs, FIVE_MIN_MS)).toBe(false);
});

test("isWebhookTimestampFresh accepts a timestamp that exactly matches now", () => {
  const nowMs = 1_000_000_000_000;
  expect(isWebhookTimestampFresh(String(nowMs / 1000), nowMs, FIVE_MIN_MS)).toBe(true);
});

test("isWebhookTimestampFresh rejects a non-numeric timestamp", () => {
  const nowMs = 1_000_000_000_000;
  expect(isWebhookTimestampFresh("not-a-number", nowMs, FIVE_MIN_MS)).toBe(false);
});

test("isWebhookTimestampFresh rejects an empty timestamp", () => {
  const nowMs = 1_000_000_000_000;
  expect(isWebhookTimestampFresh("", nowMs, FIVE_MIN_MS)).toBe(false);
});

test("payrex webhook handler rejects a validly signed request whose timestamp is outside the replay window", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const t = convexTest(schema);
  const staleSeconds = String(
    Math.floor((Date.now() - WEBHOOK_TIMESTAMP_WINDOW_MS - 60_000) / 1000)
  );

  const res = await postSignedWebhook(
    t,
    { id: "evt_stale", type: "some.unhandled.event", data: {} },
    staleSeconds
  );

  expect(res.status).toBe(400);
});

test("payrex webhook handler accepts a validly signed request within the replay window", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const t = convexTest(schema);
  const freshSeconds = String(Math.floor(Date.now() / 1000));

  const res = await postSignedWebhook(
    t,
    { id: "evt_fresh", type: "some.unhandled.event", data: {} },
    freshSeconds
  );

  expect(res.status).toBe(200);
});

test("payrex webhook handler acks unknown event types with 200 without dispatching a mutation", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const t = convexTest(schema);
  const freshSeconds = String(Math.floor(Date.now() / 1000));

  const res = await postSignedWebhook(
    t,
    { id: "evt_unknown", type: "customer.updated", data: { id: "cus_1" } },
    freshSeconds
  );

  expect(res.status).toBe(200);
});

test("payrex webhook handler returns 500 and logs only the event id/type (no payload) when the mutation dispatch throws", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const t = convexTest(schema);
  const freshSeconds = String(Math.floor(Date.now() / 1000));

  // A subscription-invoice metadata id that cannot resolve to a real
  // subscriptionInvoices document forces the internal mutation to throw
  // (Convex argument validation rejects a malformed id), simulating any
  // unexpected internal mutation failure.
  const res = await postSignedWebhook(
    t,
    {
      id: "evt_throws",
      type: "payment_intent.succeeded",
      data: {
        id: "pi_throws",
        metadata: { invoice_id: "not-a-real-subscription-invoice-id" },
      },
    },
    freshSeconds
  );

  expect(res.status).toBe(500);
  expect(errorSpy).toHaveBeenCalledTimes(1);
  const [, meta] = errorSpy.mock.calls[0];
  expect(meta).toMatchObject({ eventId: "evt_throws", eventType: "payment_intent.succeeded" });
  // No payload dump: the malformed id itself must never reach the log call.
  const loggedText = errorSpy.mock.calls[0].map((a) => JSON.stringify(a)).join(" ");
  expect(loggedText).not.toContain("not-a-real-subscription-invoice-id");

  errorSpy.mockRestore();
});

test("payrex webhook handler acks 200 but logs event context when the order can't be resolved (money captured, order missing/mismatched)", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const t = convexTest(schema);
  const freshSeconds = String(Math.floor(Date.now() / 1000));

  // A paid event whose order_number doesn't match any real order (deleted
  // order, or a metadata/order-number mismatch) and whose data.id also
  // doesn't match any order's paymentIntentId — internalConfirmOrderPayment
  // returns { success: false, reason: "order_not_found" } (a handled
  // result, not a thrown error), which the outer try/catch never sees.
  const res = await postSignedWebhook(
    t,
    {
      id: "evt_lost_payment",
      type: "checkout_session.payment.paid",
      data: {
        id: "cs_no_match",
        attributes: { metadata: { order_number: "TF-2026-DOESNOTEXIST" } },
      },
    },
    freshSeconds
  );

  // This is a permanent mismatch, not a transient failure — retrying the
  // same event for PayRex's full retry window won't fix it, so we still
  // ack 200 (no retry storm) but must not do so silently.
  expect(res.status).toBe(200);
  expect(errorSpy).toHaveBeenCalledTimes(1);
  const [, meta] = errorSpy.mock.calls[0];
  expect(meta).toMatchObject({
    eventId: "evt_lost_payment",
    eventType: "checkout_session.payment.paid",
    orderNumber: "TF-2026-DOESNOTEXIST",
    reason: "order_not_found",
  });
  // No payload dump, no PII: only ids/reason, nothing else from the event.
  const loggedText = errorSpy.mock.calls[0].map((a) => JSON.stringify(a)).join(" ");
  expect(loggedText).not.toContain("cs_no_match");

  errorSpy.mockRestore();
});

test("payrex webhook handler does not log when the order payment confirmation applies successfully", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const t = convexTest(schema);

  const productId = await t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Limited Card",
      slug: "limited-card-nolog",
      basePrice: 50000,
      sku: "LC-NOLOG-1",
      inventory: 5,
      lowStockThreshold: 1,
      trackInventory: true,
      isPublished: true,
      isFeatured: false,
      tags: [],
      images: [],
      primaryImageIndex: 0,
      shippingRequired: true,
    })
  );
  const orderNumber = "TF-2026-NOLOGOK";
  await t.run(async (ctx) =>
    ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      items: [
        { productId, productName: "Limited Card", quantity: 1, unitPrice: 50000, total: 50000 },
      ],
      subtotal: 50000,
      tax: 0,
      shipping: 0,
      total: 50000,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      guestEmail: "buyer@test.dev",
      shippingAddress: {
        fullName: "Buyer",
        addressLine1: "1 St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "0917",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );

  const freshSeconds = String(Math.floor(Date.now() / 1000));
  const res = await postSignedWebhook(
    t,
    {
      id: "evt_ok",
      type: "checkout_session.payment.paid",
      data: { id: "cs_ok", attributes: { metadata: { order_number: orderNumber } } },
    },
    freshSeconds
  );

  expect(res.status).toBe(200);
  expect(errorSpy).not.toHaveBeenCalled();

  errorSpy.mockRestore();
});

test("payrex webhook handler is idempotent: a PayRex retry of the same paid event only applies once", async () => {
  vi.stubEnv("PAYREX_WEBHOOK_SECRET", WEBHOOK_SECRET);
  const t = convexTest(schema);

  const productId = await t.run(async (ctx) =>
    ctx.db.insert("products", {
      name: "Limited Card",
      slug: "limited-card-http",
      basePrice: 50000,
      sku: "LC-HTTP-1",
      inventory: 5,
      lowStockThreshold: 1,
      trackInventory: true,
      isPublished: true,
      isFeatured: false,
      tags: [],
      images: [],
      primaryImageIndex: 0,
      shippingRequired: true,
    })
  );

  const orderNumber = "TF-2026-HTTPIDEMP";
  const orderId = await t.run(async (ctx) =>
    ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      items: [
        { productId, productName: "Limited Card", quantity: 2, unitPrice: 50000, total: 100000 },
      ],
      subtotal: 100000,
      tax: 0,
      shipping: 0,
      total: 100000,
      currency: "PHP",
      paymentProvider: "payrex",
      paymentStatus: "pending",
      guestEmail: "buyer@test.dev",
      shippingAddress: {
        fullName: "Buyer",
        addressLine1: "1 St",
        city: "Manila",
        postalCode: "1000",
        country: "PH",
        phone: "0917",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );

  const freshSeconds = String(Math.floor(Date.now() / 1000));
  // A single event, delivered twice with an identical body/signature — the
  // shape of a PayRex retry after our handler previously (incorrectly)
  // returned 200 for a failure, or after a genuine at-least-once redelivery.
  const event = {
    id: "evt_retry_1",
    type: "checkout_session.payment.paid",
    data: {
      id: "cs_retry_1",
      attributes: { metadata: { order_number: orderNumber } },
    },
  };

  const first = await postSignedWebhook(t, event, freshSeconds);
  expect(first.status).toBe(200);

  const second = await postSignedWebhook(t, event, freshSeconds);
  expect(second.status).toBe(200);

  const order = await t.run(async (ctx) => ctx.db.get(orderId));
  expect(order?.paymentStatus).toBe("paid");

  const product = await t.run(async (ctx) => ctx.db.get(productId));
  expect(product?.inventory).toBe(3); // decremented exactly once (5 - 2), not twice

  const scheduled = await t.run(async (ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(scheduled.length).toBe(1); // confirmation email scheduled exactly once
});

/**
 * Clerk webhook (POST /clerk-webhook) — Task 4's second fix. Verifies the
 * Svix signature (svix-id/svix-timestamp/svix-signature headers, HMAC-SHA256
 * per Svix's protocol: base64-decode the "whsec_"-prefixed secret, sign
 * `${id}.${timestamp}.${body}`, base64-encode the result, compare against
 * each space-separated "v1,<sig>" candidate in the header) and, on a
 * verified `user.deleted` event, erases the same Convex data
 * `deleteMyAccount` erases — closing the gap where an account deleted via
 * the Clerk dashboard/Backend API/hosted account portal orphaned its Convex
 * rows forever.
 */
const CLERK_WEBHOOK_SECRET = "whsec_dGVzdF9zaWduaW5nX3NlY3JldF9ieXRlcw=="; // base64("test_signing_secret_bytes")

// Mirrors the handler's own Svix HMAC computation so tests can produce a
// request Clerk would consider validly signed.
async function signClerkWebhook(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  rawBody: string
): Promise<string> {
  const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const binary = atob(secretB64);
  const secretBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) secretBytes[i] = binary.charCodeAt(i);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${svixId}.${svixTimestamp}.${rawBody}`)
  );
  const sigBytes = new Uint8Array(sig);
  let sigBinary = "";
  for (const b of sigBytes) sigBinary += String.fromCharCode(b);
  return btoa(sigBinary);
}

async function postClerkWebhook(
  t: ReturnType<typeof convexTest>,
  body: unknown,
  overrides?: {
    svixId?: string;
    svixTimestamp?: string;
    svixSignature?: string;
    skipHeaders?: string[];
  }
): Promise<Response> {
  const rawBody = JSON.stringify(body);
  const svixId = overrides?.svixId ?? "msg_test123";
  const svixTimestamp =
    overrides?.svixTimestamp ?? String(Math.floor(Date.now() / 1000));
  const svixSignature =
    overrides?.svixSignature ??
    `v1,${await signClerkWebhook(CLERK_WEBHOOK_SECRET, svixId, svixTimestamp, rawBody)}`;

  const headers: Record<string, string> = {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  };
  for (const skip of overrides?.skipHeaders ?? []) {
    delete headers[skip];
  }

  return t.fetch("/clerk-webhook", { method: "POST", headers, body: rawBody });
}

test("verifyClerkWebhookSignature accepts a correctly signed payload", async () => {
  const svixId = "msg_abc";
  const svixTimestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ type: "user.deleted", data: { id: "user_1" } });
  const sig = await signClerkWebhook(CLERK_WEBHOOK_SECRET, svixId, svixTimestamp, rawBody);

  const valid = await verifyClerkWebhookSignature(
    CLERK_WEBHOOK_SECRET,
    svixId,
    svixTimestamp,
    `v1,${sig}`,
    rawBody
  );
  expect(valid).toBe(true);
});

test("verifyClerkWebhookSignature accepts a match among multiple space-separated signature versions", async () => {
  const svixId = "msg_multi";
  const svixTimestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ type: "user.deleted", data: { id: "user_1" } });
  const sig = await signClerkWebhook(CLERK_WEBHOOK_SECRET, svixId, svixTimestamp, rawBody);

  const valid = await verifyClerkWebhookSignature(
    CLERK_WEBHOOK_SECRET,
    svixId,
    svixTimestamp,
    `v1,not-a-real-signature v1,${sig}`,
    rawBody
  );
  expect(valid).toBe(true);
});

test("verifyClerkWebhookSignature rejects a signature produced with the wrong secret", async () => {
  const svixId = "msg_wrong_secret";
  const svixTimestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ type: "user.deleted", data: { id: "user_1" } });
  const sig = await signClerkWebhook("whsec_d29uZ19zZWNyZXRfYnl0ZXM=", svixId, svixTimestamp, rawBody);

  const valid = await verifyClerkWebhookSignature(
    CLERK_WEBHOOK_SECRET,
    svixId,
    svixTimestamp,
    `v1,${sig}`,
    rawBody
  );
  expect(valid).toBe(false);
});

test("verifyClerkWebhookSignature rejects when the body was tampered with after signing", async () => {
  const svixId = "msg_tampered";
  const svixTimestamp = String(Math.floor(Date.now() / 1000));
  const originalBody = JSON.stringify({ type: "user.deleted", data: { id: "user_1" } });
  const sig = await signClerkWebhook(CLERK_WEBHOOK_SECRET, svixId, svixTimestamp, originalBody);

  const tamperedBody = JSON.stringify({ type: "user.deleted", data: { id: "user_2" } });
  const valid = await verifyClerkWebhookSignature(
    CLERK_WEBHOOK_SECRET,
    svixId,
    svixTimestamp,
    `v1,${sig}`,
    tamperedBody
  );
  expect(valid).toBe(false);
});

test("verifyClerkWebhookSignature returns false (not a throw) for a malformed secret", async () => {
  const valid = await verifyClerkWebhookSignature(
    "not-base64-!!!",
    "msg_1",
    String(Math.floor(Date.now() / 1000)),
    "v1,anything",
    "{}"
  );
  expect(valid).toBe(false);
});

test("clerk webhook route returns 500 and logs, without processing the event, when CLERK_WEBHOOK_SIGNING_SECRET is unset", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "still_here@test.dev",
      clerkId: "unconfigured_secret_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  const res = await postClerkWebhook(t, {
    type: "user.deleted",
    data: { id: "unconfigured_secret_user" },
  });

  expect(res.status).toBe(500);
  expect(errorSpy).toHaveBeenCalled();
  // Fail closed: the row must be untouched, not just "response says 500".
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user).not.toBeNull();

  errorSpy.mockRestore();
});

test("clerk webhook route returns 400 when svix headers are missing", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", CLERK_WEBHOOK_SECRET);
  const t = convexTest(schema);

  const res = await postClerkWebhook(
    t,
    { type: "user.deleted", data: { id: "some_user" } },
    { skipHeaders: ["svix-signature"] }
  );

  expect(res.status).toBe(400);
});

test("clerk webhook route returns 400 for an invalid signature", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", CLERK_WEBHOOK_SECRET);
  const t = convexTest(schema);

  const res = await postClerkWebhook(
    t,
    { type: "user.deleted", data: { id: "some_user" } },
    { svixSignature: "v1,not-a-valid-signature" }
  );

  expect(res.status).toBe(400);
});

test("clerk webhook route returns 400 for a validly signed but stale (replayed) timestamp", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", CLERK_WEBHOOK_SECRET);
  const t = convexTest(schema);
  const staleSeconds = String(
    Math.floor((Date.now() - WEBHOOK_TIMESTAMP_WINDOW_MS - 60_000) / 1000)
  );

  const res = await postClerkWebhook(
    t,
    { type: "user.deleted", data: { id: "some_user" } },
    { svixTimestamp: staleSeconds }
  );

  expect(res.status).toBe(400);
});

test("clerk webhook route acks unknown event types with 200 without erasing any data", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", CLERK_WEBHOOK_SECRET);
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "untouched@test.dev",
      clerkId: "unknown_event_user",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  const res = await postClerkWebhook(t, {
    type: "user.updated",
    data: { id: "unknown_event_user" },
  });

  expect(res.status).toBe(200);
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user).not.toBeNull();
});

test("clerk webhook route erases the matching user's Convex data on a verified user.deleted event", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", CLERK_WEBHOOK_SECRET);
  const t = convexTest(schema);
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: "deleted_elsewhere@test.dev",
      clerkId: "deleted_via_dashboard",
      role: "agent",
      subscriptionStatus: "active",
      plan: "free",
    })
  );

  const res = await postClerkWebhook(t, {
    type: "user.deleted",
    data: { id: "deleted_via_dashboard" },
  });

  expect(res.status).toBe(200);
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user).toBeNull();
});

test("clerk webhook route is idempotent: a user.deleted event with no matching Convex row acks 200 without throwing", async () => {
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", CLERK_WEBHOOK_SECRET);
  const t = convexTest(schema);

  const res = await postClerkWebhook(t, {
    type: "user.deleted",
    data: { id: "never_synced_to_convex" },
  });

  expect(res.status).toBe(200);
});
