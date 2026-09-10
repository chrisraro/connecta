import { afterEach, expect, test, vi } from "vitest";

/**
 * Route-level wiring test for GET /api/health.
 *
 * The Supabase server client is mocked so this never opens a socket. What is
 * exercised is route.ts's own wiring: env presence, the reachability probe,
 * and the status/headers it produces. The response-shape logic itself is
 * tested in health-report.test.ts.
 */
let selectImpl: () => { error: unknown } = () => ({ error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => selectImpl(),
    }),
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  selectImpl = () => ({ error: null });
});

function stubHealthyEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://connecta.example");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role_test");
}

test("returns 200, no-store, and healthy when everything is configured", async () => {
  stubHealthyEnv();

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(body.status).toBe("healthy");
  expect(body.database).toBe(true);
});

test("returns 503 and no internal detail when the database is unreachable", async () => {
  stubHealthyEnv();
  selectImpl = () => ({ error: { message: "connection refused at 10.0.0.5:5432" } });

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  expect(res.status).toBe(503);
  expect(body.status).toBe("unhealthy");
  expect(body.database).toBe(false);
  // Public endpoint: the underlying error must not reach the caller.
  expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  expect(JSON.stringify(body)).not.toMatch(/error|stack|message/i);
});

// Short-circuits before constructing a client. Without the guard this would
// throw rather than report, and an uptime monitor would see a 500 with a
// stack instead of a clean 503.
test("returns 503 when the Supabase URL itself is unset", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://connecta.example");

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  expect(res.status).toBe(503);
  expect(body.database).toBe(false);
});

test("stays 200 but degraded when a server-only secret is missing", async () => {
  stubHealthyEnv();
  vi.stubEnv("RESEND_API_KEY", "");

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.status).toBe("degraded");
  expect(body.config.RESEND_API_KEY).toBe(false);
});

test("never emits a secret value", async () => {
  stubHealthyEnv();

  const { GET } = await import("./route");
  const res = await GET();
  const body = await res.json();

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain("service_role_test");
  expect(serialized).not.toContain("re_test");
});
