"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

export default function ShopPage() {
  const categories = useQuery(api.shop.getCategories, {});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const { addItem, isLoading: cartLoading } = useCart();

  const products = useQuery(api.shop.getProducts, {
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    sortBy: sortBy as any,
    inStockOnly: inStockOnly || undefined,
  });

  const handleAddToCart = async (productId: Id<"products">) => {
    try {
      await addItem(productId, undefined, 1);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Shop</h1>
        <p className="text-muted-foreground mt-1">
          Browse our collection of premium NFC cards and accessories
        </p>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort (Desktop) */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px] hidden md:flex">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>

        {/* Filters (Mobile) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !selectedCategory
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    All Products
                  </button>
                  {categories?.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => setSelectedCategory(category._id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === category._id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock Filter */}
              <div>
                <h3 className="font-semibold mb-3">Availability</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">In Stock Only</span>
                </label>
              </div>

              {/* Sort */}
              <div>
                <h3 className="font-semibold mb-3">Sort By</h3>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar (Desktop) */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  All Products
                </button>
                {categories?.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => setSelectedCategory(category._id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category._id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <h3 className="font-semibold mb-3">Availability</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">In Stock Only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {products === undefined ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No products found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                  setInStockOnly(false);
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {products.length} product{products.length !== 1 ? "s" : ""}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link href={`/shop/product/${product.slug}`} key={product._id}>
                    <Card className="group hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                      {/* Product Image */}
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {product.images.length > 0 ? (
                          <img
                            src={`/api/images/${product.images[product.primaryImageIndex] || product.images[0]}`}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                          {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                            <Badge className="bg-red-500 text-white">
                              Sale
                            </Badge>
                          )}
                          {product.isFeatured && (
                            <Badge className="bg-amber-500 text-white">
                              Featured
                            </Badge>
                          )}
                        </div>

                        {/* Stock Status */}
                        {product.trackInventory && product.inventory === 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Badge variant="secondary" className="text-sm">
                              Out of Stock
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        
                        {product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {product.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                              {formatPrice(product.basePrice)}
                            </span>
                            {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(product.compareAtPrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <Button
                          className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product._id);
                          }}
                          disabled={
                            cartLoading ||
                            (product.trackInventory && product.inventory === 0)
                          }
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
