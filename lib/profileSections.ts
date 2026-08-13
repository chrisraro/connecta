import { ProfileInfo, ProfileType } from "@/types/profile";

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

export interface BuilderBlock {
  id: string;
  isEnabled: boolean;
}

/**
 * Filters the builder's full block list down to the ones applicable for a
 * given profile type (e.g. individuals never see Products/Properties).
 * Moved here (out of app/dashboard/builder/page.tsx) so the builder's Save
 * path and its live preview can both call the exact same function instead
 * of two copies of the same three `if` branches drifting apart.
 */
export function getBlocksForProfileType<T extends BuilderBlock>(
  profileType: ProfileType,
  blocks: T[]
): T[] {
  return blocks.filter((block) => {
    if (profileType === "individual") {
      return block.id !== "Products" && block.id !== "Properties";
    } else if (profileType === "company") {
      return (
        block.id !== "Education" &&
        block.id !== "TechStack" &&
        block.id !== "Experience" &&
        block.id !== "Properties"
      );
    } else if (profileType === "business") {
      return block.id !== "Education" && block.id !== "TechStack" && block.id !== "Experience";
    }
    return true;
  });
}

/**
 * The ordered list of block ids that are both applicable to `profileType`
 * and toggled on. This is exactly what gets saved as
 * `layoutConfig.componentOrder` — `ProfileRenderer` renders only the ids
 * present in this list (falling back to every slot only for legacy
 * profiles saved before `componentOrder` existed), so this list is the
 * single source of truth for "what's actually visible."
 */
export function deriveComponentOrder(profileType: ProfileType, blocks: BuilderBlock[]): string[] {
  return getBlocksForProfileType(profileType, blocks)
    .filter((b) => b.isEnabled)
    .map((b) => b.id);
}

/**
 * One shared derivation for the builder's save path and its live preview:
 * the enabled component order, plus the agentInfo filtered down to match
 * it. Before this existed, the preview skipped the filtering step
 * entirely and rendered every section that had data, regardless of the
 * Hidden badge or the drag order — so what a user saw in the builder could
 * silently disagree with what actually got published. Both callers must
 * go through this function so they cannot drift apart again (Task 2
 * review — preview-fidelity product bug).
 */
export function deriveBuilderProfileFields(
  profileType: ProfileType,
  blocks: BuilderBlock[],
  agentInfo: ProfileInfo
): { componentOrder: string[]; filteredAgentInfo: ProfileInfo } {
  const componentOrder = deriveComponentOrder(profileType, blocks);
  return {
    componentOrder,
    filteredAgentInfo: filterAgentInfoByEnabledBlocks(agentInfo, componentOrder),
  };
}
