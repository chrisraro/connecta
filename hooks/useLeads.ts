"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables } from "@/lib/supabase/database.types";
import { useCurrentUser, useMyPlan } from "@/hooks/useCurrentUser";

export type Lead = Tables<"leads">;

export type LeadsView = {
  /** The leads this plan may actually see, newest first. */
  leads: Lead[];
  /** Captured but hidden behind an upgrade. Never lost, just not shown. */
  lockedCount: number;
  leadViewCap: number | null;
  canExport: boolean;
};

/**
 * The inbox for the signed-in user. RLS scopes the rows to their own.
 *
 * The Free-plan cap is applied HERE, in the read, and deliberately NOT as an
 * RLS policy. Leads are ALWAYS captured regardless of plan -- the plan limits
 * only how many are VIEWABLE (convex/leads.ts:118). As a policy it would hide
 * rows from every query including the ones that count and export them, turning
 * a display cap into silent data loss: a user upgrading would find the older
 * leads had never existed.
 *
 * lockedCount is what the upgrade prompt counts, so the person can see exactly
 * what they are being asked to pay for.
 */
export function useMyLeads() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();
  const { data: appUser } = useCurrentUser();
  // The EFFECTIVE plan, not the stored one: an expired Pro past its grace
  // period must fall back to the Free view cap, or the inbox stays unlocked
  // forever after one payment.
  const { plan, limits } = useMyPlan();

  return useQuery({
    queryKey: [...queryKeys.myLeads(), plan],
    enabled: isLoaded && Boolean(user) && Boolean(appUser),
    queryFn: async (): Promise<LeadsView> => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const all = data ?? [];
      const cap = limits.leadViewCap;
      if (cap !== null && all.length > cap) {
        return {
          leads: all.slice(0, cap),
          lockedCount: all.length - cap,
          leadViewCap: cap,
          canExport: limits.canExportLeads,
        };
      }
      return {
        leads: all,
        lockedCount: 0,
        leadViewCap: cap,
        canExport: limits.canExportLeads,
      };
    },
  });
}

export type NewLead = {
  owner_id: string;
  inquirer_name: string;
  inquirer_contact: string;
  message?: string | null;
  property_id?: string | null;
  property_name?: string | null;
};

/**
 * Submit an inquiry from a public profile.
 *
 * Callable while signed out -- that is the point. It goes through /api/leads,
 * not a direct insert: the route applies the per-visitor and per-owner rate
 * limits and emails the owner, neither of which a browser can be trusted with
 * (20260924000023). Clients hold no INSERT on leads at all.
 *
 * Failures arrive in PostgREST shape ({ message, details, code }), so
 * toUserMessage and errorCode read them exactly as they would a direct call.
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: NewLead) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!res.ok) {
        throw await res
          .json()
          .catch(() => ({ message: "Something went wrong. Please try again." }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myLeads() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myNotifications() });
    },
  });
}

export function useUpdateLeadStatus() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Lead["status"] }) => {
      const patch: { status: Lead["status"]; last_contacted_at?: string } = { status };
      if (status === "contacted") patch.last_contacted_at = new Date().toISOString();
      const { error } = await supabase.from("leads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myLeads() });
    },
  });
}

export function useDeleteLead() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myLeads() });
    },
  });
}
