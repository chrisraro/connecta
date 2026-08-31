import { expect, test } from "vitest";
import { buildHealthReport, type ConfigPresence } from "./health-report";

const ALL_PRESENT: ConfigPresence = {
  PAYREX_SECRET_KEY: true,
  PAYREX_WEBHOOK_SECRET: true,
  RESEND_API_KEY: true,
  CLERK_SECRET_KEY: true,
  CLERK_WEBHOOK_SIGNING_SECRET: true,
  NEXT_PUBLIC_APP_URL: true,
};

const ALL_ENV = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  NEXT_PUBLIC_APP_URL: "https://connecta.example",
  NEXT_PUBLIC_CONVEX_URL: "https://nautical-tortoise-962.convex.cloud",
};

test("reports healthy (200) when Convex is reachable and every var is set", async () => {
  const report = await buildHealthReport({
    env: ALL_ENV,
    queryConvex: async () => ({ reachable: true, payments: ALL_PRESENT }),
  });

  expect(report.status).toBe(200);
  expect(report.body.status).toBe("healthy");
  expect(report.body.convex).toBe(true);
});

test("reports unhealthy (503) when Convex is unreachable, without leaking why", async () => {
  const report = await buildHealthReport({
    env: ALL_ENV,
    queryConvex: async () => ({ reachable: false, payments: null }),
  });

  expect(report.status).toBe(503);
  expect(report.body.status).toBe("unhealthy");
  expect(report.body.convex).toBe(false);
  expect(report.body.payments).toBeNull();
  // No error/stack/message field of any kind on the response body.
  expect(JSON.stringify(report.body)).not.toMatch(/error|stack|message/i);
});

test("reports degraded (still 200) when Convex is up but a web env var is missing", async () => {
  const report = await buildHealthReport({
    env: { ...ALL_ENV, NEXT_PUBLIC_APP_URL: "" },
    queryConvex: async () => ({ reachable: true, payments: ALL_PRESENT }),
  });

  expect(report.status).toBe(200);
  expect(report.body.status).toBe("degraded");
  expect(report.body.env.NEXT_PUBLIC_APP_URL).toBe(false);
});

test("reports degraded (still 200) when Convex is up but a payments secret is missing", async () => {
  const report = await buildHealthReport({
    env: ALL_ENV,
    queryConvex: async () => ({
      reachable: true,
      payments: { ...ALL_PRESENT, PAYREX_SECRET_KEY: false },
    }),
  });

  expect(report.status).toBe(200);
  expect(report.body.status).toBe("degraded");
  expect(report.body.payments?.PAYREX_SECRET_KEY).toBe(false);
});

test("web env presence booleans reflect exactly which of the three required vars are set", async () => {
  const report = await buildHealthReport({
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_CONVEX_URL: "   ",
    },
    queryConvex: async () => ({ reachable: true, payments: ALL_PRESENT }),
  });

  expect(report.body.env).toEqual({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: true,
    NEXT_PUBLIC_APP_URL: false,
    NEXT_PUBLIC_CONVEX_URL: false,
  });
});

test("response body never contains an env var's actual value, only booleans", async () => {
  const env = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_realvalue123",
    NEXT_PUBLIC_APP_URL: "https://real-secret-host.example.com",
    NEXT_PUBLIC_CONVEX_URL: "https://real-deployment.convex.cloud",
  };

  const report = await buildHealthReport({
    env,
    queryConvex: async () => ({ reachable: true, payments: ALL_PRESENT }),
  });

  const serialized = JSON.stringify(report.body);
  for (const value of Object.values(env)) {
    expect(serialized).not.toContain(value);
  }
});
