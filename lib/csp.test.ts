import { expect, test } from "vitest";
import nextConfig from "../next.config";

// Regression test for the 2026-08-20 production outage: Clerk's bot-protection
// widget (Cloudflare Turnstile, mounted into `#clerk-captcha`) never loaded on
// the production `/auth?mode=signup` page because the CSP in
// next.config.ts didn't allow challenges.cloudflare.com anywhere. The widget
// script was blocked by script-src, its iframe by frame-src, and its runtime
// calls by connect-src — Clerk showed "The CAPTCHA failed to load..." and
// every signup 400'd at POST /v1/client/sign_ups. Separately, the console
// also showed a blocked blob: worker creation (no worker-src directive means
// worker-src falls back to script-src, which does not include blob:),
// degrading Clerk's session web workers.
async function getCsp(): Promise<string> {
  if (typeof nextConfig.headers !== "function") {
    throw new Error("next.config.ts must export an async headers() function");
  }
  const headerGroups = await nextConfig.headers();
  const rootGroup = headerGroups.find((group) => group.source === "/:path*");
  const cspHeader = rootGroup?.headers.find((header) => header.key === "Content-Security-Policy");
  if (!cspHeader) {
    throw new Error("no Content-Security-Policy header found in next.config.ts headers()");
  }
  return cspHeader.value;
}

test("CSP script-src allows Cloudflare Turnstile so Clerk's CAPTCHA script can load", async () => {
  const csp = await getCsp();
  const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
  expect(scriptSrc).toBeDefined();
  expect(scriptSrc).toContain("https://challenges.cloudflare.com");
});

test("CSP frame-src allows Cloudflare Turnstile so the CAPTCHA iframe can render", async () => {
  const csp = await getCsp();
  const frameSrc = csp.split(";").find((d) => d.trim().startsWith("frame-src"));
  expect(frameSrc).toBeDefined();
  expect(frameSrc).toContain("https://challenges.cloudflare.com");
});

test("CSP connect-src allows Cloudflare Turnstile so the widget's runtime calls succeed", async () => {
  const csp = await getCsp();
  const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src"));
  expect(connectSrc).toBeDefined();
  expect(connectSrc).toContain("https://challenges.cloudflare.com");
});

test("CSP declares a worker-src directive permitting self and blob: workers", async () => {
  const csp = await getCsp();
  const workerSrc = csp.split(";").find((d) => d.trim().startsWith("worker-src"));
  expect(workerSrc).toBeDefined();
  expect(workerSrc?.trim()).toBe("worker-src 'self' blob:");
});
