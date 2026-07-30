import { ProfileInfo } from "@/types/profile";

// Maps a builder block id to the ProfileInfo field(s) it owns. Blocks not
// listed here (Hero, About, Projects, Products, Properties, Contact) either
// have no optional agentInfo field of their own or are always required.
const BLOCK_TO_AGENT_FIELDS: Record<string, (keyof ProfileInfo)[]> = {
  Certification: ["certification"],
  Education: ["education"],
  TechStack: ["techStack"],
  Services: ["services"],
  Experience: ["experience"],
  Testimonials: ["testimonials"],
  Gallery: ["gallery"],
};

/**
 * Strips optional ProfileInfo fields whose owning block is disabled, so a
 * block the user toggled off never gets saved (and therefore never
 * rendered) even if its underlying data is still filled in the form
 * (Frontend audit #1 — "hidden" blocks currently still render because their
 * data is saved regardless of isEnabled).
 */
export function filterAgentInfoByEnabledBlocks(
  agentInfo: ProfileInfo,
  enabledBlockIds: string[]
): ProfileInfo {
  const enabled = new Set(enabledBlockIds);
  const result: ProfileInfo = { ...agentInfo };
  for (const [blockId, fields] of Object.entries(BLOCK_TO_AGENT_FIELDS)) {
    if (!enabled.has(blockId)) {
      for (const field of fields) {
        delete result[field];
      }
    }
  }
  return result;
}
