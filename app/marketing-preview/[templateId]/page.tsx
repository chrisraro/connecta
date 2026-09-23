import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SurveyDemo } from "@/components/survey/SurveyDemo";
import { TEMPLATE_IDS, TemplateId } from "@/components/templates/theme";
import { buildDemoBrokerProfile, buildDemoProfile } from "@/components/marketing/demoProfile";
import { CONNECTA } from "@/lib/brand";

/**
 * Internal-only route: renders the full, unscaled public-profile page for
 * one template using the same static demo persona as the landing hero's
 * phone preview (components/marketing/demoProfile.ts).
 *
 * Exists purely so `marketing/generate-mockups.mjs` has a real, static,
 * Convex-free URL to screenshot for each of the three templates — capturing
 * an actual seeded profile at `/[slug]` would either require a live
 * database record (fragile, not reproducible on a fresh checkout) or risk
 * capturing a real customer's data. Not linked from anywhere in the app;
 * `noindex` below keeps it out of search results.
 */

export function generateStaticParams() {
  return TEMPLATE_IDS.map((templateId) => ({ templateId }));
}

export const metadata: Metadata = {
  title: `${CONNECTA.name} — template preview`,
  robots: { index: false, follow: false },
};

function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}

export default async function MarketingPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ persona?: string; empty?: string; nophoto?: string }>;
}) {
  const { templateId } = await params;
  if (!isTemplateId(templateId)) notFound();
  const { persona, empty, nophoto } = await searchParams;

  // ?persona=broker shows the real estate persona with listings; ?empty=1
  // previews the owner-only unsurveyed-lot state for empty sections;
  // ?nophoto=1 previews the initials fallback for a profile with no photo.
  const persona_ = persona === "broker" ? buildDemoBrokerProfile(templateId) : buildDemoProfile(templateId);
  const withPhoto =
    nophoto === "1" ? { ...persona_, agent: { ...persona_.agent, avatarUrl: undefined } } : persona_;
  // The empty-state preview adds two blocks the persona has no content for.
  const data =
    empty === "1"
      ? { ...withPhoto, componentOrder: [...(withPhoto.componentOrder ?? []), "Gallery", "Testimonials"] }
      : withPhoto;
  return <SurveyDemo data={data} templateId={templateId} showEmpty={empty === "1"} />;
}
