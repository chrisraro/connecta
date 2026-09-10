"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables } from "@/lib/supabase/database.types";
import { PLAN_LIMITS, PLAN_GRACE_DAYS, type PlanId } from "@/lib/plans";

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

/**
 * The caller EFFECTIVE plan and its limits.
 *
 * Mirrors public.effective_plan() and convex/billing.ts:51: a stored paid plan
 * whose expiry plus the 3-day grace has passed reads as free. Derived from the
 * users row already in cache rather than fetched separately -- it is a pure
 * function of two columns.
 *
 * This is for RENDERING (which upgrade prompts to show, which templates to
 * grey out). It is not the enforcement point: the database re-derives the same
 * thing in effective_plan(), because a limit the client computes is a limit
 * anyone calling the API directly does not have.
 */
export function useMyPlan() {
  const { data: appUser, isPending } = useCurrentUser();

  const stored = (appUser?.plan ?? "free") as PlanId;
  const expiresAt = appUser?.plan_expires_at ? Date.parse(appUser.plan_expires_at) : null;
  const graceEnds = (expiresAt ?? 0) + PLAN_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const plan: PlanId = stored === "free" ? "free" : graceEnds < now ? "free" : stored;
  const inGrace = stored !== "free" && expiresAt !== null && expiresAt < now && graceEnds >= now;

  return {
    plan,
    storedPlan: stored,
    planExpiresAt: expiresAt,
    inGrace,
    limits: PLAN_LIMITS[plan] ?? PLAN_LIMITS.free,
    isPending,
  };
}
