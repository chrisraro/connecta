"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables } from "@/lib/supabase/database.types";

export type Lead = Tables<"leads">;

/**
 * The inbox for the signed-in user. RLS scopes it to rows they own.
 *
 * NOTE: the Free-plan cap belongs HERE, not in a policy. Leads are always
 * captured regardless of plan; the plan limits only how many are VIEWABLE.
 * Expressed as a policy it would hide rows from every query including the
 * ones that count and export them, turning a display cap into data loss.
 */
export function useMyLeads() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.myLeads(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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
 * Callable while signed out -- that is the point. anon holds INSERT on exactly
 * the six columns a contact form collects, and no SELECT at all, so a
 * submitter can leave a message yet can neither read the inbox nor pre-set
 * status to bury their own inquiry.
 */
export function useCreateLead() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: NewLead) => {
      const { error } = await supabase.from("leads").insert(lead);
      if (error) throw error;
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
