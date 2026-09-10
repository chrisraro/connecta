import { expect, test } from "vitest";
import { buildHealthReport } from "./health-report";

// Everything present, including the server-only secrets. Config presence is
// read straight from env now: Convex ran in its own runtime with its own
// environment, so presence had to be asked of it over the wire. All server
// code runs in this process, so there is nothing to ask.
const ALL_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  NEXT_PUBLIC_APP_URL: "https://connecta.example",
  RESEND_API_KEY: "re_test",
  SUPABASE_SERVICE_ROLE_KEY: "service_role_test",
};

test("reports healthy (200) when the database is reachable and every var is set", async () => {
  const report = await buildHealthReport({
    env: ALL_ENV,
    pingDatabase: async () => ({ reachable: true }),
  });

  expect(report.status).toBe(200);
  expect(report.body.status).toBe("healthy");
  expect(report.body.database).toBe(true);
});

test("reports unhealthy (503) when the database is unreachable, without leaking why", async () => {
  const report = await buildHealthReport({
    env: ALL_ENV,
    pingDatabase: async () => ({ reachable: false }),
  });

  expect(report.status).toBe(503);
  expect(report.body.status).toBe("unhealthy");
  expect(report.body.database).toBe(false);
  // This endpoint is public and unauthenticated: no error text, stack, or
  // internal message may ever reach the body.
  expect(JSON.stringify(report.body)).not.toMatch(/error|stack|message/i);
});

test("reports degraded (still 200) when the database is up but a web env var is missing", async () => {
  const report = await buildHealthReport({
    env: { ...ALL_ENV, NEXT_PUBLIC_APP_URL: "" },
    pingDatabase: async () => ({ reachable: true }),
  });

  expect(report.status).toBe(200);
  expect(report.body.status).toBe("degraded");
  expect(report.body.env.NEXT_PUBLIC_APP_URL).toBe(false);
});

test("reports degraded (still 200) when a server-only secret is missing", async () => {
  const report = await buildHealthReport({
    env: { ...ALL_ENV, RESEND_API_KEY: "" },
    pingDatabase: async () => ({ reachable: true }),
  });

  expect(report.status).toBe(200);
  expect(report.body.status).toBe("degraded");
  expect(report.body.config.RESEND_API_KEY).toBe(false);
});

// A whitespace-only value is a missing value: it is what an env var set to an
// empty string in a dashboard actually looks like.
test("treats a whitespace-only value as absent", async () => {
  const report = await buildHealthReport({
    env: { ...ALL_ENV, SUPABASE_SERVICE_ROLE_KEY: "   " },
    pingDatabase: async () => ({ reachable: true }),
  });

  expect(report.body.config.SUPABASE_SERVICE_ROLE_KEY).toBe(false);
  expect(report.body.status).toBe("degraded");
});

// Every field is a boolean. Nothing may carry a secret value, its length, or
// its prefix.
test("never emits a secret value, only booleans", async () => {
  const report = await buildHealthReport({
    env: ALL_ENV,
    pingDatabase: async () => ({ reachable: true }),
  });

  const serialized = JSON.stringify(report.body);
  expect(serialized).not.toContain("service_role_test");
  expect(serialized).not.toContain("re_test");
  expect(serialized).not.toContain("sb_publishable_test");
});
