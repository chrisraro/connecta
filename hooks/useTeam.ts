"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import { toPlanId, type PlanId } from "@/lib/plans";

export type TeamMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "owner" | "member";
};

export type PendingInvite = { id: string; email: string; createdAt: string };

/** An invite addressed to the signed-in caller -- what get_my_invites() returns. */
export type MyInvite = {
  id: string;
  teamId: string;
  teamName: string;
  ownerName: string | null;
  invitedAt: string;
};

export type MyTeam = {
  plan: PlanId;
  isOwner: boolean;
  team: {
    id: string;
    name: string;
    companyName: string | null;
    logoUrl: string | null;
    accentColor: string | null;
    seats: number;
    ownerId: string;
  } | null;
  members: TeamMember[];
  pendingInvites: PendingInvite[];
  seatUsage: { used: number; total: number };
};

/**
 * The whole team view in one call.
 *
 * An aggregate rather than separate member/invite/seat queries: the seat
 * counter is rendered beside the member list, and reads taken at different
 * instants can disagree -- "3 of 3 seats used" above four members is an
 * inconsistency nobody can debug from a screenshot.
 */
export function useMyTeam() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.myTeam(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<MyTeam | null> => {
      const { data, error } = await supabase.rpc("get_my_team");
      if (error) throw error;
      const team = (data as unknown as MyTeam) ?? null;
      return team && { ...team, plan: toPlanId(team.plan) };
    },
  });
}

function useTeamMutation<TArgs>(fn: (args: TArgs) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTeam() });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
    },
  });
}

export type InviteMemberResult = {
  inviteId: string;
  hasAccount: boolean;
  emailSent: boolean;
  warning?: string;
};

/**
 * POSTs to /api/team/invite rather than calling team_invite_member directly:
 * deciding whether to send Supabase's invite email needs the service-role
 * client, which the browser must never hold. See that route for the full
 * reasoning. Errors from the route arrive shaped like a PostgrestError
 * ({ message, details, code }) so the existing toUserMessage/errorCode
 * helpers keep working unchanged at the call site.
 */
export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<InviteMemberResult> => {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw Object.assign(new Error(json.message ?? json.error ?? "Could not send the invite."), {
          details: json.details,
          code: json.code,
        });
      }
      return json as InviteMemberResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTeam() });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
    },
  });
}

export function useRevokeInvite() {
  const supabase = useSupabase();
  return useTeamMutation<string>(async (inviteId) => {
    const { error } = await supabase.rpc("team_revoke_invite", { invite_id: inviteId });
    if (error) throw error;
  });
}

/**
 * The signed-in caller's own pending invites -- what the InviteBanner
 * renders. A separate query from useMyTeam(): an invite to join a DIFFERENT
 * team is visible whether or not the caller is already on one (they may be
 * choosing between the two), and get_my_team()'s pendingInvites are the
 * OWNER'S outgoing invites, not the caller's own incoming ones.
 */
export function useMyInvites() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.myInvites(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<MyInvite[]> => {
      const { data, error } = await supabase.rpc("get_my_invites");
      if (error) throw error;
      return (data as unknown as MyInvite[]) ?? [];
    },
  });
}

function useMyInvitesMutation<TArgs>(fn: (args: TArgs) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myInvites() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTeam() });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
    },
  });
}

export function useAcceptInvite() {
  const supabase = useSupabase();
  return useMyInvitesMutation<string>(async (inviteId) => {
    const { error } = await supabase.rpc("team_accept_invite", { invite_id: inviteId });
    if (error) throw error;
  });
}

export function useDeclineInvite() {
  const supabase = useSupabase();
  return useMyInvitesMutation<string>(async (inviteId) => {
    const { error } = await supabase.rpc("team_decline_invite", { invite_id: inviteId });
    if (error) throw error;
  });
}

export function useRemoveMember() {
  const supabase = useSupabase();
  return useTeamMutation<string>(async (memberId) => {
    const { error } = await supabase.rpc("team_remove_member", { member_id: memberId });
    if (error) throw error;
  });
}

/**
 * A member leaving their own team. team_remove_member allows self-removal
 * (20260911000020) -- this is that same RPC, just named for what a member
 * actually does with it, so the Team page doesn't call "removeMember(myId)"
 * and make a reader wonder who is removing whom.
 */
export function useLeaveTeam() {
  const supabase = useSupabase();
  const { user } = useAuth();
  return useTeamMutation<void>(async () => {
    if (!user) throw new Error("You must be signed in.");
    const { error } = await supabase.rpc("team_remove_member", { member_id: user.id });
    if (error) throw error;
  });
}

/** Branding is an ordinary owner-scoped update; teams_write_owner covers it. */
export function useUpdateTeamBranding() {
  const supabase = useSupabase();
  return useTeamMutation<{
    teamId: string;
    name?: string;
    companyName?: string | null;
    logoUrl?: string | null;
    accentColor?: string | null;
  }>(async ({ teamId, ...patch }) => {
    const { error } = await supabase
      .from("teams")
      .update({
        ...(patch.name === undefined ? {} : { name: patch.name }),
        company_name: patch.companyName,
        logo_url: patch.logoUrl,
        accent_color: patch.accentColor,
      })
      .eq("id", teamId);
    if (error) throw error;
  });
}

export type TeamLead = {
  id: string;
  inquirerName: string;
  inquirerContact: string;
  message: string | null;
  status: "new" | "contacted" | "closed";
  createdAt: string;
  ownerName: string | null;
};

/**
 * Every lead across the team. Teams plan, owner only.
 *
 * Returns an empty list rather than raising when the caller is not entitled:
 * the page renders it as a section that is simply absent, and an error here
 * would look like a fault rather than a tier boundary.
 */
export function useTeamLeads() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: ["team", "leads"],
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<TeamLead[]> => {
      const { data, error } = await supabase.rpc("get_team_leads");
      if (error) throw error;
      return (data as unknown as TeamLead[]) ?? [];
    },
  });
}
