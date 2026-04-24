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
import { Loader2, Eye, Package, Truck, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

function formatPrice(priceInCents: number): string {
    return `$${(priceInCents / 100).toFixed(2)}`;
}

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
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const orders = useQuery(api.adminShop.getOrders, user?.id ? { clerkId: user.id } : "skip");
    const updateOrderStatus = useMutation(api.adminShop.updateOrderStatus);

    const isLoading = orders === undefined;

    const handleStatusUpdate = async (orderId: Id<"orders">, newStatus: string) => {
        if (!user?.id) return;

        try {
            await updateOrderStatus({
                clerkId: user.id,
                orderId,
                status: newStatus as any,
            });
        } catch (error) {
            console.error("Failed to update order status:", error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-600",
            processing: "bg-blue-600",
            shipped: "bg-purple-600",
            delivered: "bg-green-600",
            cancelled: "bg-red-600",
            refunded: "bg-zinc-600",
        };
        return colors[status] || "bg-zinc-600";
    };

    const getPaymentStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-600",
            paid: "bg-green-600",
            failed: "bg-red-600",
            refunded: "bg-zinc-600",
        };
        return colors[status] || "bg-zinc-600";
    };

    const filteredOrders = orders?.filter(order => 
        statusFilter === "all" || order.status === statusFilter
    ).sort((a, b) => b.createdAt - a.createdAt);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Orders</h1>
                <p className="text-zinc-400 mt-1">Manage customer orders and fulfillment</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Orders Table */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">All Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Order #</TableHead>
                                <TableHead className="text-zinc-400">Date</TableHead>
                                <TableHead className="text-zinc-400">Customer</TableHead>
                                <TableHead className="text-zinc-400">Items</TableHead>
                                <TableHead className="text-zinc-400">Total</TableHead>
                                <TableHead className="text-zinc-400">Payment</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders?.map((order) => (
                                <TableRow key={order._id} className="border-zinc-800">
                                    <TableCell className="font-mono text-white font-medium">
                                        {order.orderNumber}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {formatDate(order.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {order.userId ? (
                                            <span className="text-xs">{order.guestEmail || "User"}</span>
                                        ) : (
                                            <span className="text-xs">{order.guestEmail}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {order.items.length}
                                    </TableCell>
                                    <TableCell className="text-white font-medium">
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
                        <div className="text-center py-12 text-zinc-500">
                            No orders found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Status Update */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-zinc-400">Update Status:</span>
                                <Select
                                    value={selectedOrder.status}
                                    onValueChange={(value) => handleStatusUpdate(selectedOrder._id, value)}
                                >
                                    <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className="w-4 h-4" /> Pending
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="processing">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4" /> Processing
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="shipped">
                                            <div className="flex items-center gap-2">
                                                <Truck className="w-4 h-4" /> Shipped
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="delivered">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4" /> Delivered
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4" /> Cancelled
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Customer Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-zinc-800 border-zinc-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-zinc-400">Shipping Address</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <p className="text-white">{selectedOrder.shippingAddress.fullName}</p>
                                        <p className="text-zinc-400">{selectedOrder.shippingAddress.addressLine1}</p>
                                        {selectedOrder.shippingAddress.addressLine2 && (
                                            <p className="text-zinc-400">{selectedOrder.shippingAddress.addressLine2}</p>
                                        )}
                                        <p className="text-zinc-400">
                                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}
                                        </p>
                                        <p className="text-zinc-400">{selectedOrder.shippingAddress.country}</p>
                                        <p className="text-zinc-400 mt-2">{selectedOrder.shippingAddress.phone}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-zinc-800 border-zinc-700">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-zinc-400">Payment Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <p className="text-white">Provider: {selectedOrder.paymentProvider}</p>
                                        <p>
                                            Status: <Badge className={getPaymentStatusColor(selectedOrder.paymentStatus)}>{selectedOrder.paymentStatus}</Badge>
                                        </p>
                                        {selectedOrder.paymentIntentId && (
                                            <p className="text-zinc-400 text-xs font-mono">ID: {selectedOrder.paymentIntentId}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Order Items */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                                            <div>
                                                <p className="text-white font-medium">{item.productName}</p>
                                                {item.variationName && (
                                                    <p className="text-sm text-zinc-400">{item.variationName}</p>
                                                )}
                                                <p className="text-sm text-zinc-400">Qty: {item.quantity}</p>
                                            </div>
                                            <p className="text-white font-medium">{formatPrice(item.total)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Order Summary */}
                            <Card className="bg-zinc-800 border-zinc-700">
                                <CardContent className="pt-6 space-y-2">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(selectedOrder.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Shipping</span>
                                        <span>{formatPrice(selectedOrder.shipping)}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Tax</span>
                                        <span>{formatPrice(selectedOrder.tax)}</span>
                                    </div>
                                    {selectedOrder.discount && (
                                        <div className="flex justify-between text-green-400">
                                            <span>Discount</span>
                                            <span>-{formatPrice(selectedOrder.discount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-zinc-700">
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
