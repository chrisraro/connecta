"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { queryKeys } from "@/lib/db/keys";
import type { Tables, Enums } from "@/lib/supabase/database.types";

export type AdminUserRow = Tables<"users">;
export type AdminCardRow = Tables<"cards">;
export type AuditLogRow = Tables<"audit_logs">;

export type AdminStats = {
  users: number;
  suspendedUsers: number;
  paidUsers: number;
  profiles: number;
  cardsTotal: number;
  cardsInventory: number;
  cardsActive: number;
  cardsLost: number;
  totalTaps: number;
  leads: number;
  admins: number;
};

/**
 * Console counters.
 *
 * One RPC rather than a dozen client-side count queries: each of those would
 * be a separate round trip whose RLS the admin passes anyway, and the totals
 * would be assembled from reads taken at different instants.
 */
export function useAdminStats() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.adminStats(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats");
      if (error) throw error;
      return data as unknown as AdminStats;
    },
  });
}

/** Every user. Readable because the users policy admits `or public.is_admin()`. */
export function useAdminUsers(search?: string) {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.adminUsers(search),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<AdminUserRow[]> => {
      let query = supabase.from("users").select("*").order("created_at", { ascending: false });
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`email.ilike.${term},name.ilike.${term}`);
      }
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Factory stock and claimed cards.
 *
 * Capped at 500, matching the Convex ADMIN_CARDS_LIST_CAP it replaces: this
 * renders as one table, and an uncapped select would eventually try to paint
 * the entire production run.
 */
export function useAdminCards() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.adminCards(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<AdminCardRow[]> => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Mint one inventory card. Returns the row, including its activation code. */
export function useRegisterCard() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uuid,
      skin = "charcoal",
    }: {
      uuid: string;
      skin?: Enums<"card_skin">;
    }): Promise<AdminCardRow> => {
      const { data, error } = await supabase.rpc("admin_register_card", {
        card_uuid: uuid,
        skin,
      });
      if (error) throw error;
      return data as unknown as AdminCardRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCards() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    },
  });
}

/** Delete unclaimed stock. The RPC refuses anything already claimed. */
export function useDeleteCards() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<number> => {
      const { data, error } = await supabase.rpc("admin_delete_cards", { card_ids: ids });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCards() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    },
  });
}

export function useSetUserSuspended() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_suspended", {
        target_user: userId,
        suspend: suspended,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    },
  });
}

export function useGrantAdminRole() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      reason,
    }: {
      userId: string;
      role: Enums<"admin_role">;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("admin_grant_role", {
        target_user: userId,
        grant_role: role,
        grant_reason: reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    },
  });
}

export function useRevokeAdminRole() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { error } = await supabase.rpc("admin_revoke_role", {
        target_user: userId,
        revoke_reason: reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    },
  });
}

/** Live admin grants, so the users table can show who holds what. */
export function useAdminGrants() {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: ["admin", "grants"],
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<Tables<"admins">[]> => {
      const { data, error } = await supabase.from("admins").select("*").is("revoked_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAuditLogs(limit = 100) {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.adminAudit(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<AuditLogRow[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
