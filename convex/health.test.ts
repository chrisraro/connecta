import { expect, test, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const CONFIG_KEYS = [
  "RESEND_API_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

test("ping is reachable without authentication and touches no table", async () => {
  const t = convexTest(schema);
  const result = await t.query(api.health.ping, {});
  expect(result).toEqual({ ok: true });
});

test("checkConfig reports true for every configured secret and false for every unset one", async () => {
  for (const key of CONFIG_KEYS) {
    vi.stubEnv(key, "");
  }
  vi.stubEnv("CLERK_SECRET_KEY", "sk_clerk_super_secret_value");

  const t = convexTest(schema);
  const result = await t.query(api.health.checkConfig, {});

  expect(result).toEqual({
    RESEND_API_KEY: false,
    CLERK_SECRET_KEY: true,
    CLERK_WEBHOOK_SIGNING_SECRET: false,
    NEXT_PUBLIC_APP_URL: false,
  });
});

test("checkConfig never returns anything but booleans, even for a whitespace-only value", async () => {
  for (const key of CONFIG_KEYS) {
    vi.stubEnv(key, "   ");
  }

  const t = convexTest(schema);
  const result = await t.query(api.health.checkConfig, {});

  for (const key of CONFIG_KEYS) {
    expect(result[key]).toBe(false);
  }
  // Guard against a regression that leaks the raw value instead of a boolean.
  for (const value of Object.values(result)) {
    expect(typeof value).toBe("boolean");
  }
});

test("checkConfig response never contains a secret's actual value as a substring", async () => {
  const secretValues = {
    RESEND_API_KEY: "re_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    CLERK_SECRET_KEY: "sk_clerk_DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    CLERK_WEBHOOK_SIGNING_SECRET: "whsec_EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
    NEXT_PUBLIC_APP_URL: "https://secret-staging-host.example.com",
  };
  for (const [key, value] of Object.entries(secretValues)) {
    vi.stubEnv(key, value);
  }

  const t = convexTest(schema);
  const result = await t.query(api.health.checkConfig, {});
  const serialized = JSON.stringify(result);

  for (const value of Object.values(secretValues)) {
    expect(serialized).not.toContain(value);
  }
});
