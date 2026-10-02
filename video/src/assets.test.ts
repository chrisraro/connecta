import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { DEMO_PORTRAITS } from "../../components/marketing/demoProfile";

const root = path.resolve(__dirname, "../..");

test("every demo portrait is served from video/public, identical to the site's copy", () => {
  const entries = Object.entries(DEMO_PORTRAITS);
  expect(entries.length).toBeGreaterThan(0);
  for (const [id, url] of entries) {
    const site = readFileSync(path.join(root, "public", url!));
    const video = readFileSync(path.join(root, "video", "public", url!));
    expect(video.equals(site), id).toBe(true);
  }
});
