import { ProfileInfo, ProfileType } from "@/types/profile";

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
 * the enabled component order, plus the agentInfo to render/save alongside
 * it. Before this existed, the preview skipped the filtering step
 * entirely and rendered every section that had data, regardless of the
 * Hidden badge or the drag order — so what a user saw in the builder could
 * silently disagree with what actually got published. Both callers must
 * go through this function so they cannot drift apart again (Task 2
 * review — preview-fidelity product bug).
 *
 * `filteredAgentInfo` is returned UNCHANGED from the given `agentInfo` — it
 * is no longer filtered by which blocks are enabled (Task 13). An earlier
 * version of this function additionally *deleted* the optional ProfileInfo
 * fields owned by a disabled block (certification/education/techStack/
 * services/experience/testimonials/gallery) before every save, on the
 * theory that a hidden block shouldn't be rendered. That part was already
 * true for free: `ProfileRenderer` (components/templates/ProfileRenderer.tsx)
 * walks `componentOrder` and only renders slots whose id is present in it —
 * a disabled block's data sitting untouched in agentInfo has zero rendering
 * effect. What the deletion actually did was make persistence follow
 * whatever the block toggles happen to be THIS save, not what the user
 * asked to remove — so a save that never touched Services, made while
 * Services merely happened to be off (e.g. the "individual" profile type's
 * default componentOrder, which omits Services — see convex/users.ts),
 * would silently and permanently erase the user's services data, with no
 * way to undo it by re-enabling the block. Hiding a block must only ever
 * change what's rendered; only an explicit user edit (clearing the field in
 * its own editor) should ever change what's saved.
 */
export function deriveBuilderProfileFields(
  profileType: ProfileType,
  blocks: BuilderBlock[],
  agentInfo: ProfileInfo
): { componentOrder: string[]; filteredAgentInfo: ProfileInfo } {
  return {
    componentOrder: deriveComponentOrder(profileType, blocks),
    filteredAgentInfo: { ...agentInfo },
  };
}
