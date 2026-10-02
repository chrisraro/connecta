import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { DEMO_PORTRAITS, buildDemoBrokerProfile, buildDemoProfile, type DemoPersonaId } from "./demoProfile";
import { PERSONAS } from "@/components/landing/IndustryDemo";

// Unsplash Terms s.5: the licence excludes recognisable people. Demo people
// use portraits we own (public/marketing/), never stock faces (2026-10-02).
test("persona portraits are files we host, never Unsplash", () => {
  for (const url of Object.values(DEMO_PORTRAITS)) expect(url).toMatch(/^\/marketing\//);
  const used = [
    ...Object.values(PERSONAS).map((p) => p.photo),
    buildDemoProfile("editorial").agent.avatarUrl,
    buildDemoBrokerProfile("editorial").agent.avatarUrl,
  ];
  for (const url of used) expect(url ?? "").not.toMatch(/unsplash\.com/);
});

// Every persona has an illustrated portrait drawn in-house, shipped in public/.
test("each persona has an illustrated SVG portrait that exists under public/", () => {
  const ids: DemoPersonaId[] = ["broker", "designer", "shop", "student"];
  const root = path.resolve(__dirname, "../..");
  for (const id of ids) {
    const url = DEMO_PORTRAITS[id];
    expect(url, id).toBeDefined();
    expect(url).toMatch(/^\/marketing\/portraits\/.+\.svg$/);
    expect(existsSync(path.join(root, "public", url!)), `${url} exists`).toBe(true);
  }
});
