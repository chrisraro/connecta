import { expect, test } from "vitest";
import { DEMO_PORTRAITS, buildDemoBrokerProfile, buildDemoProfile } from "./demoProfile";
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
