"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { PlanId } from "@/lib/plans";

export type TeamMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "owner" | "member";
};

export type PendingInvite = { id: string; email: string; createdAt: string };

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
      return (data as unknown as MyTeam) ?? null;
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

export function useInviteMember() {
  const supabase = useSupabase();
  return useTeamMutation<string>(async (email) => {
    const { error } = await supabase.rpc("team_invite_member", { invite_email: email });
    if (error) throw error;
  });
}

export function useRevokeInvite() {
  const supabase = useSupabase();
  return useTeamMutation<string>(async (inviteId) => {
    const { error } = await supabase.rpc("team_revoke_invite", { invite_id: inviteId });
    if (error) throw error;
  });
}

export function useAcceptInvite() {
  const supabase = useSupabase();
  return useTeamMutation<string>(async (inviteId) => {
    const { error } = await supabase.rpc("team_accept_invite", { invite_id: inviteId });
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
 * Every lead across the team. Business plan, owner only.
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
