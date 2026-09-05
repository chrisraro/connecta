import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  renderProfileOgImage,
  ogImageAlt,
  ogImageSize,
  ogImageContentType,
} from "@/lib/profileOgImage";

export const runtime = "edge";
export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await fetchQuery(api.profiles.getProfile, {
    profileId: id as Id<"profiles">,
  }).catch(() => null);
  return renderProfileOgImage(profile);
}
