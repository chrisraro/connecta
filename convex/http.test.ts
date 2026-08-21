import { expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { isWebhookTimestampFresh, WEBHOOK_TIMESTAMP_WINDOW_MS } from "./http";

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
