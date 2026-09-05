"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import { useState } from "react";

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser();
  const usersList = useQuery(api.admin.getAllUsers, user?.id ? { clerkId: user.id } : "skip");
  const adminStatus = useQuery(
    api.admin.checkAdminStatus,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const grantAdminRole = useMutation(api.admin.grantAdminRole);
  const revokeAdminRole = useMutation(api.admin.revokeAdminRole);
  const setUserSuspended = useMutation(api.admin.setUserSuspended);

  const [busyId, setBusyId] = useState<string | null>(null);

  const isSuperadmin = adminStatus?.role === "superadmin";
  const myUserId = adminStatus?.userId;

  if (!isLoaded || usersList === undefined || adminStatus === undefined) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-red-600 w-8 h-8" />
      </div>
    );
  }

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleGrant = (targetUserId: Id<"users">, role: "superadmin" | "moderator") =>
    run(targetUserId, () => grantAdminRole({ adminClerkId: user!.id, targetUserId, role }));

  const handleRevoke = (targetUserId: Id<"users">) => {
    if (!confirm("Revoke admin access for this user?")) return;
    run(targetUserId, () => revokeAdminRole({ adminClerkId: user!.id, targetUserId }));
  };

  const handleSuspend = (targetUserId: Id<"users">, suspended: boolean) => {
    if (!confirm(suspended ? "Suspend this user?" : "Reactivate this user?")) return;
    run(targetUserId, () => setUserSuspended({ adminClerkId: user!.id, targetUserId, suspended }));
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
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
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
              <TableHead className="text-muted-foreground">Orders</TableHead>
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
                const isSuspended = u.subscriptionStatus === "suspended";
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
                      {u.role === "admin" ? (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-500 border-red-500/20 gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" /> {u.adminRole || "Admin"}
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
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 w-fit capitalize"
                              : u.plan === "pro"
                                ? "bg-primary/10 text-primary border-primary/20 w-fit capitalize"
                                : "bg-muted text-foreground border-border w-fit capitalize"
                          }
                        >
                          {u.plan}
                        </Badge>
                        {u.plan !== "free" && u.planExpiresAt && (
                          <span className="mt-1 text-[10px] text-muted-foreground">
                            until {new Date(u.planExpiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground font-mono">{u.cardCount}</TableCell>
                    <TableCell className="text-foreground font-mono">{u.orderCount}</TableCell>
                    <TableCell>
                      {isSuspended ? (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">
                          Suspended
                        </Badge>
                      ) : u.onboardingCompleted ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                          Onboarded
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20"
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
                            {u.role === "admin" ? (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => handleRevoke(u.id as Id<"users">)}
                                className="text-red-400 focus:text-red-400"
                              >
                                Revoke admin{isSelf ? " (self)" : ""}
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleGrant(u.id as Id<"users">, "moderator")}
                                >
                                  Grant moderator
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleGrant(u.id as Id<"users">, "superadmin")}
                                >
                                  Grant superadmin
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator className="bg-muted" />
                            {isSuspended ? (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => handleSuspend(u.id as Id<"users">, false)}
                              >
                                Reactivate user
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => handleSuspend(u.id as Id<"users">, true)}
                                className="text-red-400 focus:text-red-400"
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
          Admin grants, revocations, and user suspension require superadmin access.
        </p>
      )}
    </div>
  );
}
