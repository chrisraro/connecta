"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { formatPHP } from "@/lib/payment";
import { DISCOUNT_CODE_KEY } from "@/lib/storage-keys";

const formatPrice = formatPHP;

function CartItemImage({ storageId, alt }: { storageId: string; alt: string }) {
  const imageUrl = useQuery(
    api.images.getImageUrl,
    storageId && !storageId.startsWith("http") ? { storageId } : "skip"
  );

  const displayUrl = storageId?.startsWith("http") ? storageId : imageUrl;

  if (!displayUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className="w-full h-full object-cover"
    />
  );
}

export default function CartPage() {
  const { items, itemCount, subtotal, isLoading, updateQuantity, removeItem, clearCart } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  // Shop settings are the single source of truth for tax/shipping (no hardcoding).
  const settings = useQuery(api.settings.getShopSettings, {});

  // Server-validated discount. We query lazily once the user clicks "Apply".
  const discountResult = useQuery(
    api.checkout.validateDiscount,
    appliedCode ? { code: appliedCode, subtotal } : "skip"
  );

  const discountAmount =
    discountResult && discountResult.valid ? discountResult.discountAmount : 0;
  const discountError =
    discountResult && !discountResult.valid ? discountResult.error : null;

  const freeShippingThreshold = settings?.freeShippingThresholdCentavos ?? 250000;
  const shippingFlatRate = settings?.shippingFlatRateCentavos ?? 50000;
  const taxRatePercent = settings?.taxRatePercent ?? 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shipping = discountedSubtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const tax = Math.round(discountedSubtotal * (taxRatePercent / 100));
  const total = subtotal + shipping + tax - discountAmount;

  const handleApplyDiscount = () => {
    const code = discountCode.trim() || null;
    setAppliedCode(code);
  };

  // Persist a successfully-applied code so checkout can pass it into createOrder.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (discountResult?.valid) {
      localStorage.setItem(DISCOUNT_CODE_KEY, discountResult.code);
    } else if (appliedCode && discountResult && !discountResult.valid) {
      localStorage.removeItem(DISCOUNT_CODE_KEY);
    }
  }, [discountResult, appliedCode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-6">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <Link href="/shop">
          <Button size="lg">
            Start Shopping
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Button variant="outline" onClick={() => clearCart()} className="w-full sm:w-auto">
          <Trash2 className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Clear Cart</span>
          <span className="sm:hidden">Clear</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.product;
            const variation = item.variation;
            const imageStorageId = product?.images?.[0];

            return (
              <Card key={`${item.productId}-${item.variationId || "default"}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Link href={`/shop/product/${product?.slug}`}>
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {imageStorageId ? (
                          <CartItemImage
                            storageId={imageStorageId}
                            alt={product?.name || "Product"}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/shop/product/${product?.slug}`}>
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors truncate">
                          {product?.name || "Product"}
                        </h3>
                      </Link>

                      {variation && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {variation.name}
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(item.priceAtAdd)} each
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 touch-manipulation"
                            onClick={() => updateQuantity(item.productId, item.variationId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-10 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 touch-manipulation"
                            onClick={() => updateQuantity(item.productId, item.variationId, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive px-2 py-1 h-auto"
                          onClick={() => removeItem(item.productId, item.variationId)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 mt-3 sm:mt-0">
                      <p className="text-lg font-bold">{formatPrice(item.lineTotal || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount{appliedCode ? ` (${appliedCode})` : ""}</span>
                  <span className="font-medium">-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>

              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({taxRatePercent}%)
                  </span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Code</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyDiscount}
                      disabled={!discountCode}
                    >
                      Apply
                    </Button>
                  </div>
                  {discountError && (
                    <p className="text-xs text-destructive">{discountError}</p>
                  )}
                  {discountAmount > 0 && (
                    <p className="text-xs text-green-600">Discount applied!</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {shipping > 0 && discountedSubtotal < freeShippingThreshold && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Add {formatPrice(freeShippingThreshold - discountedSubtotal)} more for free shipping!
                  </p>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <Link href="/shop/checkout">
                  <Button size="lg" className="w-full mb-3">
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <Link href="/shop">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
