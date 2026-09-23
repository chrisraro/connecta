import { afterEach, expect, test, vi } from "vitest";

// Regression tests for the CSP in next.config.ts.
//
// The failure these guard against is silent everywhere except a real browser:
// a backend origin missing from connect-src blocks every client-side data call,
// while server rendering, unit tests and curl all keep working. It happened
// once with Clerk's CAPTCHA (the 2026-08-20 production signup outage) and
// again in the Supabase migration, where the CSP still allowed only Convex and
// Clerk -- the app would have built, deployed, and been unable to read a row.
async function cspWith(supabaseUrl: string | undefined): Promise<string> {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
  const { default: nextConfig } = await import("../next.config");
  if (typeof nextConfig.headers !== "function") {
    throw new Error("next.config.ts must export an async headers() function");
  }
  const groups = await nextConfig.headers();
  const header = groups
    .find((g) => g.source === "/:path*")
    ?.headers.find((h) => h.key === "Content-Security-Policy");
  if (!header) throw new Error("no Content-Security-Policy header in next.config.ts");
  return header.value;
}

function directive(csp: string, name: string) {
  return csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

test("connect-src allows the project's Supabase origin over https and wss", async () => {
  const connect = directive(await cspWith("https://abcdefgh.supabase.co"), "connect-src");
  expect(connect).toContain("https://abcdefgh.supabase.co");
  // Realtime is a websocket; https alone would still block it.
  expect(connect).toContain("wss://abcdefgh.supabase.co");
});

test("connect-src falls back to every Supabase project when the URL is unset", async () => {
  const connect = directive(await cspWith(undefined), "connect-src");
  expect(connect).toContain("https://*.supabase.co");
});

test("connect-src no longer allows the retired Convex and Clerk backends", async () => {
  const csp = await cspWith("https://abcdefgh.supabase.co");
  expect(csp).not.toMatch(/convex|clerk/i);
});

test("CSP declares a worker-src directive permitting self and blob: workers", async () => {
  expect(directive(await cspWith(undefined), "worker-src")).toBe("worker-src 'self' blob:");
});
