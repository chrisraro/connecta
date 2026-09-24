"use client";

import { Loader2, ShieldCheck, User, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  useAdminUsers,
  useAdminGrants,
  useAdminCards,
  useGrantAdminRole,
  useRevokeAdminRole,
  useSetUserPlan,
  useSetUserSuspended,
  type AdminUserRow,
} from "@/hooks/useAdmin";
import { useAuth } from "@/components/auth/AuthProvider";
import { toUserMessage } from "@/lib/errors";
import { PLAN_GRACE_DAYS } from "@/lib/plans";

// Paid-plan grants offered in the Manage menu. Renewing the same plan extends
// from the current expiry, so "30 days" on an active Pro adds 30 more.
const PLAN_GRANTS = [
  { plan: "pro", days: 30, label: "Pro · 30 days" },
  { plan: "pro", days: 365, label: "Pro · 1 year" },
  { plan: "business", days: 30, label: "Business · 30 days" },
  { plan: "business", days: 365, label: "Business · 1 year" },
] as const;

/** Past expiry plus grace: the account is served as Free whatever it stores. */
function planLapsed(u: AdminUserRow) {
  if (u.plan === "free" || !u.plan_expires_at) return false;
  return Date.parse(u.plan_expires_at) + PLAN_GRACE_DAYS * 86_400_000 < Date.now();
}

export default function AdminUsersPage() {
  const { user, isLoaded } = useAuth();
  const { data: usersList } = useAdminUsers();
  const { data: grants } = useAdminGrants();
  // Cards per owner, counted from the same list the factory shows. The
  // Convex query enriched each user row with this; one grouped read is
  // cheaper than a per-row count and stays consistent across the table.
  const { data: allCards } = useAdminCards();
  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of allCards ?? []) {
      if (card.owner_id) counts[card.owner_id] = (counts[card.owner_id] ?? 0) + 1;
    }
    return counts;
  }, [allCards]);

  const grantAdminRole = useGrantAdminRole().mutateAsync;
  const revokeAdminRole = useRevokeAdminRole().mutateAsync;
  const setUserSuspended = useSetUserSuspended().mutateAsync;
  const setUserPlan = useSetUserPlan().mutateAsync;

  const [busyId, setBusyId] = useState<string | null>(null);

  // The caller's own live grant, from the roster we already load.
  const myGrant = grants?.find((g) => g.user_id === user?.id);
  const isSuperadmin = myGrant?.role === "superadmin";
  const myUserId = user?.id;

  if (!isLoaded || !usersList || !grants) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-destructive w-8 h-8" />
      </div>
    );
  }

  // Errors go through toUserMessage, not error.message: a raw PostgREST
  // failure names tables and policies, and alert() blocked the whole console.
  const run = async (id: string, fn: () => Promise<unknown>, done?: string) => {
    setBusyId(id);
    try {
      await fn();
      if (done) toast.success(done);
    } catch (error) {
      console.error(error);
      toast.error(toUserMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPlan = (u: AdminUserRow, plan: "free" | "pro" | "business", days = 30) => {
    const who = u.name || u.email || "this user";
    const question =
      plan === "free"
        ? `Downgrade ${who} to Free? Paid features stop immediately; their team is kept.`
        : `Give ${who} ${plan === "pro" ? "Pro" : "Business"} for ${days} days?` +
          (u.plan === plan && !planLapsed(u) ? " This extends their current expiry." : "");
    if (!confirm(question)) return;
    run(
      u.id,
      () => setUserPlan({ userId: u.id, plan, periodDays: days }),
      plan === "free" ? `${who} is now on Free` : `${who} is now on ${plan} for ${days} days`,
    );
  };

  const handleGrant = (targetUserId: string, role: "superadmin" | "moderator") =>
    run(targetUserId, () => grantAdminRole({ userId: targetUserId, role }));

  const handleRevoke = (targetUserId: string) => {
    if (!confirm("Revoke admin access for this user?")) return;
    run(targetUserId, () => revokeAdminRole({ userId: targetUserId }));
  };

  const handleSuspend = (targetUserId: string, suspended: boolean) => {
    if (!confirm(suspended ? "Suspend this user?" : "Reactivate this user?")) return;
    run(targetUserId, () => setUserSuspended({ userId: targetUserId, suspended }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          {/* api.admin.getAllUsers caps at ADMIN_USER_LIST_CAP (500, convex/admin.ts) */}
          {usersList.length >= 500 && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing first {usersList.length} users (list is capped)
            </p>
          )}
        </div>
        {isSuperadmin && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
            <ShieldCheck className="w-3 h-3" /> Superadmin
          </Badge>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Account</TableHead>
              <TableHead className="text-muted-foreground">Role</TableHead>
              <TableHead className="text-muted-foreground">Plan</TableHead>
              <TableHead className="text-muted-foreground">Cards</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersList.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              usersList.map((u) => {
                const isSelf = u.id === myUserId;
                const isSuspended = u.subscription_status === "suspended";
                // Admin status comes from the admins roster, never users.role:
                // no grant path writes users.role (see app/admin/layout.tsx),
                // so reading it showed every admin as an Agent, hid "Revoke
                // admin", and offered "Grant moderator" on a superadmin's own
                // row -- which, since granting updates an existing role, was
                // a one-click self-demotion.
                const grant = grants.find((g) => g.user_id === u.id);
                return (
                  <TableRow
                    key={u.id}
                    className="border-border hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{u.name || "Unnamed"}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {grant ? (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20 gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" /> {grant.role}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-muted text-foreground border-border gap-1"
                        >
                          <User className="w-3 h-3" /> Agent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge
                          variant="outline"
                          className={
                            u.plan === "business"
                              ? "bg-primary text-primary-foreground border-primary w-fit capitalize"
                              : u.plan === "pro"
                                ? "bg-primary/10 text-primary border-primary/20 w-fit capitalize"
                                : "bg-muted text-foreground border-border w-fit capitalize"
                          }
                        >
                          {u.plan}
                        </Badge>
                        {u.plan !== "free" &&
                          u.plan_expires_at &&
                          (planLapsed(u) ? (
                            // Stored plan says paid, but it is served as Free.
                            // Saying "until <past date>" would contradict what
                            // the customer actually gets.
                            <span className="mt-1 text-[10px] text-[var(--connecta-mark-text)]">
                              lapsed {new Date(u.plan_expires_at).toLocaleDateString()} · on Free
                            </span>
                          ) : (
                            <span className="mt-1 text-[10px] text-muted-foreground">
                              until {new Date(u.plan_expires_at).toLocaleDateString()}
                            </span>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-mono">
                      {cardCounts[u.id] ?? 0}
                    </TableCell>
                    <TableCell>
                      {isSuspended ? (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                          Suspended
                        </Badge>
                      ) : u.onboarding_completed ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                          Onboarded
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-[var(--connecta-mark)]/10 text-[var(--connecta-mark-text)] hover:bg-[var(--connecta-mark)]/20 border-[var(--connecta-mark-text)]/20"
                        >
                          Pending Setup
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSuperadmin ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={busyId === u.id}>
                              {busyId === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-card border-border text-foreground"
                          >
                            <DropdownMenuLabel>Manage</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-muted" />
                            {grant ? (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => handleRevoke(u.id as string)}
                                className="text-destructive focus:text-destructive"
                              >
                                Revoke admin{isSelf ? " (self)" : ""}
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleGrant(u.id as string, "moderator")}
                                >
                                  Grant moderator
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleGrant(u.id as string, "superadmin")}
                                >
                                  Grant superadmin
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Plan
                            </DropdownMenuLabel>
                            {PLAN_GRANTS.map((g) => (
                              <DropdownMenuItem
                                key={g.label}
                                onClick={() => handleSetPlan(u, g.plan, g.days)}
                              >
                                {g.label}
                              </DropdownMenuItem>
                            ))}
                            {u.plan !== "free" && (
                              <DropdownMenuItem onClick={() => handleSetPlan(u, "free")}>
                                Downgrade to Free
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-muted" />
                            {isSuspended ? (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => handleSuspend(u.id as string, false)}
                              >
                                Reactivate user
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => handleSuspend(u.id as string, true)}
                                className="text-destructive focus:text-destructive"
                              >
                                Suspend user{isSelf ? " (self)" : ""}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isSuperadmin && (
        <p className="text-xs text-muted-foreground mt-4">
          Admin grants, plan changes, and user suspension require superadmin access.
        </p>
      )}
    </div>
  );
}
