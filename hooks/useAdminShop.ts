"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { queryKeys } from "@/lib/db/keys";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import type { Product, ProductCategory, ProductVariation } from "@/hooks/useShop";

export type { Product, ProductCategory, ProductVariation };

function useShopMutation<TArgs, TResult = void>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      // Broad on purpose. The catalogue is small, admin writes are rare, and
      // an under-invalidated key here shows as a stale price on a storefront
      // -- which nobody would connect back to a missing invalidation.
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    },
  });
}

/** Admin listing: includes drafts, because products_select_authenticated admits them. */
export function useAdminProducts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["products", "admin"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminProduct(id: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["products", "admin", id ?? ""],
    enabled: Boolean(id),
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduct() {
  const supabase = useSupabase();
  return useShopMutation<TablesInsert<"products">, Product>(async (input) => {
    const { data, error } = await supabase.from("products").insert(input).select().single();
    if (error) throw error;
    return data;
  });
}

export function useUpdateProduct() {
  const supabase = useSupabase();
  return useShopMutation<{ id: string; patch: TablesUpdate<"products"> }>(async ({ id, patch }) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) throw error;
  });
}

export function useDeleteProduct() {
  const supabase = useSupabase();
  return useShopMutation<string>(async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  });
}

export function useAdminCategories() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.productCategories(),
    queryFn: async (): Promise<ProductCategory[]> => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCategory() {
  const supabase = useSupabase();
  return useShopMutation<TablesInsert<"product_categories">>(async (input) => {
    const { error } = await supabase.from("product_categories").insert(input);
    if (error) throw error;
  });
}

export function useUpdateCategory() {
  const supabase = useSupabase();
  return useShopMutation<{ id: string; patch: TablesUpdate<"product_categories"> }>(
    async ({ id, patch }) => {
      const { error } = await supabase.from("product_categories").update(patch).eq("id", id);
      if (error) throw error;
    },
  );
}

export function useDeleteCategory() {
  const supabase = useSupabase();
  return useShopMutation<string>(async (id) => {
    const { error } = await supabase.from("product_categories").delete().eq("id", id);
    if (error) throw error;
  });
}

export function useProductVariations(productId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["productVariations", productId ?? ""],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductVariation[]> => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateVariation() {
  const supabase = useSupabase();
  return useShopMutation<TablesInsert<"product_variations">>(async (input) => {
    const { error } = await supabase.from("product_variations").insert(input);
    if (error) throw error;
  });
}

export function useUpdateVariation() {
  const supabase = useSupabase();
  return useShopMutation<{ id: string; patch: TablesUpdate<"product_variations"> }>(
    async ({ id, patch }) => {
      const { error } = await supabase.from("product_variations").update(patch).eq("id", id);
      if (error) throw error;
    },
  );
}

export function useDeleteVariation() {
  const supabase = useSupabase();
  return useShopMutation<string>(async (id) => {
    const { error } = await supabase.from("product_variations").delete().eq("id", id);
    if (error) throw error;
  });
}

/**
 * Products at or below their reorder threshold.
 *
 * Only those that actually track inventory: an untracked product has no stock
 * level, so a zero there means "not counted", not "sold out".
 */
export function useLowStockProducts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["products", "lowStock"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("track_inventory", true)
        .order("inventory", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((p) => p.inventory <= p.low_stock_threshold);
    },
  });
}
