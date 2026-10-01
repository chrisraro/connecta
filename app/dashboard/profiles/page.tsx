"use client";

import { PageHeader, PageLoading } from "@/components/dashboard/PageHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMyPlan } from "@/hooks/useCurrentUser";
import { useMyProfiles, useDeleteProfile } from "@/hooks/useProfiles";
import { agentInfoOf, layoutConfigOf } from "@/lib/db/profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  ExternalLink,
  QrCode,
  Search,
  Trash2,
  Edit2,
  MoreVertical,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { DigitalCardModal } from "@/components/ui/DigitalCardModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { sheetFor } from "@/components/survey/sheet";
import { profilePath } from "@/lib/profileUrl";
import { resolveBuilderEntryRedirect } from "@/lib/builderEntry";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProfilesPage() {
  const { user } = useAuth();
  const { data: profiles } = useMyProfiles();
  // Needed for the "Create" CTAs below — see createProfileHref. Also
  // covers editing (getProfile enforces plan limits server-side; this
  // just decides where the buttons on THIS page point).
  const myPlan = useMyPlan();
  const deleteProfileMutation = useDeleteProfile();
  const deleteProfile = deleteProfileMutation.mutateAsync;

  const [query, setQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  // The profile whose digital card is open (portrait first, from "Card").
  const [cardProfileId, setCardProfileId] = useState<string | null>(null);

  if (profiles === undefined || myPlan === undefined) {
    return (
      <PageLoading />
    );
  }

  // "Create" affordances that are always visible (unlike the empty-state
  // CTA below, which only renders when profiles.length === 0 and is
  // therefore already safe) must link to editing an existing profile
  // ONLY when creating a new one would be doomed to fail — i.e. the user
  // is already at their plan's profile limit (Task 12). Routes through
  // the same plan-aware `resolveBuilderEntryRedirect` the builder page
  // itself uses (lib/builderEntry.ts), rather than duplicating the "any
  // existing profile means edit" logic this page used to apply
  // regardless of plan (Task 20, I5) — that silently turned both "Create
  // New" buttons into "edit your newest profile" for a PAYING customer
  // with room for more, on the page literally called "My Profiles".
  const entryRedirectId = resolveBuilderEntryRedirect(null, profiles, myPlan.limits.maxProfiles);
  const createProfileHref = entryRedirectId
    ? `/dashboard/builder?id=${entryRedirectId}`
    : "/dashboard/builder";

  const handleDelete = async (profileId: string) => {
    if (!user?.id) return;
    try {
      await deleteProfile(profileId);
      setIsDeleting(null);
      toast.success("Profile deleted");
    } catch (error) {
      console.error(error);
      toast.error(toUserMessage(error));
    }
  };


  // Search by profile name, owner name or web address.
  const q = query.trim().toLowerCase();
  const visibleProfiles = q
    ? profiles.filter((p) =>
        [p.name, agentInfoOf(p).fullName, profilePath(p)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : profiles;

  return (
    <div className="space-y-8">
      {/* "Create new" links straight to editing when a profile already
          exists: the bare no-id builder used to send an at-limit free-plan
          user into a "Create Profile" form that could never save (Task 12). */}
      <PageHeader
        title="Profiles"
        description="Manage your digital business cards."
        actions={
          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="profile-search" className="sr-only">
                Search profiles
              </label>
              <Input
                id="profile-search"
                type="search"
                placeholder="Search profiles"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button asChild className="shrink-0">
              <Link href={createProfileHref}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Create new
              </Link>
            </Button>
          </div>
        }
      />

      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No profiles created yet"
          description="Create your first digital business card and share it via NFC tap or QR code."
          action={{ label: "Create your first profile", href: "/dashboard/builder" }}
        />
      ) : visibleProfiles.length === 0 ? (
        <EmptyState icon={Search} title="No matching profiles" description="Try a different search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProfiles.map((profile) => {
            // The stored template id selects a Survey Plan sheet colourway;
            // the banner is that sheet, not the retired template's palette.
            const sheet = sheetFor(layoutConfigOf(profile).themeId);
            return (
              <Card key={profile.id} className="relative gap-0 overflow-hidden py-0">
                <div
                  className="h-32 w-full relative border-b-[1.5px] border-input"
                  style={{ backgroundColor: sheet.ground }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 120 64"
                    className="absolute right-6 top-1/2 h-16 w-28 -translate-y-1/2"
                  >
                    <path
                      d="M6 6 H96 L114 24 V58 H6 Z"
                      fill="none"
                      stroke={sheet.line}
                      strokeWidth="1.5"
                    />
                    <circle cx="104" cy="50" r="3" fill={sheet.mark} />
                  </svg>
                  <span
                    className="absolute bottom-4 left-4 border-[1.5px] px-2 py-0.5 text-[13px] font-bold capitalize"
                    style={{
                      borderColor: sheet.line,
                      color: sheet.ink,
                      backgroundColor: sheet.ground,
                    }}
                  >
                    {sheet.id}
                  </span>

                  {/* Actions dropdown */}
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-[1.5px] bg-background"
                          style={{ borderColor: sheet.line }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/builder?id=${profile.id}`}>
                            <Edit2 className="w-4 h-4" /> Edit profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setIsDeleting(profile.id)}
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="relative z-10 -mt-8 flex justify-center">
                  <ProfileImage
                    src={agentInfoOf(profile).avatarUrl}
                    alt={`${profile.name} avatar`}
                    fallbackSeed={agentInfoOf(profile).fullName || profile.name}
                    className="h-16 w-16 border-[1.5px] border-input bg-background object-cover"
                  />
                </div>

                <CardHeader className="pt-2 pb-2 text-center">
                  <CardTitle className="text-xl font-bold [font-stretch:112%] text-foreground">
                    {profile.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-medium">
                    {agentInfoOf(profile).fullName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6 text-center">
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {profilePath(profile)}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3 border-t border-input pt-4 pb-6 px-6">
                  <Link href={profilePath(profile)} target="_blank" className="flex-1 min-w-[100px]">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4" />
                      View
                    </Button>
                  </Link>

                  <Button
                    variant="secondary"
                    className="flex-1 min-w-[100px]"
                    onClick={() => setCardProfileId(profile.id)}
                  >
                    <QrCode className="w-4 h-4" />
                    Card
                  </Button>
                  {cardProfileId === profile.id && (
                    <DigitalCardModal
                      open
                      onOpenChange={(open) => !open && setCardProfileId(null)}
                      agent={agentInfoOf(profile)}
                      profileId={profile.id}
                      profileSlug={profile.slug}
                      digitalCardConfig={{ skin: profile.skin }}
                      defaultOrientation="portrait"
                      isOwner
                    />
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your digital business card.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setIsDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => isDeleting && handleDelete(isDeleting)}
            >
              Delete profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
