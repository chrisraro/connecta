"use client";

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
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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

export default function ProfilesPage() {
  const { user } = useAuth();
  const { data: profiles } = useMyProfiles();
  // Needed for the "Create" CTAs below — see createProfileHref. Also
  // covers editing (getProfile enforces plan limits server-side; this
  // just decides where the buttons on THIS page point).
  const myPlan = useMyPlan();
  const deleteProfileMutation = useDeleteProfile();
  const deleteProfile = deleteProfileMutation.mutateAsync;

  const [activeChip, setActiveChip] = useState("All");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  // The profile whose digital card is open (portrait first, from "Card").
  const [cardProfileId, setCardProfileId] = useState<string | null>(null);

  if (profiles === undefined || myPlan === undefined) {
    return (
      <div className="flex justify-center p-12 text-zinc-500">
        <Loader2 className="animate-spin" />
      </div>
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

  const chips = ["All", "Active", "Recently Updated", "Drafts"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Profiles</h1>
            <p className="text-muted-foreground text-sm">Manage your digital business cards.</p>
          </div>
          {/* Mobile Create Button. When a profile already exists,
                        link straight to editing it — routing to the bare
                        no-id builder here used to send an at-limit
                        free-plan user into a "Create Profile" form that
                        could never save (Task 12). */}
          <Link href={createProfileHref} className="md:hidden">
            <Button size="icon" className="h-10 w-10 bg-primary text-primary-foreground">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search profiles..."
              className="pl-10 bg-muted/50 border-border rounded-2xl h-12 md:h-10 focus-visible:ring-primary"
            />
          </div>

          <Link href={createProfileHref} className="hidden md:block">
            <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </Link>
        </div>
      </div>

      {/* Chips UI for Mobile/Modern Feel */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveChip(chip)}
            className={`px-5 py-2.5 text-xs font-bold whitespace-nowrap transition-colors duration-300 border ${
              activeChip === chip
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-muted border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card">
          <p className="text-muted-foreground mb-6 font-medium">
            You haven&apos;t created any profiles yet.
          </p>
          <Link href="/dashboard/builder">
            <Button className="rounded-2xl px-8 h-12 bg-primary text-primary-foreground">
              Create your first profile
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => {
            // The stored template id selects a Survey Plan sheet colourway;
            // the banner is that sheet, not the retired template's palette.
            const sheet = sheetFor(layoutConfigOf(profile).themeId);
            return (
              <Card
                key={profile.id}
                className="overflow-hidden border-border bg-card hover:border-primary/20 transition-colors duration-300 group relative"
              >
                <div
                  className="h-32 w-full relative border-b-[1.5px] border-input"
                  style={{
                    backgroundColor: sheet.ground,
                    backgroundImage: `linear-gradient(${sheet.grid} 1px, transparent 1px), linear-gradient(90deg, ${sheet.grid} 1px, transparent 1px)`,
                    backgroundSize: "16px 16px",
                  }}
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

                  {/* Actions Dropdown */}
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white border-none"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-2xl p-2">
                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                          <Link href={`/dashboard/builder?id=${profile.id}`}>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rounded-xl cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => setIsDeleting(profile.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {agentInfoOf(profile).avatarUrl && (
                  <div className="flex justify-center -mt-8 relative z-10">
                    <ProfileImage
                      src={agentInfoOf(profile).avatarUrl}
                      alt="avatar"
                      fallbackSeed={agentInfoOf(profile).fullName || profile.name}
                      className="w-16 h-16 rounded-full overflow-hidden object-cover border-4 border-card"
                    />
                  </div>
                )}
                {!agentInfoOf(profile).avatarUrl && (
                  <div className="flex justify-center -mt-8 relative z-10">
                    <ProfileImage
                      src={undefined}
                      alt="avatar"
                      fallbackSeed={agentInfoOf(profile).fullName || profile.name}
                      className="w-16 h-16 rounded-full overflow-hidden object-cover border-4 border-card"
                    />
                  </div>
                )}

                <CardHeader className="pt-2 pb-2 text-center">
                  <CardTitle className="text-xl font-bold [font-stretch:112%] text-foreground">
                    {profile.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-medium">
                    {agentInfoOf(profile).fullName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live Profile
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3 pt-0 pb-6 px-6">
                  <Link
                    href={profilePath(profile)}
                    target="_blank"
                    className="flex-1 min-w-[100px]"
                  >
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl border-border hover:bg-muted transition-colors h-11"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>

                  <Button
                    variant="secondary"
                    className="flex-1 min-w-[100px] h-11"
                    onClick={() => setCardProfileId(profile.id)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <DialogContent className="border-border bg-card p-6 sm:max-w-md">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold">Delete Profile?</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              This action cannot be undone. This will permanently delete your digital business card.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              variant="ghost"
              onClick={() => setIsDeleting(null)}
              className="rounded-xl flex-1 h-12 font-bold text-[12px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => isDeleting && handleDelete(isDeleting)}
              className="rounded-xl flex-1 h-12 font-bold text-[12px]"
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
