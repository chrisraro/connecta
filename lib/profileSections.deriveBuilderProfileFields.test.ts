import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BuilderBlock,
  deriveBuilderProfileFields,
  deriveComponentOrder,
  getBlocksForProfileType,
} from "./profileSections";
import { ProfileInfo } from "@/types/profile";

const baseAgentInfo: ProfileInfo = {
  fullName: "Jane Doe",
  title: "Designer",
  company: "Acme",
  phone: "0917",
  email: "jane@acme.test",
  services: ["Branding"],
  socialLinks: [],
  certification: { title: "Certified Thing", description: "..." },
  education: [{ degree: "BFA", school: "State U" }],
  gallery: ["img1", "img2"],
};

const blocks: BuilderBlock[] = [
  { id: "Hero", isEnabled: true },
  { id: "About", isEnabled: true },
  { id: "Certification", isEnabled: false },
  { id: "Education", isEnabled: true },
  { id: "Services", isEnabled: false },
  { id: "Products", isEnabled: true },
  { id: "Properties", isEnabled: true },
  { id: "Contact", isEnabled: true },
];

test("getBlocksForProfileType drops Products/Properties for individuals", () => {
  const result = getBlocksForProfileType("individual", blocks).map((b) => b.id);
  expect(result).not.toContain("Products");
  expect(result).not.toContain("Properties");
  expect(result).toContain("Hero");
});

test("deriveComponentOrder is applicable-and-enabled ids, in block order", () => {
  // business excludes Education/TechStack/Experience regardless of isEnabled,
  // but keeps Products/Properties.
  expect(deriveComponentOrder("business", blocks)).toEqual([
    "Hero",
    "About",
    "Products",
    "Properties",
    "Contact",
  ]);
  // individual excludes Products/Properties regardless of isEnabled, but
  // keeps Education.
  expect(deriveComponentOrder("individual", blocks)).toEqual(["Hero", "About", "Education", "Contact"]);
});

test("deriveBuilderProfileFields strips agentInfo fields owned by disabled blocks", () => {
  const { componentOrder, filteredAgentInfo } = deriveBuilderProfileFields("individual", blocks, baseAgentInfo);
  expect(componentOrder).not.toContain("Certification");
  expect(componentOrder).not.toContain("Services");
  expect(filteredAgentInfo.certification).toBeUndefined();
  expect(filteredAgentInfo.services).toBeUndefined();
  // Education block is enabled, so its data survives.
  expect(filteredAgentInfo.education).toEqual(baseAgentInfo.education);
  expect(filteredAgentInfo.fullName).toBe("Jane Doe");
});

// This is the regression test for the actual product bug: the builder's
// live preview and its Save handler used to compute componentOrder and the
// filtered agentInfo independently (two copies of the same expression) —
// they happened to agree today, but nothing enforced that they always
// would. Calling the shared derivation twice with the same inputs, the way
// "preview render" and "handleSave" each do, must always produce identical
// results.
/**
 * The invariant that actually matters is NOT that this pure function is
 * deterministic (it trivially is) — it's that the builder's two consumers,
 * `handleSave` and `renderPreview`, both route through it. That was the real
 * bug: the preview rendered every section with data while save applied
 * componentOrder + filtering, so the preview lied about what would publish.
 *
 * A unit test on the function alone cannot catch a regression where someone
 * inlines a second, divergent derivation back into one of those call sites.
 * `app/dashboard/builder/page.tsx` is a ~1,900-line client component with 30
 * pieces of state, so exercising it through the React tree is impractical;
 * asserting on the source is the cheap guard that actually fails when the
 * invariant breaks.
 */
test("both handleSave and renderPreview route through the shared derivation", () => {
  const src = readFileSync(
    join(process.cwd(), "app", "dashboard", "builder", "page.tsx"),
    "utf8"
  );

  const usages = src.match(/deriveBuilderProfileFields\s*\(/g) ?? [];
  expect(
    usages.length,
    "expected deriveBuilderProfileFields to be called at BOTH call sites (handleSave and renderPreview)"
  ).toBeGreaterThanOrEqual(2);

  // The save path must feed the derivation's output into the mutation, not a
  // separately-computed componentOrder.
  const saveIdx = src.indexOf("const handleSave");
  const previewIdx = src.indexOf("const renderPreview");
  expect(saveIdx, "handleSave not found").toBeGreaterThan(-1);
  expect(previewIdx, "renderPreview not found").toBeGreaterThan(-1);

  // Each function body (up to the next top-level `const x = ` at the same
  // indent) must contain a call to the shared derivation.
  const bodyAfter = (start: number) => src.slice(start, start + 4000);
  expect(
    bodyAfter(saveIdx),
    "handleSave must derive componentOrder/agentInfo via deriveBuilderProfileFields"
  ).toContain("deriveBuilderProfileFields(");
  expect(
    bodyAfter(previewIdx),
    "renderPreview must derive componentOrder/agentInfo via deriveBuilderProfileFields"
  ).toContain("deriveBuilderProfileFields(");
});

test("toggling a block off changes both componentOrder and the filtered agentInfo consistently", () => {
  const withGallery: ProfileInfo = { ...baseAgentInfo, gallery: ["a.jpg"] };
  const galleryOn = [...blocks, { id: "Gallery", isEnabled: true }];
  const galleryOff = [...blocks, { id: "Gallery", isEnabled: false }];

  const enabled = deriveBuilderProfileFields("company", galleryOn, withGallery);
  const disabled = deriveBuilderProfileFields("company", galleryOff, withGallery);

  expect(enabled.componentOrder).toContain("Gallery");
  expect(enabled.filteredAgentInfo.gallery).toEqual(["a.jpg"]);

  expect(disabled.componentOrder).not.toContain("Gallery");
  expect(disabled.filteredAgentInfo.gallery).toBeUndefined();
});
