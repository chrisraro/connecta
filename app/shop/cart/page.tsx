"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { formatPHP } from "@/lib/payment";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";
import { InquiryDialog } from "@/components/inquiry/InquiryDialog";

const formatPrice = formatPHP;

function CartItemImage({ storageId, alt }: { storageId: string; alt: string }) {
  const imageUrl = useQuery(
    api.images.getImageUrl,
    storageId && !storageId.startsWith("http") ? { storageId } : "skip",
  );

  const displayUrl = storageId?.startsWith("http") ? storageId : imageUrl;

  if (!displayUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return <Image src={displayUrl} alt={alt} fill sizes="96px" className="object-cover" />;
}

/**
 * The shop "cart" is an inquiry basket, not a checkout funnel.
 *
 * There is no payment gateway in this product: a shopper collects the cards
 * they want here and sends the list to us as a purchase inquiry, which we
 * complete off-app. Everything that only made sense alongside a real
 * checkout — discount codes, tax and shipping lines, an order total — is
 * gone. The subtotal stays, because it is exactly what the shopper is
 * asking us about.
 */
export default function CartPage() {
  const { items, itemCount, subtotal, isLoading, updateQuantity, removeItem, clearCart } =
    useCart();
  const [showInquiry, setShowInquiry] = useState(false);

  // addItem/updateQuantity/removeItem/clearCart in CartContext all re-throw
  // on failure. Every caller here routes that through the established
  // toUserMessage + sonner toast pattern, so a rejected mutation (stale
  // stock, network error, rate limit) is visible instead of leaving the
  // customer staring at a button that silently did nothing.
  const handleUpdateQuantity = async (
    productId: Parameters<typeof updateQuantity>[0],
    variationId: Parameters<typeof updateQuantity>[1],
    quantity: number,
  ) => {
    try {
      await updateQuantity(productId, variationId, quantity);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  };

  const handleRemoveItem = async (
    productId: Parameters<typeof removeItem>[0],
    variationId: Parameters<typeof removeItem>[1],
  ) => {
    try {
      await removeItem(productId, variationId);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  };

  // The inquiry email carries the basket itself, so the shopper never has to
  // retype what they picked and we never have to ask.
  const inquiryBody = [
    "Hi! I would like to purchase the following:",
    "",
    ...items.map((item) => {
      const name = item.product?.name ?? "Product";
      const variant = item.variation ? ` (${item.variation.name})` : "";
      return `- ${item.quantity} x ${name}${variant} — ${formatPrice(item.lineTotal || 0)}`;
    }),
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    "",
    "Please let me know the next steps. Thanks!",
  ].join("\n");

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
        <h1 className="text-2xl font-bold mb-2">Your List is Empty</h1>
        <p className="text-muted-foreground mb-6">
          Add the cards you&apos;re interested in and we&apos;ll take it from there.
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
          <h1 className="text-2xl sm:text-3xl font-bold">Your Selection</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {itemCount} item{itemCount !== 1 ? "s" : ""} ready to inquire about
          </p>
        </div>
        <Button variant="outline" onClick={() => handleClearCart()} className="w-full sm:w-auto">
          <Trash2 className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Clear List</span>
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
                      <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
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
                        <p className="text-sm text-muted-foreground mt-1">{variation.name}</p>
                      )}

                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(item.priceAtAdd)} each
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Decrease quantity"
                            className="size-11 touch-manipulation"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.variationId,
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-10 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Increase quantity"
                            className="size-11 touch-manipulation"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.variationId,
                                item.quantity + 1,
                              )
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive px-2 py-1 h-11"
                          onClick={() => handleRemoveItem(item.productId, item.variationId)}
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
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Shipping is quoted with your inquiry — it depends on where the cards are going.
              </p>

              <div className="pt-4 space-y-3 border-t border-border">
                <Button size="lg" className="w-full mb-3" onClick={() => setShowInquiry(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Purchase Inquiry
                </Button>

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

      <InquiryDialog
        open={showInquiry}
        onOpenChange={setShowInquiry}
        title="Send your purchase inquiry"
        description="Online checkout is on our roadmap. For now we arrange each order personally — send us your list and we'll reply with payment and delivery details."
        supportBody="Your selection is already written into the email, so you only need to hit send."
        mailSubject="Card purchase inquiry"
        mailBody={inquiryBody}
      />
    </div>
  );
}
