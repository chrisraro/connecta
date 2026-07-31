"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Minus, Plus, ChevronLeft, ChevronRight, Truck, Shield, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Id } from "@/convex/_generated/dataModel";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import { formatPHP } from "@/lib/payment";

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
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Image
      src={displayUrl}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 50vw, 100vw"
      className={className}
    />
  );
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<Id<"productVariations"> | undefined>(undefined);
  const { addItem, isLoading } = useCart();

  const product = useQuery(api.shop.getProduct, { slug });

  if (product === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/shop">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariation
    ? product.variations.find(v => v._id === selectedVariation)?.price || product.basePrice
    : product.basePrice;

  const currentInventory = selectedVariation
    ? product.variations.find(v => v._id === selectedVariation)?.inventory || 0
    : product.inventory;

  const isInStock = !product.trackInventory || currentInventory > 0;
  const isLowStock = product.trackInventory && currentInventory <= product.lowStockThreshold && currentInventory > 0;

  const handleAddToCart = async () => {
    try {
      await addItem(product._id, selectedVariation, quantity);
      // Redirect to checkout immediately after adding to cart
      router.push('/shop/checkout');
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {product.images.length > 0 ? (
              <>
                <ProductImage
                  storageId={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center bg-background/80 hover:bg-background rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center bg-background/80 hover:bg-background rounded-full transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image Available
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-current={selectedImage === index}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent hover:border-muted"
                  }`}
                >
                  <ProductImage
                    storageId={image}
                    alt={`${product.name} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title & Price */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{product.name}</h1>
            
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-primary">
                {formatPrice(currentPrice)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
              {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                <Badge className="bg-red-500 text-white">
                  Save {formatPrice(product.compareAtPrice - currentPrice)}
                </Badge>
              )}
            </div>
          </div>

          {/* Stock Status */}
          <div>
            {isInStock ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-600">
                  {isLowStock ? `Low Stock - Only ${currentInventory} left` : "In Stock"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm font-medium text-red-600">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {/* Variations */}
          {product.variations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Options</h3>
              <div className="grid grid-cols-2 gap-2">
                {product.variations.map((variation) => (
                  <button
                    key={variation._id}
                    onClick={() => setSelectedVariation(variation._id)}
                    disabled={variation.inventory === 0}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedVariation === variation._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted"
                    } ${variation.inventory === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div>{variation.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatPrice(variation.price)}
                      {variation.inventory === 0 && " - Out of Stock"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-3">
            <h3 className="font-semibold">Quantity</h3>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Decrease quantity"
                className="size-11"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Increase quantity"
                className="size-11"
                onClick={() => setQuantity(Math.min(currentInventory, quantity + 1))}
                disabled={quantity >= currentInventory}
              >
                <Plus className="w-4 h-4" />
              </Button>
              {product.trackInventory && (
                <span className="text-sm text-muted-foreground">
                  ({currentInventory} available)
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!isInStock || isLoading}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {isInStock ? "Add to Cart & Checkout" : "Out of Stock"}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to checkout after adding to cart
            </p>

            <Link href="/shop/cart">
              <Button variant="outline" size="lg" className="w-full">
                View Cart
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Free Shipping</div>
                <div className="text-xs text-muted-foreground">On orders over ₱50</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Secure Checkout</div>
                <div className="text-xs text-muted-foreground">SSL encrypted</div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="pt-6 border-t border-border">
              <h3 className="font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* SKU */}
          <div className="text-sm text-muted-foreground">
            SKU: <span className="font-mono">{product.sku}</span>
          </div>
        </div>
      </div>

      {/* Related Products Section (placeholder) */}
      <div className="pt-12 border-t border-border">
        <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
        <p className="text-muted-foreground">
          Related products will be displayed here based on category and tags.
        </p>
      </div>
    </div>
  );
}
