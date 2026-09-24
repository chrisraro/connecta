"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { StorefrontView } from "@/components/templates/StorefrontView";
import { ProfileData, ProfileType } from "@/types/profile";
import { DigitalCardModal } from "@/components/ui/DigitalCardModal";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";
import { usePublicProfile } from "@/hooks/useProfiles";
import { jsonArrayOf, type LayoutConfig } from "@/lib/db/profile";
import { SurveyFooter, SurveyProfile, sheetVars, surveyStyles } from "@/components/survey/SurveyProfile";
import { sheetFor, SHEETS } from "@/components/survey/sheet";
import { PROFILE_COPY as t } from "@/components/survey/copy";
import type {
  ProfileInfo,
  ProductItem,
  ServiceItem,
  PropertyListingItem,
  InlineProject,
} from "@/types/profile";

/**
 * Client renderer for a public profile, shared by both the `/p/<id>`
 * back-compat route and the `/<slug>` vanity route. The parent server
 * component owns data-fetching for `generateMetadata`; this component
 * re-fetches reactively so edits made in the builder show up live.
 */
export function ProfileView({
  lookup,
}: {
  lookup: { by: "id"; profileId: string } | { by: "slug"; slug: string };
}) {
  const [activeTab, setActiveTab] = useState<"portfolio" | "storefront">("portfolio");
  const [showCardModal, setShowCardModal] = useState(false);

  const { data: profile, isPending } = usePublicProfile(lookup);
  const profileIdForCard = lookup.by === "id" ? lookup.profileId : (profile?.id ?? "");

  if (isPending || !profile) {
    const sheet = SHEETS.whiteprint;
    return (
      <div className={surveyStyles.sheet} style={sheetVars(sheet)}>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          {isPending ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: sheet.line }} aria-hidden="true" />
              <span className="sr-only">{t.loading}</span>
            </>
          ) : (
            <>
              <svg aria-hidden="true" width="96" height="96" viewBox="0 0 96 96">
                <path
                  d="M30 6 H66 L90 30 V66 L66 90 H30 L6 66 V30 Z"
                  fill="none"
                  stroke={sheet.line}
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                />
              </svg>
              <h1 className={`${surveyStyles.expanded} mt-6 text-[26px] font-bold`}>{t.notFoundTitle}</h1>
              <p className="mt-2 max-w-sm text-[16px]" style={{ color: sheet.soft }}>
                {t.notFoundBody}
              </p>
              <Link
                href="/"
                className={`${surveyStyles.primary} mt-7 flex h-12 items-center gap-2 px-5 text-[15px] font-bold`}
              >
                <ConnectaMark className="h-5 w-5" dotColor="#FF5A52" />
                {t.goHome(CONNECTA.name)}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const layoutConfig = profile.layoutConfig as unknown as LayoutConfig;
  const agentInfo = profile.agentInfo as unknown as ProfileInfo;
  const sheet = sheetFor(layoutConfig.themeId);

  const data: ProfileData = {
    ownerId: profile.ownerId,
    name: profile.name,
    profileType: (profile.profileType || "individual") as ProfileType,
    agent: agentInfo,
    properties: [],
    projects: [],
    products: jsonArrayOf<ProductItem>(profile.products),
    services: jsonArrayOf<ServiceItem>(profile.services),
    propertyListings: jsonArrayOf<PropertyListingItem>(profile.propertyListings),
    inlineProjects: jsonArrayOf<InlineProject>(profile.inlineProjects),
    componentOrder: layoutConfig.componentOrder,
    theme: {
      primaryColor: profile.teamBranding?.accentColor || layoutConfig.colorPalette.primary,
      backgroundColor: layoutConfig.colorPalette.background,
      textColor: layoutConfig.colorPalette.text,
      secondaryColor: layoutConfig.colorPalette.secondary,
      accentColor: profile.teamBranding?.accentColor || layoutConfig.colorPalette.accent,
    },
    digitalCard: undefined,
    showStorefront: profile.showStorefront,
  };

  // agentInfo.services (the builder's "Services" tag editor) is the
  // authoritative source; the top-level `profile.services` catalog is never
  // populated (Task 13 / audit-dataflow.md #1).
  const hasCatalogItems =
    data.products!.length > 0 || (agentInfo.services && agentInfo.services.length > 0);
  const isStorefrontEnabled =
    profile.showStorefront !== false && (profile.showStorefront || hasCatalogItems);

  const tab = (id: "portfolio" | "storefront", label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      aria-pressed={activeTab === id}
      className={`${surveyStyles.cell} flex h-11 flex-1 items-center justify-center px-3 text-[14px] font-bold`}
      style={
        activeTab === id
          ? { backgroundColor: "var(--sv-line)", color: "var(--sv-ground)" }
          : { color: "var(--sv-ink)" }
      }
    >
      {label}
    </button>
  );

  return (
    <div className={surveyStyles.sheet} style={sheetVars(sheet)}>
      {isStorefrontEnabled && (
        <nav
          aria-label={t.profileTab}
          className="sticky top-0 z-40 w-full border-b-[1.5px] px-4 py-2"
          style={{ backgroundColor: "var(--sv-ground)", borderColor: "var(--sv-line)" }}
        >
          <div className="mx-auto flex max-w-[560px] border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
            {tab("portfolio", t.profileTab)}
            {tab("storefront", t.storefrontTab)}
          </div>
        </nav>
      )}

      <DigitalCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        agent={agentInfo}
        profileId={profileIdForCard}
        profileSlug={profile.slug}
        digitalCardConfig={{ skin: profile.skin }}
        isOwner={false}
      />

      {activeTab === "storefront" && isStorefrontEnabled ? (
        <StorefrontView data={data} />
      ) : (
        <SurveyProfile
          data={data}
          t={t}
          onShowQr={() => setShowCardModal(true)}
        />
      )}

      {profile.showBranding !== false && <SurveyFooter sheet={sheet} t={t} />}
    </div>
  );
}
