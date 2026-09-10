"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { queryKeys } from "@/lib/db/keys";
import type { Tables } from "@/lib/supabase/database.types";

export type Product = Tables<"products">;
export type ProductVariation = Tables<"product_variations">;
export type ProductCategory = Tables<"product_categories">;

/**
 * Storefront listing.
 *
 * No is_published filter here: products_select_anon already restricts an
 * anonymous visitor to published rows, and an admin browsing the same page
 * deliberately sees drafts. Filtering in the client would either duplicate the
 * policy or contradict it.
 */
export function useProducts(options?: { categoryId?: string; featuredOnly?: boolean }) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.products(
      `${options?.categoryId ?? ""}:${options?.featuredOnly ? "featured" : "all"}`,
    ),
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (options?.categoryId) query = query.eq("category_id", options.categoryId);
      if (options?.featuredOnly) query = query.eq("is_featured", true);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProductBySlug(slug: string | undefined) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: queryKeys.productBySlug(slug ?? ""),
    enabled: Boolean(slug),
    queryFn: async (): Promise<{
      product: Product;
      variations: ProductVariation[];
    } | null> => {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .ilike("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!product) return null;

      const { data: variations, error: varError } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: true });
      if (varError) throw varError;

      return { product, variations: variations ?? [] };
    },
  });
}

export function useProductCategories() {
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

/** Products by id, for hydrating a cart whose items are just ids. */
export function useProductsByIds(ids: string[]) {
  const supabase = useSupabase();
  const key = [...ids].sort().join(",");

  return useQuery({
    queryKey: ["products", "byIds", key],
    enabled: ids.length > 0,
    queryFn: async (): Promise<{
      products: Product[];
      variations: ProductVariation[];
    }> => {
      const { data: products, error } = await supabase.from("products").select("*").in("id", ids);
      if (error) throw error;

      const { data: variations, error: varError } = await supabase
        .from("product_variations")
        .select("*")
        .in("product_id", ids);
      if (varError) throw varError;

      return { products: products ?? [], variations: variations ?? [] };
    },
  });
}
