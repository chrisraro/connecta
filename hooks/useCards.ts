"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables } from "@/lib/supabase/database.types";

export type Card = Tables<"cards">;

/** Cards the signed-in user has claimed. RLS scopes this to them. */
export function useMyCards() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.myCards(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<Card[]> => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type TapCard = {
  id: string;
  uuid: string;
  status: Card["status"];
  linked_profile_id: string | null;
};

/**
 * Resolve a tapped or scanned tag.
 *
 * Goes through the resolve_card_for_tap RPC rather than selecting from cards,
 * because the visitor is usually anonymous and `cards` is invisible to anon on
 * purpose: a policy that let them read the row would expose activation codes,
 * which are what turn inventory into somebody claimed card. The RPC returns
 * exactly the four fields the public Convex query returned.
 *
 * Returns null for an unknown tag -- a real answer, not an error.
 */
export function useCardByUuid(uuid: string | undefined) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.cardByUuid(uuid ?? ""),
    enabled: Boolean(uuid),
    // A physical tag does not change while somebody is standing there holding
    // it, and this runs on the redirect path where a refetch is pure latency.
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<TapCard | null> => {
      const { data, error } = await supabase.rpc("resolve_card_for_tap", {
        card_uuid: uuid!,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as TapCard[];
      return rows.length > 0 ? rows[0] : null;
    },
  });
}

/** Claim an unowned inventory card for the signed-in user. */
export function useClaimCard() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uuid: string): Promise<string> => {
      const { data, error } = await supabase.rpc("claim_card_by_uuid", {
        card_uuid: uuid,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myCards() });
    },
  });
}

/** Activate a card using the printed code rather than the tag. */
export function useActivateCardByCode() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc("activate_card_by_code", { code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myCards() });
    },
  });
}

/**
 * Count a tap.
 *
 * Fire-and-forget on purpose: this runs while the visitor is being redirected
 * to a profile, and a failed vanity counter must never delay or block that
 * redirect. The tag being tapped is the product working; the number is
 * bookkeeping.
 */
export function useRecordTap() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (uuid: string) => {
      await supabase.rpc("record_card_tap", { card_uuid: uuid });
    },
  });
}

/** Point a claimed card at one of the owner profiles. */
export function useLinkCardProfile() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, profileId }: { cardId: string; profileId: string | null }) => {
      const { error } = await supabase
        .from("cards")
        .update({ linked_profile_id: profileId })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myCards() });
    },
  });
}

/**
 * Return a card to stock.
 *
 * Goes through an RPC because the transition writes columns that must move
 * together: cards_inventory_is_unowned rejects a row that is inventory but
 * still owned, so a client doing it in two updates fails on the first.
 */
export function useUnclaimCard() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.rpc("unclaim_card", { card_id: cardId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myCards() });
    },
  });
}
