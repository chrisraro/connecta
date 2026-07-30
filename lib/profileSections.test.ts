import { expect, test } from "vitest";
import { filterAgentInfoByEnabledBlocks } from "./profileSections";
import { ProfileInfo } from "@/types/profile";

const baseAgentInfo: ProfileInfo = {
  fullName: "Jane Doe",
  title: "Designer",
  company: "Acme",
  phone: "0917",
  email: "jane@acme.test",
  services: [],
  socialLinks: [],
  certification: { title: "Certified Thing", description: "..." },
  education: [{ degree: "BFA", school: "State U" }],
  gallery: ["img1", "img2"],
};

test("strips education when the Education block is disabled", () => {
  const result = filterAgentInfoByEnabledBlocks(baseAgentInfo, ["Hero", "About", "Contact"]);
  expect(result.education).toBeUndefined();
});

test("keeps education when the Education block is enabled", () => {
  const result = filterAgentInfoByEnabledBlocks(baseAgentInfo, ["Hero", "Education", "Contact"]);
  expect(result.education).toEqual(baseAgentInfo.education);
});

test("strips gallery, certification when their blocks are disabled but keeps required fields", () => {
  const result = filterAgentInfoByEnabledBlocks(baseAgentInfo, ["Hero", "Contact"]);
  expect(result.gallery).toBeUndefined();
  expect(result.certification).toBeUndefined();
  expect(result.fullName).toBe("Jane Doe");
});
