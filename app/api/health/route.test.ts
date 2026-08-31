import { afterEach, expect, test, vi } from "vitest";

// Mock the Convex HTTP client so this test never makes a real network call.
// `queryImpl` is reassigned per-test to drive the reachable/unreachable
// branches through route.ts's actual wiring (queryConvex -> ConvexHttpClient).
let queryImpl: (name: unknown) => unknown = () => {
  throw new Error("queryImpl not configured for this test");
};

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query(name: unknown) {
      return queryImpl(name);
    }
  },
}));

vi.mock("@/convex/_generated/api", () => ({
  api: { health: { ping: "health:ping", checkConfig: "health:checkConfig" } },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  queryImpl = () => {
    throw new Error("queryImpl not configured for this test");
  };
});

const ALL_PRESENT = {
  PAYREX_SECRET_KEY: true,
  PAYREX_WEBHOOK_SECRET: true,
  RESEND_API_KEY: true,
  CLERK_SECRET_KEY: true,
  CLERK_WEBHOOK_SIGNING_SECRET: true,
  NEXT_PUBLIC_APP_URL: true,
};

function stubHealthyEnv() {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_abc");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://connecta.example");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://nautical-tortoise-962.convex.cloud");
}

test("GET /api/health returns 200, no-store, and healthy status when everything is configured", async () => {
  stubHealthyEnv();
  queryImpl = (name) =>
    name === "health:ping" ? { ok: true } : ALL_PRESENT;

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(body).toEqual({
    status: "healthy",
    convex: true,
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: true,
      NEXT_PUBLIC_APP_URL: true,
      NEXT_PUBLIC_CONVEX_URL: true,
    },
    payments: ALL_PRESENT,
  });
});

test("GET /api/health returns 503 and no internal error detail when Convex is unreachable", async () => {
  stubHealthyEnv();
  queryImpl = () => {
    throw new Error("ECONNREFUSED 127.0.0.1:9999 (internal detail that must not leak)");
  };

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();
  const raw = await (await GET()).text();

  expect(res.status).toBe(503);
  expect(body.status).toBe("unhealthy");
  expect(body.convex).toBe(false);
  expect(body.payments).toBeNull();
  expect(raw).not.toContain("ECONNREFUSED");
  expect(raw).not.toContain("internal detail");
});

test("GET /api/health returns 503 when NEXT_PUBLIC_CONVEX_URL itself is unset", async () => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_abc");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://connecta.example");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  expect(res.status).toBe(503);
  expect(body.convex).toBe(false);
});
