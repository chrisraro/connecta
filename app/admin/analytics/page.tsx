"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, ShoppingBag, TrendingUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/payment";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-600",
    processing: "bg-blue-600",
    shipped: "bg-purple-600",
    delivered: "bg-green-600",
    cancelled: "bg-red-600",
    refunded: "bg-secondary",
};

export default function AdminAnalyticsPage() {
    const { user, isLoaded } = useUser();
    const analytics = useQuery(api.adminShop.getShopAnalytics, user?.id ? { clerkId: user.id } : "skip");

    if (!isLoaded || analytics === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    const maxRevenue = Math.max(1, ...analytics.revenueByDay.map((d) => d.revenue));
    const maxTopQty = Math.max(1, ...analytics.topProducts.map((p) => p.quantity));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Sales Analytics</h1>
                <p className="text-muted-foreground mt-1">Revenue, orders, and top products (PHP)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-border text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">{formatPHP(analytics.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">From paid orders</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Paid Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analytics.paidOrderCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">of {analytics.totalOrders} total</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatPHP(analytics.averageOrderValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Per paid order</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border text-foreground">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">{analytics.statusCounts.delivered}</div>
                        <p className="text-xs text-muted-foreground mt-1">Completed orders</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card border-border text-foreground">
                <CardHeader>
                    <CardTitle className="text-lg">Revenue (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    {analytics.totalRevenue === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No paid orders yet. Revenue will appear here as orders are paid.
                        </p>
                    ) : (
                        <div className="w-full">
                            <div className="flex items-end gap-1 h-48">
                                {analytics.revenueByDay.map((day) => {
                                    const heightPct = (day.revenue / maxRevenue) * 100;
                                    return (
                                        <div
                                            key={day.date}
                                            className="group relative flex-1 flex flex-col justify-end h-full"
                                            title={day.label + ": " + formatPHP(day.revenue) + " (" + day.orders + " orders)"}
                                        >
                                            <div
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-t transition-colors"
                                                style={{ height: Math.max(heightPct, day.revenue > 0 ? 2 : 0) + "%" }}
                                            />
                                            <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-muted border border-border px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                {formatPHP(day.revenue)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>{analytics.revenueByDay[0]?.label}</span>
                                <span>{analytics.revenueByDay[Math.floor(analytics.revenueByDay.length / 2)]?.label}</span>
                                <span>{analytics.revenueByDay[analytics.revenueByDay.length - 1]?.label}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border text-foreground">
                    <CardHeader>
                        <CardTitle className="text-lg">Orders by Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Object.entries(analytics.statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                                <Badge className={STATUS_COLORS[status] || "bg-secondary"}>{status}</Badge>
                                <span className="font-semibold">{count}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-card border-border text-foreground">
                    <CardHeader>
                        <CardTitle className="text-lg">Top Products (by quantity)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {analytics.topProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No sales yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {analytics.topProducts.map((p) => (
                                    <div key={p.productId} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-foreground truncate pr-2">{p.productName}</span>
                                            <span className="text-muted-foreground whitespace-nowrap">
                                                {p.quantity} sold - {formatPHP(p.revenue)}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded"
                                                style={{ width: (p.quantity / maxTopQty) * 100 + "%" }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
