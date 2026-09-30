"use client";

import {
  useMyTeam,
  useTeamLeads,
  useInviteMember,
  useRemoveMember,
  useRevokeInvite,
  useUpdateTeamBranding,
  useLeaveTeam,
} from "@/hooks/useTeam";
import { teamGateFor, seatUsagePercent, canInviteMore } from "@/lib/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanPanel } from "@/components/survey/PlanPanel";
import { InviteBanner } from "@/components/team/InviteBanner";
import { PlanUpgradeButton } from "@/components/billing/PlanUpgradeButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Loader2, UserPlus, Trash2, X, Save, Crown, LogOut } from "lucide-react";
import { CONNECTA } from "@/lib/brand";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export default function TeamPage() {
  const { data } = useMyTeam();
  const { data: teamLeads } = useTeamLeads();

  const inviteMember = useInviteMember().mutateAsync;
  const removeMember = useRemoveMember().mutateAsync;
  const revokeInvite = useRevokeInvite().mutateAsync;
  const updateBrandingMutation = useUpdateTeamBranding().mutateAsync;
  const leaveTeam = useLeaveTeam().mutateAsync;

  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [branding, setBranding] = useState({
    name: "",
    companyName: "",
    logoUrl: "",
    accentColor: "",
  });

  const teamObj = data && data.team ? data.team : null;

  useEffect(() => {
    if (teamObj) {
      setBranding({
        name: teamObj.name ?? "",
        companyName: teamObj.companyName ?? "",
        logoUrl: teamObj.logoUrl ?? "",
        accentColor: teamObj.accentColor ?? "",
      });
    }
  }, [teamObj]);

  const gate = teamGateFor(data);

  const run = async (fn: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    try {
      await fn();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (gate === "loading") {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  if (gate === "upgrade") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold [font-stretch:112%]">Team</h1>
          <p className="text-muted-foreground">Collaborate with your team under one brand.</p>
        </div>
        <InviteBanner />
        <EmptyState
          icon={Building2}
          title="Team is a Teams-plan feature"
          description="Upgrade to Teams to invite teammates, share branding, and see one team lead pool."
        />
        <div className="flex justify-center">
          <PlanUpgradeButton label="Upgrade to Teams" />
        </div>
      </div>
    );
  }

  // gate === "active": data, data.team and data.isOwner are all present.
  const team = data!.team!;
  const isOwner = data!.isOwner;
  const members = data!.members;
  const pendingInvites = data!.pendingInvites;
  const seatUsage = data!.seatUsage;
  const seatPct = seatUsagePercent(seatUsage);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setBusy(true);
    try {
      const result = await inviteMember(email);
      setInviteEmail("");
      if (result.warning) {
        toast.warning(result.warning);
      } else if (result.hasAccount) {
        toast.success("Invite sent — they'll see it next time they sign in.");
      } else {
        toast.success("Invite email sent");
      }
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBranding = () =>
    run(
      () =>
        updateBrandingMutation({
          teamId: team.id,
          name: branding.name,
          companyName: branding.companyName,
          logoUrl: branding.logoUrl,
          accentColor: branding.accentColor,
        }),
      "Branding saved",
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold [font-stretch:112%]">{team.name}</h1>
        <p className="text-muted-foreground">
          {seatUsage.used} of {seatUsage.total} seats used
        </p>
      </div>

      <InviteBanner />

      {!isOwner ? (
        <MemberView team={team} members={members} busy={busy} onLeave={() => setConfirmLeave(true)} />
      ) : (
        <>
          {/* Seat usage */}
          <PlanPanel heading="Seat usage">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Seats</span>
              <span className="text-muted-foreground">
                {seatUsage.used} / {seatUsage.total}
              </span>
            </div>
            <div className="h-2 w-full border-[1.5px] border-input">
              <div className="h-full bg-primary" style={{ width: `${seatPct}%` }} />
            </div>
          </PlanPanel>

          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="leads">Lead pool</TabsTrigger>
            </TabsList>

            {/* Members */}
            <TabsContent value="members" className="space-y-6 pt-2">
              <PlanPanel heading="Invite a teammate">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  />
                  <Button
                    onClick={handleInvite}
                    disabled={busy || !canInviteMore(seatUsage)}
                    className="shrink-0 gap-2"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Invite
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {canInviteMore(seatUsage)
                    ? `Someone new gets an email to join. Someone who already has a ${CONNECTA.name} account sees the invite next time they sign in, and can accept or decline it.`
                    : "No seats available. Remove a member or revoke a pending invite to free one up."}
                </p>
              </PlanPanel>

              <PlanPanel heading="Members">
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-3 border-[1.5px] border-input p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.name || "Unnamed"}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {m.role === "owner" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                            Owner
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Member</span>
                        )}
                        {m.role === "member" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => setConfirmRemoveMemberId(m.userId as string)}
                            aria-label={`Remove ${m.name || m.email}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </PlanPanel>

              {pendingInvites.length > 0 && (
                <PlanPanel heading="Pending invites">
                  <div className="space-y-3">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-3 border-[1.5px] border-input p-4 text-sm"
                      >
                        <span className="min-w-0 truncate">{inv.email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          onClick={() => run(() => revokeInvite(inv.id), "Invite revoked")}
                          aria-label={`Revoke invite to ${inv.email}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </PlanPanel>
              )}
            </TabsContent>

            {/* Branding */}
            <TabsContent value="branding" className="pt-2">
              <PlanPanel heading="Shared branding" className="max-w-2xl">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input
                      id="team-name"
                      value={branding.name}
                      onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company name</Label>
                    <Input
                      id="company-name"
                      value={branding.companyName}
                      onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo-url">Logo URL</Label>
                    <Input
                      id="logo-url"
                      value={branding.logoUrl}
                      placeholder="https://…"
                      onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent">Accent color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="accent"
                        value={branding.accentColor}
                        placeholder="#00193c"
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      />
                      {branding.accentColor && (
                        <span
                          className="h-9 w-9 shrink-0 border-[1.5px] border-input"
                          style={{ backgroundColor: branding.accentColor }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveBranding} disabled={busy} className="mt-5 gap-2">
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  Save branding
                </Button>
              </PlanPanel>
            </TabsContent>

            {/* Lead pool */}
            <TabsContent value="leads" className="pt-2">
              <PlanPanel heading="Lead pool">
                {teamLeads === undefined ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-primary w-6 h-6" aria-hidden="true" />
                  </div>
                ) : teamLeads.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No team leads yet"
                    description="Leads captured by any team member appear here."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Inquirer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamLeads.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.inquirerName}</TableCell>
                            <TableCell className="text-muted-foreground">{l.inquirerContact}</TableCell>
                            <TableCell className="text-muted-foreground">{l.ownerName}</TableCell>
                            <TableCell className="capitalize">{l.status}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {new Date(l.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </PlanPanel>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AlertDialog
        open={confirmRemoveMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveMemberId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this team&apos;s workspace and lead pool immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const memberId = confirmRemoveMemberId;
                setConfirmRemoveMemberId(null);
                if (memberId) run(() => removeMember(memberId), "Member removed");
              }}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this team?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to the team&apos;s branding and lead pool immediately. You can be
              invited back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeave(false);
                run(() => leaveTeam(), "You left the team");
              }}
            >
              Leave team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type MemberViewTeam = {
  id: string;
  name: string;
  companyName: string | null;
  ownerId: string;
};

export type MemberViewMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "owner" | "member";
};

/**
 * A member's read-only view: team name, owner, the roster, and the one
 * action they actually have -- leaving. Owner-only tabs (invite, branding,
 * lead pool) never render here.
 */
export function MemberView({
  team,
  members,
  busy,
  onLeave,
}: {
  team: MemberViewTeam;
  members: MemberViewMember[];
  busy: boolean;
  onLeave: () => void;
}) {
  const owner = members.find((m) => m.role === "owner");

  return (
    <div className="space-y-6">
      <PlanPanel heading="This team">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Team</dt>
            <dd className="text-sm font-semibold break-words">{team.companyName || team.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Owner</dt>
            <dd className="text-sm font-semibold break-all">{owner?.name || owner?.email || "—"}</dd>
          </div>
        </dl>
      </PlanPanel>

      <PlanPanel heading="Members">
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between gap-3 border-[1.5px] border-input p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{m.name || "Unnamed"}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.role === "owner" ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  Owner
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">Member</span>
              )}
            </div>
          ))}
        </div>
      </PlanPanel>

      <Button variant="outline" onClick={onLeave} disabled={busy} className="gap-2">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Leave team
      </Button>
    </div>
  );
}
