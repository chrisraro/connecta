"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables } from "@/lib/supabase/database.types";

export type AppUser = Tables<"users">;

/**
 * The public.users row for the signed-in account.
 *
 * Distinct from useAuth(), which returns the Supabase AUTH user (identity,
 * email, tokens). This is the application record: plan, onboarding state,
 * team. Both share an id by design -- see migration 20260911000002 -- so no
 * translation step exists between them.
 */
export function useCurrentUser() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.currentUser(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<AppUser | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Whether the signed-in user holds a live admin grant.
 *
 * Asks the database rather than reading a claim off the token. A token claim
 * is a snapshot: revoking admin would not take effect until the token expired,
 * which is the wrong direction to be wrong in.
 */
export function useIsAdmin() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.isAdmin(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return Boolean(data);
    },
  });
}
