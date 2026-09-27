"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMyInvites, useAcceptInvite, useDeclineInvite, type MyInvite } from "@/hooks/useTeam";
import { inviteBannerText } from "@/lib/team";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

/**
 * The pending team-invite banner (owner decision, 2026-09-27): every invite
 * is consent now -- team_invite_member never sets team_id directly -- so an
 * invited person sees it here until they Accept or Decline. Exported so the
 * dashboard overview, the Team page, and the onboarding rewrite can all
 * render it. Renders nothing while loading or when there is nothing
 * pending, so it is safe to mount unconditionally on any page.
 */
export function InviteBanner() {
  const { data: invites } = useMyInvites();
  const acceptInvite = useAcceptInvite().mutateAsync;
  const declineInvite = useDeclineInvite().mutateAsync;
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!invites || invites.length === 0) return null;

  const respond = async (invite: MyInvite, action: "accept" | "decline") => {
    setBusyId(invite.id);
    try {
      if (action === "accept") {
        await acceptInvite(invite.id);
        toast.success(`You joined ${invite.teamName}`);
      } else {
        await declineInvite(invite.id);
        toast.success("Invite declined");
      }
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex flex-col gap-4 border-[1.5px] border-input bg-background p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm">
            {inviteBannerText({ ownerName: invite.ownerName ?? "Someone", teamName: invite.teamName })}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => respond(invite, "accept")} disabled={busyId === invite.id}>
              {busyId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Accept"}
            </Button>
            <Button
              variant="outline"
              onClick={() => respond(invite, "decline")}
              disabled={busyId === invite.id}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
