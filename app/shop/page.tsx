"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, SlidersHorizontal, ChevronDown, Loader2, Check, X, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { useEffect, useRef } from "react";
import { formatPHP } from "@/lib/payment";

// Enhanced toast notification component with actions
function ToastNotification({ 
  message, 
  visible,
  onViewCart,
  onDismiss
}: { 
  message: string; 
  visible: boolean;
  onViewCart: () => void;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    
    setProgress(100);
    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / 10000) * 100);
      setProgress(remaining);
      
      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    const timer = setTimeout(() => {
      onDismiss();
    }, 10000);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible, onDismiss]);

  if (!visible) return null;
  
  const secondsLeft = Math.ceil((progress / 100) * 10);
  
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
        {/* Progress bar with time indicator */}
        <div className="relative h-2 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center px-2">
            <span className="text-[10px] font-semibold text-foreground/80">
              {secondsLeft}s remaining
            </span>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-500/10 rounded-full p-2 flex-shrink-0">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm mb-1">{message}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  size="sm"
                  className="h-8 text-xs flex-1 sm:flex-none"
                  onClick={onViewCart}
                >
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  View Cart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-1 sm:flex-none"
                  onClick={onDismiss}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
            
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatPrice = formatPHP;

// Helper component to resolve and display product images
function ProductImage({ storageId, alt, className }: { storageId: string; alt: string; className?: string }) {
  const imageUrl = useQuery(
    api.images.getImageUrl,
    storageId && !storageId.startsWith("http") ? { storageId } : "skip"
  );

  const displayUrl = storageId?.startsWith("http") ? storageId : imageUrl;

  if (!displayUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Image
      src={displayUrl}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className={className}
    />
  );
}
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

export default function ShopPage() {
  const categories = useQuery(api.shop.getCategories, {});
  const [selectedCategory, setSelectedCategory] = useState<Id<"productCategories"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const { addItem, isLoading: cartLoading } = useCart();
  const [addedToCart, setAddedToCart] = useState<Id<"products"> | null>(null);

  const products = useQuery(api.shop.getProducts, {
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    sortBy: sortBy as any,
    inStockOnly: inStockOnly,
  });

  const handleAddToCart = async (productId: Id<"products">) => {
    try {
      await addItem(productId, undefined, 1);
      setAddedToCart(productId);
      setTimeout(() => setAddedToCart(null), 2000);
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
            aria-label="Search products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10"
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
            <Button variant="outline" className="h-11 md:hidden">
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
                    <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col hover:-translate-y-1 border-border/50 hover:border-primary/50">
                      {/* Product Image */}
                      <div className="aspect-square bg-muted relative overflow-hidden rounded-t-lg">
                        {product.images.length > 0 ? (
                          <ProductImage
                            storageId={product.images[product.primaryImageIndex] || product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                          {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                            <Badge className="bg-red-600 text-white animate-in fade-in slide-in-from-top-2 duration-300">
                              Sale
                            </Badge>
                          )}
                          {product.isFeatured && (
                            <Badge className="bg-amber-700 text-white animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
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
                          className={`w-full h-11 mt-4 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                            addedToCart === product._id
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product._id);
                          }}
                          disabled={
                            cartLoading ||
                            (product.trackInventory && product.inventory === 0)
                          }
                        >
                          {addedToCart === product._id ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Added!
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add to Cart
                            </>
                          )}
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
      
      {/* Toast Notification */}
      <ToastNotification 
        message="Added to cart!" 
        visible={addedToCart !== null}
        onViewCart={() => {
          window.location.href = '/shop/cart';
        }}
        onDismiss={() => setAddedToCart(null)}
      />
    </div>
  );
}
