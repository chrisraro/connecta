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
  totalUsers: number;
  suspendedUsers: number;
  paidUsers: number;
  totalProfiles: number;
  totalCards: number;
  inventoryCards: number;
  activeCards: number;
  lostCards: number;
  totalTaps: number;
  totalLeads: number;
  newLeads7d: number;
  newLeads: number;
  lowStockCount: number;
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

export type DeleteCardsResult = {
  success: boolean;
  deletedCount: number;
  totalRequested: number;
  skippedIds: string[];
};

/**
 * Delete cards.
 *
 * Partial success is the normal case, not an error: ACTIVE cards are skipped
 * and reported back rather than failing the whole call, because an operator
 * selecting a page of rows should not have the entire delete rejected over one
 * paired card. Inventory and lost cards are removed -- lost meaning reported
 * physically gone, which cannot be cleared through the unpair flow.
 */
export function useDeleteCards() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]): Promise<DeleteCardsResult> => {
      const { data, error } = await supabase.rpc("admin_delete_cards", { card_ids: ids });
      if (error) throw error;
      return data as unknown as DeleteCardsResult;
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

/**
 * Set a customer's plan by hand -- the only upgrade path while there is no
 * payment gateway (20260924000024). A paid plan extends from the later of
 * today and the current expiry; a first Business upgrade creates the team.
 */
export function useSetUserPlan() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      plan,
      periodDays = 30,
    }: {
      userId: string;
      plan: "free" | "pro" | "business";
      periodDays?: number;
    }) => {
      const { error } = await supabase.rpc("admin_set_user_plan", {
        target_user: userId,
        new_plan: plan,
        period_days: periodDays,
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

export type AuditLogWithActor = AuditLogRow & {
  actorName: string | null;
  actorEmail: string | null;
  /** Alias of created_at, kept because the console column is labelled Time. */
  timestamp: string;
};

/**
 * The audit trail, with the actor resolved.
 *
 * Joined in one query rather than looked up per row: an audit page renders
 * a hundred entries, and a per-row lookup is a hundred round trips for a
 * name. The FK to users makes this a single embedded select.
 */
export function useAuditLogs(limit = 100) {
  const supabase = useSupabase();
  const { user, isLoaded } = useAuth();

  return useQuery({
    queryKey: queryKeys.adminAudit(),
    enabled: isLoaded && Boolean(user),
    queryFn: async (): Promise<AuditLogWithActor[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, actor:users!audit_logs_user_id_fkey(name, email)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      return (data ?? []).map((row) => {
        const { actor, ...log } = row as typeof row & {
          actor: { name: string | null; email: string | null } | null;
        };
        return {
          ...(log as AuditLogRow),
          actorName: actor?.name ?? null,
          actorEmail: actor?.email ?? null,
          timestamp: log.created_at,
        };
      });
    },
  });
}
