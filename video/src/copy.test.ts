import { expect, test } from "vitest";
import { LINES } from "./copy";
import { FPS, beat } from "./timeline";

test("no line is longer than 7 words", () => {
  for (const l of LINES) expect(l.text.split(/\s+/).length, l.text).toBeLessThanOrEqual(7);
});

test("every line holds at least 1.5 s and ends inside its beat", () => {
  for (const l of LINES) {
    expect(l.hold, l.text).toBeGreaterThanOrEqual(1.5 * FPS);
    expect(l.at + l.hold, l.text).toBeLessThanOrEqual(beat(l.beat).frames);
  }
});

test("the CTA names the free profile and the site, and nothing quotes a price or a count", () => {
  const cta = LINES.filter((l) => l.beat === "cta").map((l) => l.text).join(" ");
  expect(cta).toContain("Create your free profile");
  expect(cta).toContain("connectaph.vercel.app");
  expect(LINES.map((l) => l.text).join(" ")).not.toMatch(/₱|\d+\s*(users|customers)/i);
});

test("the closing CTA lines stay on screen to the last frame of the video", () => {
  const cta = LINES.filter((l) => l.beat === "cta");
  for (const l of cta) {
    expect(l.stay, l.text).toBe(true);
    expect(l.at + l.hold, l.text).toBe(beat("cta").frames);
  }
});
