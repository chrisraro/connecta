import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/db/publicProfile";
import { agentInfoOf } from "@/lib/db/profile";
import { isReservedSlug } from "@/lib/slug";
import { ProfileView } from "../p/[id]/ProfileView";
import { CONNECTA } from "@/lib/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (isReservedSlug(slug)) return { title: CONNECTA.name };

  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: `Profile not found — ${CONNECTA.name}` };

  const { fullName, title, company, about } = agentInfoOf(profile);
  const heading = [fullName, title].filter(Boolean).join(" — ");
  const description =
    about?.slice(0, 160) ||
    [title, company].filter(Boolean).join(" at ") ||
    `${fullName} on ${CONNECTA.name}`;

  return {
    title: `${heading} | ${CONNECTA.name}`,
    description,
    openGraph: { title: heading, description, type: "profile" },
    twitter: { card: "summary_large_image", title: heading, description },
  };
}

export default async function VanityProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // `/[slug]` is a catch-all-adjacent route that would otherwise shadow
  // real top-level routes if one somehow reached this far (it shouldn't —
  // Next resolves static segments like /dashboard ahead of a dynamic
  // sibling — but a genuinely unknown or reserved slug must still 404
  // rather than render as a "missing profile").
  if (isReservedSlug(slug)) notFound();

  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  return <ProfileView lookup={{ by: "slug", slug }} />;
}
