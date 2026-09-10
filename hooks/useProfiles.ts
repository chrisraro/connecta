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

export type SaveProfileInput = {
  /** Present when editing; absent creates a new profile. */
  id?: string | null;
  name: string;
  profile_type?: Profile["profile_type"];
  agent_info: unknown;
  layout_config: unknown;
  products?: unknown;
  services?: unknown;
  property_listings?: unknown;
  inline_projects?: unknown;
  skin?: Profile["skin"];
  show_storefront?: boolean;
};

/**
 * Create-or-update, matching the single createProfile entry point the builder
 * calls for both.
 *
 * The slug is NOT sent. It is assigned by a database trigger on insert and
 * frozen on update, because a published /<slug> is printed on a physical card
 * and must never move. Sending one from here would either be ignored or
 * rejected -- so the client does not pretend to own it.
 */
export function useSaveProfile() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveProfileInput): Promise<{ id: string; slug: string | null }> => {
      const { id, ...fields } = input;
      const payload = {
        ...fields,
        agent_info: fields.agent_info as never,
        layout_config: fields.layout_config as never,
        products: (fields.products ?? []) as never,
        services: (fields.services ?? []) as never,
        property_listings: (fields.property_listings ?? []) as never,
        inline_projects: (fields.inline_projects ?? []) as never,
      };

      if (id) {
        const { data, error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", id)
          .select("id, slug")
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("profiles")
        .insert({ ...payload, owner_id: user!.id })
        .select("id, slug")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfiles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(result.id) });
    },
  });
}

export type OnboardingInput = {
  profileCategory: string;
  email: string;
  fullName: string;
  title: string;
  company?: string;
  phone?: string;
  website?: string;
  about?: string;
  avatarUrl?: string;
  services: string[];
  socialLinks?: { platform: string; url: string }[];
  markCompleted: boolean;
};

/**
 * Saves the onboarding wizard, and on completion creates or patches the
 * profile it describes -- both in one transaction, so a snapshot can never be
 * stored without the profile that gives it meaning.
 */
export function useSaveOnboarding() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OnboardingInput): Promise<{ profileId: string | null }> => {
      const { data, error } = await supabase.rpc("save_onboarding", {
        profile_category: input.profileCategory,
        contact_email: input.email,
        full_name: input.fullName,
        job_title: input.title,
        company_name: input.company ?? undefined,
        phone: input.phone ?? undefined,
        website: input.website ?? undefined,
        about: input.about ?? undefined,
        avatar_url: input.avatarUrl ?? undefined,
        services: input.services,
        social_links: (input.socialLinks ?? []) as never,
        mark_completed: input.markCompleted,
      });
      if (error) throw error;
      return data as unknown as { profileId: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfiles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
    },
  });
}
