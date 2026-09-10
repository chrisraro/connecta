import { getProfileBySlug } from "@/lib/db/publicProfile";
import { isReservedSlug } from "@/lib/slug";
import {
  renderProfileOgImage,
  ogImageAlt,
  ogImageSize,
  ogImageContentType,
} from "@/lib/profileOgImage";
import { agentInfoOf, layoutConfigOf } from "@/lib/db/profile";

/**
 * Vanity-URL sibling of app/p/[id]/opengraph-image.tsx. `/<slug>` is the
 * canonical shared link once a profile has a slug, so it needs its own OG
 * image — without this every share of a vanity link fell back to a
 * text-only preview, the exact regression Task 3 shipped an OG image to
 * prevent for `/p/<id>`.
 */
export const runtime = "edge";
export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = isReservedSlug(slug) ? null : await getProfileBySlug(slug);
  // The row carries agent_info/layout_config as Json, which Postgres cannot
  // type. Narrowed here at the boundary rather than widening OgProfile,
  // so the renderer keeps a precise input.
  return renderProfileOgImage(
    profile ? { agent_info: agentInfoOf(profile), layout_config: layoutConfigOf(profile) } : null,
  );
}
