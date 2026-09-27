import { describe, expect, test } from "vitest";
import { filterAndSortProducts } from "./shopFilters";
import type { Product } from "@/hooks/useShop";

function product(overrides: Partial<Product>): Product {
  return {
    barcode: null,
    base_price: 100,
    category_id: null,
    compare_at_price: null,
    cost_price: null,
    created_at: "2026-01-01T00:00:00.000Z",
    description: null,
    dimensions: null,
    id: "prod_1",
    images: [],
    inventory: 10,
    is_featured: false,
    is_published: true,
    low_stock_threshold: 0,
    metadata: null,
    name: "Product",
    primary_image_index: 0,
    shipping_required: true,
    sku: "SKU-1",
    slug: "product",
    tags: [],
    track_inventory: true,
    updated_at: "2026-01-01T00:00:00.000Z",
    weight: null,
    ...overrides,
  };
}

describe("filterAndSortProducts", () => {
  test("matches by name, case-insensitively", () => {
    const products = [product({ id: "a", name: "Matte Black Card" }), product({ id: "b", name: "Glossy White Card" })];
    const result = filterAndSortProducts(products, { search: "matte", inStockOnly: false, sortBy: "newest" });
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });

  test("matches by tag", () => {
    const products = [
      product({ id: "a", name: "Card A", tags: ["metal"] }),
      product({ id: "b", name: "Card B", tags: ["bamboo"] }),
    ];
    const result = filterAndSortProducts(products, { search: "bamboo", inStockOnly: false, sortBy: "newest" });
    expect(result.map((p) => p.id)).toEqual(["b"]);
  });

  test("in-stock-only excludes tracked, zero-inventory items but keeps untracked ones", () => {
    const products = [
      product({ id: "tracked-out", track_inventory: true, inventory: 0 }),
      product({ id: "tracked-in", track_inventory: true, inventory: 5 }),
      product({ id: "untracked", track_inventory: false, inventory: 0 }),
    ];
    const result = filterAndSortProducts(products, { search: "", inStockOnly: true, sortBy: "newest" });
    expect(result.map((p) => p.id).sort()).toEqual(["tracked-in", "untracked"]);
  });

  test("sorts by price ascending and descending", () => {
    const products = [
      product({ id: "mid", base_price: 500 }),
      product({ id: "low", base_price: 100 }),
      product({ id: "high", base_price: 900 }),
    ];
    expect(
      filterAndSortProducts(products, { search: "", inStockOnly: false, sortBy: "price_asc" }).map((p) => p.id),
    ).toEqual(["low", "mid", "high"]);
    expect(
      filterAndSortProducts(products, { search: "", inStockOnly: false, sortBy: "price_desc" }).map((p) => p.id),
    ).toEqual(["high", "mid", "low"]);
  });

  test("sorts newest-first by created_at", () => {
    const products = [
      product({ id: "old", created_at: "2025-01-01T00:00:00.000Z" }),
      product({ id: "new", created_at: "2026-06-01T00:00:00.000Z" }),
    ];
    const result = filterAndSortProducts(products, { search: "", inStockOnly: false, sortBy: "newest" });
    expect(result.map((p) => p.id)).toEqual(["new", "old"]);
  });

  test("search and stock filters combine", () => {
    const products = [
      product({ id: "match-in-stock", name: "Steel Card", track_inventory: true, inventory: 3 }),
      product({ id: "match-out-of-stock", name: "Steel Plate", track_inventory: true, inventory: 0 }),
      product({ id: "no-match", name: "Wood Card", track_inventory: true, inventory: 3 }),
    ];
    const result = filterAndSortProducts(products, { search: "steel", inStockOnly: true, sortBy: "newest" });
    expect(result.map((p) => p.id)).toEqual(["match-in-stock"]);
  });
});
