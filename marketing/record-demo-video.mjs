/**
 * Records a product demo video of Connecta, end to end, driving the real app.
 *
 *   node marketing/record-demo-video.mjs
 *
 * Prerequisites (same as generate-mockups.mjs):
 *   - dev server running on http://localhost:3000  (npm run dev)
 *   - npm install --no-save playwright             (kept out of package.json
 *     so a ~200MB browser dep isn't forced on every install)
 *   - CLERK_SECRET_KEY in .env.local               (for the demo sign-in)
 *
 * Output: marketing/video/connecta-demo.webm  (VP8, 1440x900, ~52s)
 *
 * FORMAT NOTE
 * -----------
 * Playwright only records webm, and the ffmpeg it bundles is a stripped build
 * with no h264 encoder and no mp4 muxer — it exists solely to encode
 * Playwright's own captures. webm plays in Chrome, Edge and Firefox, but
 * Safari support is patchy and several ad platforms require mp4. To convert,
 * use a full ffmpeg install:
 *
 *   ffmpeg -i marketing/video/connecta-demo.webm \
 *     -c:v libx264 -pix_fmt yuv420p -crf 23 -preset medium \
 *     -movflags +faststart marketing/video/connecta-demo.mp4
 *
 * WHY IT USES A DEMO PERSONA
 * --------------------------
 * The tap-to-profile flow is the product's core story, and the obvious way to
 * film it is to tap a real card. We deliberately don't: real cards resolve to
 * real customers' profiles, which carry their name, phone number and email.
 * Putting that in a marketing asset would leak PII. Everything filmed here is
 * either public marketing surface or the seeded demo account.
 *
 * Playwright records the whole context to webm; there is no way to cut or
 * splice, so the pacing below IS the edit. Waits are deliberate beats, not
 * arbitrary sleeps.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync, renameSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = process.env.CONNECTA_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(ROOT, "marketing", "video");
const RAW_DIR = join(OUT_DIR, ".raw");
const CHROME =
  process.env.CONNECTA_CHROME ??
  "C:/Users/raroc/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const VIEWPORT = { width: 1440, height: 900 };
const DEMO_USER_EMAIL = "connecta-marketing-demo@connecta.example";

const env = readFileSync(join(ROOT, ".env.local"), "utf8");
const CLERK_SECRET = env
  .match(/^CLERK_SECRET_KEY=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^"|"$/g, "");
if (!CLERK_SECRET) throw new Error("CLERK_SECRET_KEY not found in .env.local");

async function clerkApi(method, endpoint, body) {
  const res = await fetch(`https://api.clerk.com/v1${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Clerk ${method} ${endpoint} -> ${res.status}`);
  return json;
}

/** Smooth, human-looking scroll — a single jump reads as a cut, not a pan. */
async function glide(page, toY, ms = 2200) {
  await page.evaluate(
    ([target, duration]) =>
      new Promise((resolve) => {
        const start = window.scrollY;
        const delta = target - start;
        const t0 = performance.now();
        // easeInOutCubic: settles instead of stopping dead.
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        function step(now) {
          const t = Math.min(1, (now - t0) / duration);
          window.scrollTo(0, start + delta * ease(t));
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      }),
    [toY, ms],
  );
}

/** Types at a readable cadence — instant fill doesn't read as typing on video. */
async function typeSlowly(locator, text, delay = 90) {
  await locator.click();
  await locator.fill("");
  await locator.type(text, { delay });
}

const beat = (page, ms) => page.waitForTimeout(ms);

if (existsSync(RAW_DIR)) rmSync(RAW_DIR, { recursive: true, force: true });
mkdirSync(RAW_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 1, // video is raster; 2x here just bloats the file
  recordVideo: { dir: RAW_DIR, size: VIEWPORT },
  colorScheme: "dark",
});
const page = await context.newPage();

try {
  // ── 1. The pitch ────────────────────────────────────────────────────────
  console.log("scene 1: landing");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await beat(page, 3200); // let the headline reveal finish
  await glide(page, 780);
  await beat(page, 1800);
  await glide(page, 1700);
  await beat(page, 1600);
  await glide(page, 0, 1400);
  await beat(page, 900);

  // ── 2. What the person you just met sees ────────────────────────────────
  // Filmed at phone width, because that is where a tapped profile is opened.
  //
  // NOTE: this MUST reuse `page` rather than opening a second one. Playwright
  // records one video per Page, so a `context.newPage()` here would silently
  // land this scene in a separate .webm and leave dead air in the main one.
  console.log("scene 2: the profile, at phone width");
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto(`${BASE_URL}/marketing-preview/editorial`, { waitUntil: "networkidle" });
  await beat(page, 2600);
  await glide(page, 900, 2600);
  await beat(page, 1400);
  await glide(page, 1900, 2600);
  await beat(page, 1600);
  await page.setViewportSize(VIEWPORT);
  await beat(page, 800);

  // ── 3. Sign in as the demo account ──────────────────────────────────────
  console.log("scene 3: dashboard");
  const users = await clerkApi(
    "GET",
    `/users?email_address=${encodeURIComponent(DEMO_USER_EMAIL)}`,
  );
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error(
      `demo user ${DEMO_USER_EMAIL} not found — run marketing/generate-mockups.mjs first, it seeds the account`,
    );
  }
  const ticket = (
    await clerkApi("POST", "/sign_in_tokens", {
      user_id: users[0].id,
      expires_in_seconds: 3600,
    })
  ).token;

  await page.waitForFunction(() => Boolean(window.Clerk?.loaded), { timeout: 25000 });
  await page.evaluate(async (t) => {
    const signIn = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (signIn.status === "complete")
      await window.Clerk.setActive({ session: signIn.createdSessionId });
  }, ticket);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await beat(page, 3400);
  await glide(page, 620);
  await beat(page, 1800);
  await glide(page, 0, 1200);
  await beat(page, 800);

  // ── 4. The builder: edit, and watch the preview change ───────────────────
  // This is the payoff shot — the defect this rebuild existed to fix was that
  // opening an editor hid the preview entirely.
  console.log("scene 4: builder");
  await page.goto(`${BASE_URL}/dashboard/builder`, { waitUntil: "networkidle" });
  await beat(page, 3200);

  const heroEdit = page.getByRole("button", { name: /edit/i }).first();
  if (await heroEdit.count()) {
    await heroEdit.click();
    await beat(page, 2200);

    const title = page
      .getByLabel(/title|headline|role/i)
      .or(page.locator('input[type="text"]'))
      .first();
    if (await title.count()) {
      await typeSlowly(title, "Creative Director");
      await beat(page, 2600); // hold on the preview updating live
    }
  }
  await beat(page, 1400);

  console.log("done recording");
} finally {
  await context.close(); // video is only flushed on context close
  await browser.close();
}

// Playwright names videos by an internal id; give it a stable filename.
const raw = readdirSync(RAW_DIR)
  .filter((f) => f.endsWith(".webm"))
  .sort();
if (raw.length === 0) throw new Error("no video produced");
const final = join(OUT_DIR, "connecta-demo.webm");
if (existsSync(final)) rmSync(final);
renameSync(join(RAW_DIR, raw[0]), final);
rmSync(RAW_DIR, { recursive: true, force: true });
console.log(`\nvideo: ${final}`);
