"use client";

import { useState } from "react";
import { DigitalCardModal } from "@/components/ui/DigitalCardModal";

import type { ProfileData } from "@/types/profile";
import { PROFILE_COPY as t } from "./copy";
import { sheetFor } from "./sheet";
import { SurveyFooter, SurveyProfile, sheetVars, surveyStyles } from "./SurveyProfile";

/**
 * The public profile rendered from the static demo persona, for the internal
 * /marketing-preview route (mockups and visual review). Labelled as sample
 * content so a screenshot can never pass for a real customer.
 */
export function SurveyDemo({
  data,
  templateId,
  showEmpty = false,
}: {
  data: ProfileData;
  templateId: string;
  showEmpty?: boolean;
}) {
  const sheet = sheetFor(templateId);
  const [showQr, setShowQr] = useState(false);

  return (
    <div className={surveyStyles.sheet} style={sheetVars(sheet)}>
      <p
        className="border-b px-4 py-2 text-center text-[12px] font-medium"
        style={{ borderColor: "var(--sv-line)", color: "var(--sv-soft)" }}
      >
        Demo profile, sample content
      </p>
      <SurveyProfile
        data={data}
        t={t}
        showEmpty={showEmpty}
        onShowQr={() => setShowQr(true)}
      />
      <DigitalCardModal
        open={showQr}
        onOpenChange={setShowQr}
        agent={data.agent}
        profileId="demo"
        isOwner={false}
      />
      <SurveyFooter sheet={sheet} t={t} />
    </div>
  );
}
