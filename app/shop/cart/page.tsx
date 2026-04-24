"use client";

import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useState } from "react";

function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

export default function CartPage() {
  const { items, itemCount, subtotal, isLoading, updateQuantity, removeItem, clearCart } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const shipping = subtotal > 5000 ? 0 : 500; // Free shipping over $50
  const tax = 0; // TODO: Implement tax calculation
  const total = subtotal + shipping + tax;

  const handleApplyDiscount = async () => {
    setApplyingDiscount(true);
    // TODO: Implement discount validation
    setTimeout(() => setApplyingDiscount(false), 1000);
  };

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
          Looks like you haven't added anything to your cart yet.
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Button variant="outline" onClick={() => clearCart()}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const product = item.product;
            const variation = item.variation;
            const imageUrl = product?.images?.[0] 
              ? resolveImageUrl(product.images[0])
              : null;

            return (
              <Card key={`${item.productId}-${item.variationId || "default"}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link href={`/shop/product/${product?.slug}`}>
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product?.name || "Product"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
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

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, item.variationId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, item.variationId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.productId, item.variationId)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold">{formatPrice(item.lineTotal || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Shipping */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>

              {/* Tax */}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>
              )}

              {/* Discount Code */}
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
                      disabled={applyingDiscount || !discountCode}
                    >
                      {applyingDiscount ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {subtotal < 5000 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Add {formatPrice(5000 - subtotal)} more for free shipping!
                  </p>
                )}
              </div>

              {/* Checkout Button */}
              <Link href="/shop/checkout">
                <Button size="lg" className="w-full">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              {/* Continue Shopping */}
              <Link href="/shop">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
