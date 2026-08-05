"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Eye, Package, Truck, CheckCircle, XCircle, RefreshCw, Download, Search, AlertTriangle } from "lucide-react";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { formatPHP } from "@/lib/payment";

const formatPrice = formatPHP;

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function OrdersPage() {
    const { user } = useUser();
    const [selectedOrder, setSelectedOrder] = useState<Doc<"orders"> | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [paymentFilter, setPaymentFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    const orders = useQuery(api.adminShop.getOrders, user?.id ? { clerkId: user.id } : "skip");
    const updateOrderStatus = useMutation(api.adminShop.updateOrderStatus);
    const markOrderRefunded = useMutation(api.adminShop.markOrderRefunded);

    const isLoading = orders === undefined;

    const handleStatusUpdate = async (orderId: Id<"orders">, newStatus: string) => {
        if (!user?.id) return;
        const validStatus = newStatus as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
        try {
            await updateOrderStatus({
                clerkId: user.id,
                orderId,
                status: validStatus,
            });
            setSelectedOrder((prev: Doc<"orders"> | null) => prev ? { ...prev, status: validStatus } : prev);
        } catch (error) {
            console.error("Failed to update order status:", error);
            alert(error instanceof Error ? error.message : "Failed to update status");
        }
    };

    const handleMarkRefunded = async (orderId: Id<"orders">) => {
        if (!user?.id) return;
        if (!confirm(
            "Mark this PAID order as REFUNDED?\n\n" +
            "This restores inventory and records the refund. " +
            "You must still issue the actual money refund in the PayRex dashboard."
        )) return;
        try {
            await markOrderRefunded({ clerkId: user.id, orderId });
            setSelectedOrder((prev: Doc<"orders"> | null) =>
                prev ? { ...prev, status: "refunded", paymentStatus: "refunded" } : prev
            );
        } catch (error) {
            console.error("Failed to mark refunded:", error);
            alert(error instanceof Error ? error.message : "Failed to mark refunded");
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-600",
            processing: "bg-blue-600",
            shipped: "bg-purple-600",
            delivered: "bg-green-600",
            cancelled: "bg-red-600",
            refunded: "bg-secondary",
        };
        return colors[status] || "bg-secondary";
    };

    const getPaymentStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-600",
            paid: "bg-green-600",
            failed: "bg-red-600",
            refunded: "bg-secondary",
        };
        return colors[status] || "bg-secondary";
    };

    const searchLower = search.trim().toLowerCase();
    const filteredOrders = orders
        ?.filter((order) => statusFilter === "all" || order.status === statusFilter)
        .filter((order) => paymentFilter === "all" || order.paymentStatus === paymentFilter)
        .filter((order) => {
            if (!searchLower) return true;
            return (
                order.orderNumber.toLowerCase().includes(searchLower) ||
                (order.guestEmail || "").toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    const exportToCSV = () => {
        if (!filteredOrders?.length) return;
        const headers = [
            "Order Number", "Date", "Customer Email", "Status", "Payment Status",
            "Items", "Subtotal", "Shipping", "Tax", "Discount", "Total", "Currency",
            "Discount Code", "PayRex Checkout ID", "Payment Intent ID",
        ];
        const rows = filteredOrders.map((o) => [
            o.orderNumber,
            new Date(o.createdAt).toISOString(),
            o.guestEmail || "",
            o.status,
            o.paymentStatus,
            o.items.reduce((s, i) => s + i.quantity, 0),
            (o.subtotal / 100).toFixed(2),
            (o.shipping / 100).toFixed(2),
            (o.tax / 100).toFixed(2),
            ((o.discount || 0) / 100).toFixed(2),
            (o.total / 100).toFixed(2),
            o.currency,
            o.appliedDiscountCode || "",
            o.payrexCheckoutId || "",
            o.paymentIntentId || "",
        ]);
        const escapeCsv = (val: unknown) => {
            const s = String(val ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage customer orders and fulfillment</p>
                </div>
                <Button onClick={exportToCSV} className="bg-muted hover:bg-accent" disabled={!filteredOrders?.length}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by order # or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-card border-border"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-card border-border">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-full md:w-[180px] bg-card border-border">
                        <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">
                        All Orders ({filteredOrders?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border">
                                <TableHead className="text-muted-foreground">Order #</TableHead>
                                <TableHead className="text-muted-foreground">Date</TableHead>
                                <TableHead className="text-muted-foreground">Customer</TableHead>
                                <TableHead className="text-muted-foreground">Items</TableHead>
                                <TableHead className="text-muted-foreground">Total</TableHead>
                                <TableHead className="text-muted-foreground">Payment</TableHead>
                                <TableHead className="text-muted-foreground">Status</TableHead>
                                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders?.map((order) => (
                                <TableRow key={order._id} className="border-border">
                                    <TableCell className="font-mono text-foreground font-medium">
                                        {order.orderNumber}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {formatDate(order.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <span className="text-xs">{order.guestEmail || "Registered user"}</span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {order.items.length}
                                    </TableCell>
                                    <TableCell className="text-foreground font-medium">
                                        {formatPrice(order.total)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                                            {order.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(order.status)}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredOrders?.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No orders found.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="text-sm text-muted-foreground">Update Status:</span>
                                <Select
                                    value={selectedOrder.status}
                                    onValueChange={(value) => handleStatusUpdate(selectedOrder._id, value)}
                                >
                                    <SelectTrigger className="w-[200px] bg-muted border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">
                                            <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Pending</div>
                                        </SelectItem>
                                        <SelectItem value="processing">
                                            <div className="flex items-center gap-2"><Package className="w-4 h-4" /> Processing</div>
                                        </SelectItem>
                                        <SelectItem value="shipped">
                                            <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Shipped</div>
                                        </SelectItem>
                                        <SelectItem value="delivered">
                                            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Delivered</div>
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            <div className="flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancelled</div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {selectedOrder.paymentStatus === "paid" && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleMarkRefunded(selectedOrder._id)}
                                    >
                                        Mark Refunded
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-600/30 bg-amber-600/5 text-sm">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-muted-foreground">
                                    Marking an order refunded here restores inventory and records the refund,
                                    but the actual money refund must be issued in the{" "}
                                    <a
                                        href="https://dashboard.payrexhq.com"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-amber-400 underline"
                                    >
                                        PayRex dashboard
                                    </a>.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="bg-muted border-border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-muted-foreground">Shipping Address</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <p className="text-foreground">{selectedOrder.shippingAddress.fullName}</p>
                                        <p className="text-muted-foreground">{selectedOrder.shippingAddress.addressLine1}</p>
                                        {selectedOrder.shippingAddress.addressLine2 && (
                                            <p className="text-muted-foreground">{selectedOrder.shippingAddress.addressLine2}</p>
                                        )}
                                        <p className="text-muted-foreground">
                                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}
                                        </p>
                                        <p className="text-muted-foreground">{selectedOrder.shippingAddress.country}</p>
                                        <p className="text-muted-foreground mt-2">{selectedOrder.shippingAddress.phone}</p>
                                        {selectedOrder.guestEmail && (
                                            <p className="text-muted-foreground mt-1">{selectedOrder.guestEmail}</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-muted border-border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-muted-foreground">Payment Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <p className="text-foreground">Provider: {selectedOrder.paymentProvider}</p>
                                        <p className="flex items-center gap-2">
                                            Status: <Badge className={getPaymentStatusColor(selectedOrder.paymentStatus)}>{selectedOrder.paymentStatus}</Badge>
                                        </p>
                                        {selectedOrder.payrexCheckoutId && (
                                            <p className="text-muted-foreground text-xs font-mono break-all">
                                                PayRex Checkout: {selectedOrder.payrexCheckoutId}
                                            </p>
                                        )}
                                        {selectedOrder.paymentIntentId && (
                                            <p className="text-muted-foreground text-xs font-mono break-all">
                                                Payment Intent: {selectedOrder.paymentIntentId}
                                            </p>
                                        )}
                                        {selectedOrder.paidAt && (
                                            <p className="text-muted-foreground text-xs">Paid: {formatDate(selectedOrder.paidAt)}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <div>
                                                <p className="text-foreground font-medium">{item.productName}</p>
                                                {item.variationName && (
                                                    <p className="text-sm text-muted-foreground">{item.variationName}</p>
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    {item.quantity} x {formatPrice(item.unitPrice)}
                                                </p>
                                            </div>
                                            <p className="text-foreground font-medium">{formatPrice(item.total)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Card className="bg-muted border-border">
                                <CardContent className="pt-6 space-y-2">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(selectedOrder.subtotal)}</span>
                                    </div>
                                    {(selectedOrder.discount ?? 0) > 0 && (
                                        <div className="flex justify-between text-green-400">
                                            <span>Discount{selectedOrder.appliedDiscountCode ? ` (${selectedOrder.appliedDiscountCode})` : ""}</span>
                                            <span>-{formatPrice(selectedOrder.discount ?? 0)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Shipping</span>
                                        <span>{selectedOrder.shipping === 0 ? "Free" : formatPrice(selectedOrder.shipping)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Tax</span>
                                        <span>{formatPrice(selectedOrder.tax)}</span>
                                    </div>
                                    <div className="flex justify-between text-foreground font-bold text-lg pt-2 border-t border-border">
                                        <span>Total</span>
                                        <span>{formatPrice(selectedOrder.total)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
