import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { isReservedSlug } from "@/lib/slug";
import {
  renderProfileOgImage,
  ogImageAlt,
  ogImageSize,
  ogImageContentType,
} from "@/lib/profileOgImage";

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
  const profile = isReservedSlug(slug)
    ? null
    : await fetchQuery(api.profiles.getProfileBySlug, { slug }).catch(() => null);
  return renderProfileOgImage(profile);
}
