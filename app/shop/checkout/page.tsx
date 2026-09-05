"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { useCart } from "@/contexts/CartContext";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatPHP } from "@/lib/payment";
import { GUEST_CART_ID_KEY, DISCOUNT_CODE_KEY } from "@/lib/storage-keys";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { PayrexCheckoutButton } from "@/components/shop/PayrexCheckoutButton";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";

const formatPrice = formatPHP;

// How long to wait after the last subtotal change before re-validating the
// stored discount code — see app/shop/cart/page.tsx's identical constant for
// the full rationale (Task 19 follow-up, Task 18 review): this effect
// re-fires on every cart quantity change too, and validateDiscount is
// metered against a single shop-wide bucket with no per-owner scoping.
const DISCOUNT_REVALIDATE_DEBOUNCE_MS = 600;

// Mirror of the guest id used by CartContext so guest orders find their cart.
function getGuestId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GUEST_CART_ID_KEY) || "";
}

function getDiscountCode(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DISCOUNT_CODE_KEY) || "";
}

function CheckoutItemImage({ storageId, alt }: { storageId: string; alt: string }) {
  const [error, setError] = useState(false);
  const imageUrl = useQuery(
    api.images.getImageUrl,
    storageId && !storageId.startsWith("http") ? { storageId } : "skip",
  );

  const displayUrl = storageId?.startsWith("http") ? storageId : imageUrl;

  if (error || !displayUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/50">
        {error ? "Failed" : <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={displayUrl}
        alt={alt}
        fill
        sizes="48px"
        className="object-cover"
        // Only Convex-resolved storage URLs (*.convex.cloud) are
        // allow-listed in next.config.ts's remotePatterns — a storageId
        // that was already a full URL (e.g. an external product photo)
        // skips the optimizer instead of throwing on an unlisted host.
        unoptimized={Boolean(storageId?.startsWith("http"))}
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function CheckoutPage() {
  const { user } = useUser();
  const { items, subtotal } = useCart();
  // createOrder is a Convex action (not a mutation) so its rate-limit
  // bookkeeping survives an empty-cart/out-of-stock/bad-discount rejection
  // instead of being rolled back with it — see convex/checkout.ts. useAction
  // has the same calling convention as useMutation, so handlePlaceOrder below
  // is otherwise unchanged.
  const createOrder = useAction(api.checkout.createOrder);
  const createCheckoutSession = useAction(api.payrex.createCheckoutSession);

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode] = useState<string>(getDiscountCode);

  // Shop settings drive tax/shipping (single source of truth, matches the cart).
  const settings = useQuery(api.settings.getShopSettings, {});

  // validateDiscount is a Convex action (not a query) so it can meter itself
  // — see convex/checkout.ts and app/shop/cart/page.tsx for the same pattern.
  // Not reactive like useQuery, so trigger it ourselves and hold the result.
  const validateDiscountAction = useAction(api.checkout.validateDiscount);
  const [discountResult, setDiscountResult] = useState<Awaited<
    ReturnType<typeof validateDiscountAction>
  > | null>(null);

  useEffect(() => {
    if (!discountCode) {
      setDiscountResult(null);
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      validateDiscountAction({
        code: discountCode,
        subtotal,
        visitorId: getGuestId(),
      })
        .then((result) => {
          if (!cancelled) setDiscountResult(result);
        })
        .catch((err) => {
          if (!cancelled) setDiscountResult({ valid: false, error: toUserMessage(err) });
        });
    }, DISCOUNT_REVALIDATE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountCode, subtotal]);

  const discountAmount = discountResult && discountResult.valid ? discountResult.discountAmount : 0;

  const freeShippingThreshold = settings?.freeShippingThresholdCentavos ?? 250000;
  const shippingFlatRate = settings?.shippingFlatRateCentavos ?? 50000;
  const taxRatePercent = settings?.taxRatePercent ?? 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const shipping = discountedSubtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const tax = Math.round(discountedSubtotal * (taxRatePercent / 100));
  const total = subtotal + shipping + tax - discountAmount;

  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const isStep1Valid = () => {
    return (
      email &&
      shippingAddress.fullName &&
      shippingAddress.addressLine1 &&
      shippingAddress.city &&
      shippingAddress.postalCode &&
      shippingAddress.country &&
      shippingAddress.phone
    );
  };

  const handlePlaceOrder = async () => {
    if (!isStep1Valid()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await createOrder({
        guestEmail: user?.id ? undefined : email,
        guestId: user?.id ? undefined : getGuestId(),
        shippingAddress,
        billingAddress: sameAsBilling ? undefined : billingAddress,
        paymentProvider: "payrex",
        discountCode: discountCode || undefined,
      });

      // Discount has been consumed into the order; clear the stored code.
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCOUNT_CODE_KEY);
      }

      const { url } = await createCheckoutSession({
        orderNumber: result.orderNumber,
        // Only present for guest checkout (see convex/checkout.ts
        // #performCreateOrder) — createCheckoutSession requires it to
        // authorize a guest order since there's no signed-in identity to
        // check ownership against (Task 19 / C2).
        guestOrderToken: result.guestOrderToken,
      });

      window.location.href = url;
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(toUserMessage(error));
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/shop">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground mt-1">Complete your order</p>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            1
          </div>
          <span className="hidden sm:inline">Shipping</span>
        </div>
        <div className="flex-1 h-0.5 bg-muted" />
        <div
          className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            2
          </div>
          <span className="hidden sm:inline">Payment</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={shippingAddress.fullName}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, fullName: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <Input
                    id="address1"
                    value={shippingAddress.addressLine1}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })
                    }
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    value={shippingAddress.addressLine2}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })
                    }
                    placeholder="Apt, Suite, etc. (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, city: e.target.value })
                      }
                      placeholder="New York"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, state: e.target.value })
                      }
                      placeholder="NY"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={shippingAddress.postalCode}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                      }
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={shippingAddress.country}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, country: e.target.value })
                    }
                    placeholder="United States"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => setSameAsBilling(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Billing address same as shipping</span>
                </label>

                {!sameAsBilling && (
                  <div className="pt-4 border-t border-border space-y-4">
                    <h3 className="font-semibold">Billing Address</h3>
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={billingAddress.fullName}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, fullName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address *</Label>
                      <Input
                        value={billingAddress.addressLine1}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, addressLine1: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        placeholder="City"
                        value={billingAddress.city}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, city: e.target.value })
                        }
                      />
                      <Input
                        placeholder="State"
                        value={billingAddress.state}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, state: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Postal Code"
                        value={billingAddress.postalCode}
                        onChange={(e) =>
                          setBillingAddress({ ...billingAddress, postalCode: e.target.value })
                        }
                      />
                    </div>
                    <Input
                      placeholder="Country"
                      value={billingAddress.country}
                      onChange={(e) =>
                        setBillingAddress({ ...billingAddress, country: e.target.value })
                      }
                    />
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid()}
                >
                  Continue to Payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-primary/5">
                  <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Pay securely with PayRex</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {PAYMENTS_ENABLED
                        ? "You'll be redirected to PayRex's secure checkout to complete your payment. Your order is created first, then confirmed automatically once payment succeeds."
                        : "We're finalizing our payment provider — online checkout is opening soon. Your cart is saved, so nothing is lost in the meantime."}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Accepted payment methods</p>
                  <div className="flex flex-wrap gap-2">
                    {["GCash", "Maya", "Card", "QR Ph"].map((m) => (
                      <span
                        key={m}
                        className="px-3 py-1.5 rounded-md border border-border bg-muted text-sm font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={isProcessing}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <PayrexCheckoutButton
                    paymentsEnabled={PAYMENTS_ENABLED}
                    onCheckout={handlePlaceOrder}
                    totalLabel={`Pay ${formatPrice(total)} with PayRex`}
                    busy={isProcessing}
                    disabled={isProcessing}
                    className="flex-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => {
                  const imageStorageId = item.product?.images?.[0];
                  return (
                    <div key={`${item.productId}-${item.variationId}`} className="flex gap-3">
                      <div className="w-12 h-12 bg-muted rounded flex-shrink-0 overflow-hidden">
                        {imageStorageId ? (
                          <CheckoutItemImage
                            storageId={imageStorageId}
                            alt={item.product?.name || "Product"}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product?.name || "Product"}
                        </p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">{formatPrice(item.lineTotal || 0)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount{discountCode ? ` (${discountCode})` : ""}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxRatePercent}%)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
