import type { Product } from "@/hooks/useShop";

export type ShopSort = "newest" | "price_asc" | "price_desc";

export type ShopFilters = {
  search: string;
  inStockOnly: boolean;
  sortBy: ShopSort;
};

/**
 * The shop index's search box, "In stock only" checkbox and sort dropdown
 * used to set state that nothing ever read (Task audit) -- every control
 * kept the full unfiltered list on screen regardless of what was typed or
 * ticked. Category filtering already happens server-side via
 * `useProducts({ categoryId })`; this is the client-side half: search text,
 * stock, and sort, as one pure function so the wiring is testable without a
 * DOM.
 *
 * "Most Popular" was a fourth sort option with nothing behind it -- no
 * popularity metric exists anywhere in the schema -- so it isn't a case
 * here; the caller no longer offers it as a choice.
 */
export function filterAndSortProducts(
  products: Product[],
  { search, inStockOnly, sortBy }: ShopFilters,
): Product[] {
  const query = search.trim().toLowerCase();

  const filtered = products.filter((product) => {
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesStock = !inStockOnly || !product.track_inventory || product.inventory > 0;
    return matchesSearch && matchesStock;
  });

  const sorted = [...filtered];
  if (sortBy === "price_asc") {
    sorted.sort((a, b) => a.base_price - b.base_price);
  } else if (sortBy === "price_desc") {
    sorted.sort((a, b) => b.base_price - a.base_price);
  } else {
    // "newest": the query already orders by created_at desc; re-sort here
    // too so this function's output is correct even if the caller's data
    // didn't arrive pre-sorted (e.g. in a test).
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return sorted;
}
