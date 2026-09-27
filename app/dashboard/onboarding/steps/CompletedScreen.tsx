import Link from "next/link";
import { ArrowRight, CheckCircle2, Edit, SmartphoneNfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { CONNECTA } from "@/lib/brand";
import type { LinkState } from "@/lib/cardClaim";
import { PROFILE_CATEGORIES } from "./TypeStep";
import type { OnboardingData } from "@/lib/db/profile";

/**
 * The post-completion confirmation, gated on the live `onboarding.completed`
 * query (app/dashboard/onboarding/page.tsx) so it takes over the instant the
 * save_onboarding mutation flips that flag — no further click required.
 * Restyled to the restrained Survey Plan look: square, [1.5px] borders, no
 * tinted fills, Lucide icons only (no emoji category badges).
 */
export function CompletedScreen({
  data,
  cardClaimed,
  linkState,
  onGoToBuilder,
  onEditSetup,
  onBackToDashboard,
}: {
  data: OnboardingData | null | undefined;
  cardClaimed: boolean;
  linkState: LinkState;
  onGoToBuilder: () => void;
  onEditSetup: () => void;
  onBackToDashboard: () => void;
}) {
  const cat = PROFILE_CATEGORIES.find((c) => c.id === data?.profileCategory);
  const CatIcon = cat?.icon;

  return (
    <div className="sheet-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="border-[1.5px] border-input bg-background">
          <div className="space-y-6 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold [font-stretch:112%]">Profile setup complete</h1>
                <p className="text-sm text-muted-foreground">Your profile is ready to use.</p>
              </div>
            </div>

            <div className="space-y-3 border-[1.5px] border-input p-4">
              {data?.avatarUrl && (
                <div className="flex justify-center">
                  <ProfileImage
                    src={data.avatarUrl}
                    alt="avatar"
                    className="h-20 w-20 overflow-hidden border-[1.5px] border-input"
                  />
                </div>
              )}
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-semibold">{data?.fullName}</h2>
                <p className="text-sm text-muted-foreground">{data?.title}</p>
                {cat && CatIcon && (
                  <span className="inline-flex items-center gap-1 border-[1.5px] border-input px-2 py-0.5 text-[13px] font-bold">
                    <CatIcon className="h-3.5 w-3.5" aria-hidden="true" /> {cat.label}
                  </span>
                )}
              </div>
              {data?.email && <div className="text-center text-sm text-muted-foreground">{data.email}</div>}
              {data?.services && data.services.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 border-t border-border pt-3">
                  {data.services.map((s) => (
                    <span key={s} className="border border-border px-2 py-0.5 text-[13px] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {cardClaimed && (
              <div className="flex w-full items-center gap-3 border-[1.5px] border-input p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <SmartphoneNfc className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Card activated</p>
                  <p className="text-xs text-muted-foreground">
                    {linkState === "linked" ? (
                      <>Your physical {CONNECTA.name} card is now live and linked to your profile.</>
                    ) : linkState === "linking" || linkState === "idle" ? (
                      <>Linking your {CONNECTA.name} card to your profile.</>
                    ) : (
                      <>
                        Your card is activated but not linked yet.{" "}
                        <Link href="/dashboard/cards" className="underline underline-offset-2">
                          Link it on the Cards page
                        </Link>
                        .
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* TODO(team-invite): once components/team/InviteBanner.tsx exists,
                render "You've been invited to join <team>" here for invited
                users landing on this screen. */}

            <div className="space-y-2">
              <Button className="w-full" size="lg" onClick={onGoToBuilder}>
                <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" /> Go to profile builder
              </Button>
              <Button variant="outline" className="w-full" onClick={onEditSetup}>
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" /> Edit profile setup
              </Button>
              <Button variant="ghost" className="w-full" onClick={onBackToDashboard}>
                Back to dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
