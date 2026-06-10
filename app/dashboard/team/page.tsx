"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2, UserPlus, Trash2, X, Save, Crown } from "lucide-react";
import { useEffect, useState } from "react";

export default function TeamPage() {
    const { user } = useUser();
    const data = useQuery(api.teams.getMyTeam, user?.id ? { clerkId: user.id } : {});
    const teamLeads = useQuery(api.teams.getTeamLeads, user?.id ? { clerkId: user.id } : {});

    const inviteMember = useMutation(api.teams.inviteMember);
    const removeMember = useMutation(api.teams.removeMember);
    const revokeInvite = useMutation(api.teams.revokeInvite);
    const updateBranding = useMutation(api.teams.updateTeamBranding);

    const [inviteEmail, setInviteEmail] = useState("");
    const [busy, setBusy] = useState(false);
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

    if (data === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    // Business-plan gate (also covers the signed-out null case).
    if (data === null || data.plan !== "business" || data.team === null) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Workspace</h1>
                    <p className="text-muted-foreground">Collaborate with your team under one brand.</p>
                </div>
                <EmptyState
                    icon={Building2}
                    title="Team workspace is a Business feature"
                    description="Upgrade to the Business plan to invite teammates, share branding, and view a combined team lead pool."
                    action={{ label: "Upgrade to Business", href: "/dashboard/billing" }}
                />
            </div>
        );
    }

    const team = data.team;
    const members = data.members;
    const pendingInvites = data.pendingInvites;
    const seatUsage = data.seatUsage;
    const isOwner = data.isOwner;
    const seatPct = seatUsage.total > 0 ? Math.min(100, (seatUsage.used / seatUsage.total) * 100) : 0;

    const run = async (fn: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await fn();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Action failed");
        } finally {
            setBusy(false);
        }
    };

    const handleInvite = async () => {
        const email = inviteEmail.trim();
        if (!email) return;
        await run(async () => {
            await inviteMember({ email });
            setInviteEmail("");
        });
    };

    const handleSaveBranding = () =>
        run(() =>
            updateBranding({
                name: branding.name,
                companyName: branding.companyName,
                logoUrl: branding.logoUrl,
                accentColor: branding.accentColor,
            })
        );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
                <p className="text-muted-foreground">
                    {seatUsage.used} of {seatUsage.total} seats used
                </p>
            </div>

            {/* Seat usage bar */}
            <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Seat usage</span>
                    <span className="text-muted-foreground">
                        {seatUsage.used} / {seatUsage.total}
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${seatPct}%` }} />
                </div>
            </div>

            <Tabs defaultValue="members">
                <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    {isOwner && <TabsTrigger value="leads">Lead Pool</TabsTrigger>}
                </TabsList>

                {/* Members */}
                <TabsContent value="members" className="space-y-6">
                    {isOwner && (
                        <div className="rounded-2xl border border-border bg-card p-5">
                            <Label htmlFor="invite-email" className="text-sm font-semibold">
                                Invite a teammate
                            </Label>
                            <div className="mt-2 flex gap-2">
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                    className="rounded-2xl"
                                />
                                <Button onClick={handleInvite} disabled={busy} className="rounded-2xl shrink-0">
                                    <UserPlus className="mr-2 h-4 w-4" /> Invite
                                </Button>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Existing TapFolio users join instantly. Others join when they sign in
                                with that email.
                            </p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    {isOwner && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((m) => (
                                    <TableRow key={m.userId}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{m.name || "Unnamed"}</span>
                                                <span className="text-xs text-muted-foreground">{m.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {m.role === "owner" ? (
                                                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                                                    <Crown className="h-4 w-4" /> Owner
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Member</span>
                                            )}
                                        </TableCell>
                                        {isOwner && (
                                            <TableCell className="text-right">
                                                {m.role === "member" ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            confirm("Remove this member from the team?") &&
                                                            run(() => removeMember({ memberId: m.userId as Id<"users"> }))
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {pendingInvites.length > 0 && (
                        <div className="rounded-2xl border border-border bg-card p-5">
                            <h3 className="mb-3 text-sm font-semibold">Pending invites</h3>
                            <ul className="space-y-2">
                                {pendingInvites.map((inv) => (
                                    <li
                                        key={inv._id}
                                        className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm"
                                    >
                                        <span>{inv.email}</span>
                                        {isOwner && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={busy}
                                                onClick={() =>
                                                    run(() => revokeInvite({ inviteId: inv._id as Id<"teamInvites"> }))
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </TabsContent>

                {/* Branding */}
                <TabsContent value="branding">
                    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 max-w-2xl">
                        {!isOwner && (
                            <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                Only the team owner can edit shared branding.
                            </p>
                        )}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="team-name">Team name</Label>
                                <Input
                                    id="team-name"
                                    value={branding.name}
                                    disabled={!isOwner}
                                    onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company-name">Company name</Label>
                                <Input
                                    id="company-name"
                                    value={branding.companyName}
                                    disabled={!isOwner}
                                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="logo-url">Logo URL</Label>
                                <Input
                                    id="logo-url"
                                    value={branding.logoUrl}
                                    disabled={!isOwner}
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
                                        disabled={!isOwner}
                                        placeholder="#00193c"
                                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                                    />
                                    {branding.accentColor && (
                                        <span
                                            className="h-9 w-9 shrink-0 rounded-lg border border-border"
                                            style={{ backgroundColor: branding.accentColor }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        {isOwner && (
                            <Button onClick={handleSaveBranding} disabled={busy} className="rounded-2xl">
                                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save branding
                            </Button>
                        )}
                    </div>
                </TabsContent>

                {/* Lead pool (owner only) */}
                {isOwner && (
                    <TabsContent value="leads">
                        <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            {teamLeads === undefined ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-primary w-6 h-6" />
                                </div>
                            ) : teamLeads.length === 0 ? (
                                <div className="py-12">
                                    <EmptyState
                                        icon={Building2}
                                        title="No team leads yet"
                                        description="Leads captured by any team member appear here."
                                    />
                                </div>
                            ) : (
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
                                            <TableRow key={l._id}>
                                                <TableCell className="font-medium">{l.inquirerName}</TableCell>
                                                <TableCell className="text-muted-foreground">{l.inquirerContact}</TableCell>
                                                <TableCell className="text-muted-foreground">{l.memberName}</TableCell>
                                                <TableCell className="capitalize">{l.status}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {new Date(l.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
