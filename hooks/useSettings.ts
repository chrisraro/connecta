"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { queryKeys } from "@/lib/db/keys";
import { DEFAULT_PLAN_PRICING, type PlanPricing } from "@/lib/plans";

const PLAN_PRICING_KEY = "planPricing";

/**
 * Plan pricing, read from the settings table.
 *
 * Falls back to the compiled defaults when the row is absent or malformed,
 * exactly as convex/billing.ts:33 did. Pricing that renders as blank or NaN
 * because a settings row is missing is worse than pricing that is merely out
 * of date -- the page still has to say a number.
 *
 * This row must be marked is_public for signed-out visitors to read it; see
 * the settings migration for why that flag defaults to false.
 */
export function usePlanPricing() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.settings(PLAN_PRICING_KEY),
    queryFn: async (): Promise<PlanPricing> => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", PLAN_PRICING_KEY)
        .maybeSingle();
      if (error) throw error;

      const stored = (data?.value ?? {}) as Partial<PlanPricing>;
      return {
        pro:
          typeof stored.pro === "number" && stored.pro >= 0 ? stored.pro : DEFAULT_PLAN_PRICING.pro,
        business:
          typeof stored.business === "number" && stored.business >= 0
            ? stored.business
            : DEFAULT_PLAN_PRICING.business,
      };
    },
  });
}

/** Upsert a settings row. Admin-only, enforced by settings_write_admin. */
export function useUpdateSetting() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      isPublic,
    }: {
      key: string;
      value: unknown;
      isPublic?: boolean;
    }) => {
      const { error } = await supabase.from("settings").upsert(
        {
          key,
          value: value as never,
          ...(isPublic === undefined ? {} : { is_public: isPublic }),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings(variables.key) });
    },
  });
}
