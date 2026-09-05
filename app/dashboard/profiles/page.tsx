"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
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
  Users,
  Trash2,
  Edit2,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { AccessCard } from "@/components/profile-builder/AccessCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { Id } from "@/convex/_generated/dataModel";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { profilePath } from "@/lib/profileUrl";
import { resolveBuilderEntryRedirect } from "@/lib/builderEntry";

export default function ProfilesPage() {
  const { user } = useUser();
  const profiles = useQuery(api.profiles.getMyProfiles, user?.id ? { clerkId: user.id } : "skip");
  // Needed for the "Create" CTAs below — see createProfileHref. Also
  // covers editing (getProfile enforces plan limits server-side; this
  // just decides where the buttons on THIS page point).
  const myPlan = useQuery(api.billing.getMyPlan, user?.id ? { clerkId: user.id } : "skip");
  const deleteProfile = useMutation(api.profiles.deleteProfile);

  const [activeChip, setActiveChip] = useState("All");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
      await deleteProfile({ profileId: profileId as Id<"profiles">, clerkId: user.id });
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
            <Button
              size="icon"
              className="rounded-full h-10 w-10 bg-primary text-primary-foreground shadow-lg"
            >
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
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${
              activeChip === chip
                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                : "bg-muted border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card backdrop-blur-sm">
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
          {profiles.map((profile) => (
            <Card
              key={profile._id}
              className="overflow-hidden border-border bg-card backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group rounded-[2rem] relative"
            >
              <div
                className="h-32 w-full relative"
                style={{ backgroundColor: profile.layoutConfig.colorPalette.primary }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm uppercase tracking-wider">
                    {profile.layoutConfig.themeId}
                  </span>
                </div>

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
                        <Link href={`/dashboard/builder?id=${profile._id}`}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-xl cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => setIsDeleting(profile._id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {profile.agentInfo.avatarUrl && (
                <div className="flex justify-center -mt-8 relative z-10">
                  <ProfileImage
                    src={profile.agentInfo.avatarUrl}
                    alt="avatar"
                    fallbackSeed={profile.agentInfo.fullName || profile.name}
                    className="w-16 h-16 rounded-full overflow-hidden object-cover border-4 border-card shadow-lg"
                  />
                </div>
              )}
              {!profile.agentInfo.avatarUrl && (
                <div className="flex justify-center -mt-8 relative z-10">
                  <ProfileImage
                    src={undefined}
                    alt="avatar"
                    fallbackSeed={profile.agentInfo.fullName || profile.name}
                    className="w-16 h-16 rounded-full overflow-hidden object-cover border-4 border-card shadow-lg"
                  />
                </div>
              )}

              <CardHeader className="pt-2 pb-2 text-center">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground">
                  {profile.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium">
                  {profile.agentInfo.fullName}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6 text-center">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Profile
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3 pt-0 pb-6 px-6">
                <Link href={profilePath(profile)} target="_blank" className="flex-1 min-w-[100px]">
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl border-border hover:bg-muted transition-all h-11"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </Link>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="flex-1 min-w-[100px] rounded-2xl bg-muted text-foreground hover:bg-muted/80 transition-all h-11"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card/90 backdrop-blur-2xl border-border p-0 overflow-hidden border-0 shadow-none flex flex-col items-center justify-center gap-6">
                    <DialogHeader className="sr-only">
                      <DialogTitle>Access Card for {profile.name}</DialogTitle>
                    </DialogHeader>

                    <div className="w-full flex justify-center pt-8 px-4">
                      <AccessCard
                        profileId={profile._id}
                        profileSlug={profile.slug}
                        agent={profile.agentInfo}
                      />
                    </div>

                    <div className="pb-8 px-4 w-full flex justify-center">
                      <DialogClose asChild>
                        <Button
                          variant="outline"
                          className="rounded-full px-10 h-12 bg-muted border-border text-foreground hover:bg-muted/80 font-black uppercase tracking-widest text-xs"
                        >
                          Dismiss
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <DialogContent className="rounded-[2rem] border-border bg-card p-6 sm:max-w-md">
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
              className="rounded-xl flex-1 h-12 font-bold uppercase tracking-widest text-[10px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => isDeleting && handleDelete(isDeleting)}
              className="rounded-xl flex-1 h-12 font-bold uppercase tracking-widest text-[10px]"
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
