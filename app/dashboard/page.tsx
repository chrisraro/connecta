"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import {
  ChevronRight,
  Sparkles,
  MessageSquare,
  ExternalLink,
  Users,
  Edit2,
  SmartphoneNfc,
  ShoppingBag,
  QrCode,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { profilePath } from "@/lib/profileUrl";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { DigitalCardModal } from "@/components/ui/DigitalCardModal";
import { newestProfileId } from "@/lib/builderEntry";

export default function DashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id;

  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [selectedModalProfile, setSelectedModalProfile] = useState<
    NonNullable<typeof profiles>[number] | null
  >(null);

  const onboarding = useQuery(api.users.getOnboardingStatus, clerkId ? { clerkId } : "skip");
  const profiles = useQuery(api.profiles.getMyProfiles, clerkId ? { clerkId } : "skip");
  const leads = useQuery(api.leads.getLeads, clerkId ? { clerkId } : "skip");
  const cards = useQuery(api.users.getMyCards, clerkId ? { clerkId } : "skip");

  const primaryProfile = profiles && profiles.length > 0 ? profiles[0] : null;
  // The profile the "Edit profile" quick action below routes to, kept
  // consistent with resolveBuilderEntryRedirect's own newest-by-
  // _creationTime pick (Task 12 review) — a multi-profile account (e.g.
  // downgraded from Pro) must not be routed to a different profile
  // depending on which nav link was clicked.
  const editProfileId = profiles ? newestProfileId(profiles) : null;
  const activeCardProfile = selectedModalProfile || primaryProfile;

  const isOnboardingComplete = onboarding?.completed ?? true;

  const leadsList = leads?.leads ?? [];
  const activeProfilesCount = profiles?.length ?? 0;
  const newLeadsCount = leadsList.filter((l) => l.status === "new").length;
  const totalLeadsCount = leadsList.length + (leads?.lockedCount ?? 0);
  const totalTaps = cards?.reduce((acc, card) => acc + card.tapCount, 0) ?? 0;
  const activeCardsCount = cards?.filter((c) => c.status === "active").length ?? 0;
  const recentLeads = leadsList.slice(0, 4);

  const isLoading = profiles === undefined;
  const statsLoading = profiles === undefined || leads === undefined || cards === undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          Welcome{user?.firstName ? `, ${user.firstName}` : " back"}
        </h1>
        <p className="text-muted-foreground">
          Manage your portfolio, share via NFC &amp; QR, and capture leads.
        </p>
      </div>

      {/* ─── Digital Business Card Banner ──────────────────────────── */}
      {primaryProfile && (
        <div className="rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--e-raised)] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/*
                      `min-w-0` is load-bearing. A flex child defaults to
                      min-width:auto, so it refuses to shrink below its own
                      content width — that is what crushed "Digital Business
                      Card" into three lines on a narrow screen. Paired with
                      flex-wrap on the title row below, the badge now drops
                      under the heading instead of competing with it for
                      horizontal space.
                    */}
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-primary/10 text-primary">
              <QrCode className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-base font-bold text-foreground">Digital business card</h2>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                  Instant web access
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Present your card on screen, download it as a high-res PNG, or save the contact as a
                .vcf.
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
            <Button
              onClick={() => setShowDigitalCardModal(true)}
              className="min-h-11 flex-1 gap-2 rounded-[var(--r-md)] font-semibold md:flex-initial"
            >
              <QrCode className="size-4" aria-hidden="true" />
              Show card
            </Button>

            <Button
              onClick={() => setShowDigitalCardModal(true)}
              variant="outline"
              className="min-h-11 gap-1.5 rounded-[var(--r-md)] font-medium"
            >
              <Download className="size-4" aria-hidden="true" />
              Save image
            </Button>
          </div>
        </div>
      )}

      {/* ─── Digital Card Modal ────────────────────────────────────── */}
      {activeCardProfile && (
        <DigitalCardModal
          open={showDigitalCardModal}
          onOpenChange={(open) => {
            setShowDigitalCardModal(open);
            if (!open) setSelectedModalProfile(null);
          }}
          agent={activeCardProfile.agentInfo}
          profileId={activeCardProfile._id}
          profileSlug={activeCardProfile.slug}
          digitalCardConfig={activeCardProfile.digitalCard}
          isOwner={true}
        />
      )}

      {/* ─── Onboarding Banner ─────────────────────────────────────── */}
      {!isOnboardingComplete && onboarding !== undefined && (
        <div className="rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Complete your profile setup</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add your contact info, services, and photo so clients know who you are.
                </p>
              </div>
            </div>
            <Link href="/dashboard/onboarding">
              <Button size="sm" className="shrink-0 gap-1 rounded-xl">
                Continue Setup <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ─── Stats ─────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Taps"
            value={totalTaps.toString()}
            color="text-foreground"
            icon={<ExternalLink className="w-4 h-4" />}
          />
          <StatCard
            label="Total Leads"
            value={totalLeadsCount.toString()}
            color="text-foreground"
            icon={<MessageSquare className="w-4 h-4" />}
          />
          <StatCard
            label="Active Cards"
            value={activeCardsCount.toString()}
            color="text-foreground"
            icon={<SmartphoneNfc className="w-4 h-4" />}
          />
          <StatCard
            label="New Leads"
            value={newLeadsCount.toString()}
            color="text-emerald-500"
            icon={<Sparkles className="w-4 h-4" />}
          />
        </div>
      )}

      {/* ─── Quick Actions ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction href="/dashboard/cards" icon={SmartphoneNfc} label="Activate a card" />
        {/* When a profile already exists, link straight to editing
                    it — routing to the bare no-id builder here used to send
                    an at-limit free-plan user into a "Create Profile" form
                    that could never save (Task 12). */}
        <QuickAction
          href={editProfileId ? `/dashboard/builder?id=${editProfileId}` : "/dashboard/builder"}
          icon={Edit2}
          label="Edit profile"
        />
        <QuickAction
          href={profiles && profiles.length > 0 ? profilePath(profiles[0]) : "/dashboard/profiles"}
          icon={ExternalLink}
          label="View public profile"
          external={!!(profiles && profiles.length > 0)}
        />
        <QuickAction href="/shop" icon={ShoppingBag} label="Buy cards" />
      </div>

      {/* ─── Profiles Section ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Profiles</h2>
          {activeProfilesCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/dashboard/profiles">
                View All <ChevronRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        ) : activeProfilesCount === 0 ? (
          <EmptyState
            icon={Users}
            title="No profiles created yet"
            description="Create your first digital portfolio card and share it via NFC tap or QR code."
            action={{ label: "Create new profile", href: "/dashboard/builder" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.slice(0, 4).map((profile) => (
              <div
                key={profile._id}
                className="group bg-card border border-border p-4 rounded-3xl hover:border-primary/30 transition-all duration-300 flex items-center gap-4 relative overflow-hidden"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border bg-muted shrink-0">
                  <ProfileImage
                    src={profile.agentInfo.avatarUrl}
                    alt={`${profile.name} profile avatar`}
                    fallbackSeed={profile.name}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate uppercase tracking-tight">
                    {profile.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-primary/10 text-primary rounded-full">
                      {profile.layoutConfig.themeId}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground italic">
                      {new Date(profile._creationTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-full hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors"
                    onClick={() => {
                      setSelectedModalProfile(profile);
                      setShowDigitalCardModal(true);
                    }}
                    title="Show Digital Card"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    asChild
                    title="Preview"
                  >
                    <Link
                      href={profilePath(profile)}
                      target="_blank"
                      aria-label={`Preview ${profile.name}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                    asChild
                    title="Edit"
                  >
                    <Link
                      href={`/dashboard/builder?id=${profile._id}`}
                      aria-label={`Edit ${profile.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Recent Leads ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Leads</h2>
          {totalLeadsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/dashboard/leads">
                View All <ChevronRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>

        {leads === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : recentLeads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No leads yet"
            description="When someone taps your card and sends a message, it appears here."
          />
        ) : (
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <Link
                key={lead._id}
                href="/dashboard/leads"
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{lead.inquirerName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {lead.message || lead.propertyName || lead.inquirerContact}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[var(--r-lg)] border border-border bg-card p-5 transition-colors hover:border-primary/20 sm:p-6">
      <div
        className="pointer-events-none absolute right-4 top-4 opacity-5 transition-opacity group-hover:opacity-10 sm:right-6 sm:top-6"
        aria-hidden="true"
      >
        {icon}
      </div>
      {/*
              `pr-7` reserves the corner the decorative icon occupies. Without
              it the label runs underneath the watermark on narrow screens —
              "TOTAL TAPS" collided with its own icon at 320px. Tracking is
              `wide` rather than `widest` so two-word labels ("Total Leads")
              still fit on one line in a half-width grid cell.
            */}
      <h3 className="mb-2 pr-7 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <div className={`text-4xl font-black tracking-tight ${color}`}>{value}</div>
    </div>
  );
}
