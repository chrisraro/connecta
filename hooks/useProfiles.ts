"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;

export function useMyProfiles() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.myProfiles(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<Profile[]> => {
      // Filtered explicitly by owner even though RLS would normally do it.
      // profiles are PUBLICLY readable -- the whole product is a card handed
      // to a stranger -- so here RLS is not a filter, and a query meaning
      // "mine" has to say so. Leaving it off lists every profile there is.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfile(profileId: string | undefined | null) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.profile(profileId ?? ""),
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfileBySlug(slug: string | undefined) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.profileBySlug(slug ?? ""),
    enabled: Boolean(slug),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProfile() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"profiles">, "owner_id">): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .insert({ ...input, owner_id: user!.id })
        .select()
        .single();
      // The free-plan cap is a trigger, so this rejects with detail
      // PLAN_LIMIT and isPlanLimitError routes it to the upgrade CTA.
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfiles() });
    },
  });
}

export function useUpdateProfile() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"profiles"> }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfiles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(variables.id) });
    },
  });
}

export function useDeleteProfile() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfiles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.myCards() });
    },
  });
}
