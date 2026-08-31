#!/usr/bin/env node
// Generates the PNG mockups committed under marketing/mockups/.
//
// Playwright is deliberately NOT a package.json dependency — this branch's
// remit forbids touching that file. Install it locally first:
//
//   npm install --no-save playwright
//
// Then, with the dev server already running on port 3000:
//
//   node marketing/generate-mockups.mjs
//
// Re-runnable and idempotent: every capture overwrites its own file, and the
// Clerk demo user it signs in as (for the two authenticated captures) is
// looked up before it's created. See marketing/README.md for the full
// breakdown of what each capture is and why.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(__dirname, "mockups");
const BASE_URL = process.env.CONNECTA_MOCKUP_BASE_URL || "http://localhost:3000";
const DEVICE_SCALE_FACTOR = 2;

// The cached Chromium this repo's tooling already uses elsewhere, so this
// script doesn't trigger a fresh ~150MB browser download on a machine that
// already has one. Falls back to Playwright's own managed browser (whatever
// `npx playwright install chromium` last put in the default cache dir) if
// that exact build isn't present.
const PINNED_CHROMIUM =
  "C:/Users/raroc/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

function loadDotEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function launchOptions() {
  if (existsSync(PINNED_CHROMIUM)) {
    return { executablePath: PINNED_CHROMIUM };
  }
  console.warn(
    `  (pinned Chromium not found at ${PINNED_CHROMIUM} — falling back to Playwright's default managed browser)`
  );
  return {};
}

async function capture(label, fn) {
  process.stdout.write(`- ${label} ... `);
  try {
    const result = await fn();
    console.log(`ok${result ? ` (${result})` : ""}`);
    return true;
  } catch (err) {
    console.log("FAILED");
    console.error(`  ${err?.message || err}`);
    return false;
  }
}

function describePng(filePath) {
  const { size } = statSync(filePath);
  return `${(size / 1024).toFixed(0)} KB`;
}

// ─── Clerk Backend API — demo user + sign-in ticket ───────────────────────
// Same "sign-in token" ticket flow Clerk's own @clerk/testing package uses
// under the hood: mint a one-time token server-side, then hand it to the
// already-loaded client-side Clerk instance to create a session without a
// password prompt. Never touches a real customer account.

const DEMO_USER_EMAIL = "connecta-marketing-demo@connecta.example";
const DEMO_USER_PASSWORD = "Connecta-Marketing-Demo-2026!";

async function clerkApi(secretKey, method, endpoint, body) {
  const res = await fetch(`https://api.clerk.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Clerk API ${method} ${endpoint} -> ${res.status}: ${JSON.stringify(json)}`
    );
  }
  return json;
}

async function getOrCreateDemoUser(secretKey) {
  const query = new URLSearchParams();
  query.append("email_address", DEMO_USER_EMAIL);
  const existing = await clerkApi(secretKey, "GET", `/users?${query.toString()}`);
  if (Array.isArray(existing) && existing.length > 0) return existing[0].id;

  const created = await clerkApi(secretKey, "POST", "/users", {
    email_address: [DEMO_USER_EMAIL],
    password: DEMO_USER_PASSWORD,
    first_name: "Connecta",
    last_name: "Demo",
  });
  return created.id;
}

async function mintSignInTicket(secretKey, userId) {
  const token = await clerkApi(secretKey, "POST", "/sign_in_tokens", {
    user_id: userId,
    expires_in_seconds: 3600,
  });
  return token.token;
}

async function signInWithTicket(page, ticket) {
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.Clerk?.loaded), { timeout: 20000 });
  const status = await page.evaluate(async (t) => {
    const signIn = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (signIn.status === "complete") {
      await window.Clerk.setActive({ session: signIn.createdSessionId });
      return "complete";
    }
    return signIn.status;
  }, ticket);
  if (status !== "complete") throw new Error(`Clerk sign-in did not complete (status: ${status})`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const env = loadDotEnvLocal();
  const results = [];

  const browser = await chromium.launch(launchOptions());

  // ── 1. Landing hero ──────────────────────────────────────────────────
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });
    results.push(
      await capture("Landing hero (hero.png)", async () => {
        await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
        // Let the staggered word-rise + phone tilt idle animation settle.
        await page.waitForTimeout(900);
        const hero = page.locator("section").first();
        const filePath = path.join(OUT_DIR, "hero.png");
        await hero.screenshot({ path: filePath });
        return describePng(filePath);
      })
    );
    await page.close();
  }

  // ── 2. Public profile page, one per template, at phone width ────────
  for (const templateId of ["editorial", "kinetic", "architectural"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });
    results.push(
      await capture(`Profile — ${templateId} (profile-${templateId}.png)`, async () => {
        await page.goto(`${BASE_URL}/marketing-preview/${templateId}`, {
          waitUntil: "networkidle",
        });
        await page.waitForTimeout(300);
        const filePath = path.join(OUT_DIR, `profile-${templateId}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        return describePng(filePath);
      })
    );
    await page.close();
  }

  // ── 3. Dashboard + profile builder with inspector open (authenticated) ─
  const secretKey = env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.log(
      "- Dashboard / builder captures ... SKIPPED (no CLERK_SECRET_KEY in .env.local)"
    );
  } else {
    let ticket;
    try {
      const userId = await getOrCreateDemoUser(secretKey);
      ticket = await mintSignInTicket(secretKey, userId);
    } catch (err) {
      console.log("- Dashboard / builder captures ... SKIPPED (Clerk setup failed)");
      console.error(`  ${err?.message || err}`);
    }

    if (ticket) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 960 },
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      });

      const signedIn = await capture("Sign in as demo user", async () => {
        await signInWithTicket(page, ticket);
      });
      results.push(signedIn);

      if (signedIn) {
        // Fill in the demo persona's identity via the builder itself so the
        // dashboard/builder captures show real-looking content rather than
        // an empty new-profile shell. Same persona as the landing hero and
        // the /marketing-preview templates (components/marketing/demoProfile.ts).
        results.push(await capture("Profile builder with inspector open (builder-inspector.png)", async () => {
          await page.goto(BASE_URL + "/dashboard/builder", { waitUntil: "networkidle" });
          // Exact match: the template-selector cards ("Editorial", ...) are
          // also unlabeled <button>s whose accessible name would otherwise
          // substring-match "Edit".
          await page.getByRole("button", { name: "Edit", exact: true }).first().click();
          const dialog = page.getByRole("dialog");
          await dialog.getByPlaceholder("John Doe").fill("Nicole Bautista");
          await dialog.getByPlaceholder("Software Engineer").fill("Interior Designer & Creative Director");
          await dialog.getByPlaceholder("Company Name").fill("Nicole Bautista Design Co.");
          await dialog.getByPlaceholder("+1 234 567 890").fill("+63 917 555 0142");
          await dialog.getByPlaceholder("john@example.com").fill("hello@nicolebautistadesign.ph");
          await page.waitForTimeout(200);
          const filePath = path.join(OUT_DIR, "builder-inspector.png");
          await page.screenshot({ path: filePath, fullPage: true });

          // Persist so the dashboard capture right after shows a non-empty
          // account instead of the zero-profiles empty state. Exact match:
          // the live "Digital Card Preview" also renders its own "Save
          // Contact" button, which otherwise substring-matches "Save".
          await page.getByRole("button", { name: "Save", exact: true }).click();
          await page.waitForTimeout(800);
          return describePng(filePath);
        }));

        results.push(await capture("Dashboard (dashboard.png)", async () => {
          await page.goto(BASE_URL + "/dashboard", { waitUntil: "networkidle" });
          await page.waitForTimeout(500);
          const filePath = path.join(OUT_DIR, "dashboard.png");
          await page.screenshot({ path: filePath, fullPage: true });
          return describePng(filePath);
        }));
      }

      await page.close();
    }
  }

  await browser.close();

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} captures succeeded.`);
  if (failed > 0) process.exitCode = 1;
}

main();
