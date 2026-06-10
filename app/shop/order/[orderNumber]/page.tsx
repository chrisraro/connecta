"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Truck, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatPHP } from "@/lib/payment";

const formatPrice = formatPHP;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function OrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = params.orderNumber as string;
  const justPaid = searchParams.get("paid") === "1";

  const order = useQuery(api.checkout.getOrderByNumber, { orderNumber });

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The order you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/shop">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "processing":
        return <Package className="w-5 h-5" />;
      case "shipped":
      case "delivered":
        return <Truck className="w-5 h-5" />;
      case "cancelled":
      case "refunded":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-blue-500";
      case "shipped":
        return "bg-purple-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "refunded":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Order Details</h1>
        <p className="text-muted-foreground mt-1">
          Order #{order.orderNumber}
        </p>
      </div>

      {justPaid && order.paymentStatus !== "paid" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-primary/5">
          <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
          <div>
            <p className="font-medium">Confirming payment...</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ve received your payment and are confirming it. This page
              will update automatically once it&apos;s done.
            </p>
          </div>
        </div>
      )}
      {justPaid && order.paymentStatus === "paid" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium">Payment confirmed</p>
            <p className="text-sm text-muted-foreground">
              Thank you! Your order is now being processed.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full text-white ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold capitalize">{order.status}</h2>
              <p className="text-sm text-muted-foreground">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.paymentStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {item.variationName && (
                    <p className="text-sm text-muted-foreground">{item.variationName}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} x {formatPrice(item.unitPrice)}
                  </p>
                </div>
                <p className="font-bold">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && (
                <p className="text-sm text-muted-foreground">{order.shippingAddress.addressLine2}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.country}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{order.paymentProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="capitalize">
                  {order.paymentStatus}
                </Badge>
              </div>
              {order.paymentIntentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{order.paymentIntentId}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            {order.discount && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href="/shop">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}
