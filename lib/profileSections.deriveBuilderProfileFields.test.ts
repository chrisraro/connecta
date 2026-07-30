import { expect, test } from "vitest";
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
test("calling the derivation independently for preview and for save always agrees", () => {
  const previewResult = deriveBuilderProfileFields("company", blocks, baseAgentInfo);
  const saveResult = deriveBuilderProfileFields("company", blocks, baseAgentInfo);
  expect(previewResult).toEqual(saveResult);
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
