import { getProfileById } from "@/lib/db/publicProfile";
import {
  renderProfileOgImage,
  ogImageAlt,
  ogImageSize,
  ogImageContentType,
} from "@/lib/profileOgImage";
import { agentInfoOf, layoutConfigOf } from "@/lib/db/profile";

export const runtime = "edge";
export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileById(id);
  // The row carries agent_info/layout_config as Json, which Postgres cannot
  // type. Narrowed here at the boundary rather than widening OgProfile,
  // so the renderer keeps a precise input.
  return renderProfileOgImage(
    profile ? { agent_info: agentInfoOf(profile), layout_config: layoutConfigOf(profile) } : null,
  );
}
