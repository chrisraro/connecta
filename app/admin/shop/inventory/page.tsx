"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Download, Plus, Package } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function InventoryPage() {
    const { user } = useUser();
    const [restockMap, setRestockMap] = useState<Record<string, number>>({});

    const products = useQuery(api.adminShop.getProducts, user?.id ? { clerkId: user.id } : "skip");
    const lowStockProducts = useQuery(api.adminShop.getLowStockProducts, user?.id ? { clerkId: user.id } : "skip");
    const updateProduct = useMutation(api.adminShop.updateProduct);

    const isLoading = products === undefined || lowStockProducts === undefined;

    const handleRestock = async (productId: Id<"products">) => {
        if (!user?.id) return;

        const product = products?.find(p => p._id === productId);
        if (!product) return;

        const additionalStock = restockMap[productId] || 0;
        if (additionalStock <= 0) return;

        try {
            // updateProduct patches only the supplied fields, so we only need to
            // send the new inventory count.
            await updateProduct({
                clerkId: user.id,
                productId,
                inventory: product.inventory + additionalStock,
            });

            setRestockMap({ ...restockMap, [productId]: 0 });
        } catch (error) {
            console.error("Failed to restock:", error);
            alert(error instanceof Error ? error.message : "Failed to restock");
        }
    };

    const getStockStatus = (inventory: number, threshold: number) => {
        if (inventory === 0) return { label: "Out of Stock", color: "bg-red-600" };
        if (inventory <= threshold) return { label: "Low Stock", color: "bg-yellow-600" };
        return { label: "In Stock", color: "bg-green-600" };
    };

    const exportToCSV = () => {
        if (!products?.length) return;

        const headers = ["Name", "SKU", "Inventory", "Threshold", "Status"];
        const rows = products.map(p => {
            const status = getStockStatus(p.inventory, p.lowStockThreshold);
            return [p.name, p.sku, p.inventory, p.lowStockThreshold, status.label];
        });

        const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
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
                    <h1 className="text-3xl font-bold text-white">Inventory</h1>
                    <p className="text-zinc-400 mt-1">Monitor stock levels and manage restocking</p>
                </div>
                <Button onClick={exportToCSV} className="bg-zinc-800 hover:bg-zinc-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {lowStockProducts && lowStockProducts.length > 0 && (
                <Alert className="bg-red-900/20 border-red-600 text-white">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-600">Low Stock Alert</AlertTitle>
                    <AlertDescription>
                        {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} need{lowStockProducts.length === 1 ? "s" : ""} restocking.
                    </AlertDescription>
                </Alert>
            )}

            {lowStockProducts && lowStockProducts.length > 0 && (
                <Card className="bg-zinc-900 border-red-600/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            Needs Attention
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800">
                                    <TableHead className="text-zinc-400">Product</TableHead>
                                    <TableHead className="text-zinc-400">SKU</TableHead>
                                    <TableHead className="text-zinc-400">Current Stock</TableHead>
                                    <TableHead className="text-zinc-400">Threshold</TableHead>
                                    <TableHead className="text-zinc-400">Restock Qty</TableHead>
                                    <TableHead className="text-zinc-400 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStockProducts.map((product) => (
                                    <TableRow key={product._id} className="border-zinc-800">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-zinc-500" />
                                                {product.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 font-mono text-sm">{product.sku}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-red-600">
                                                {product.inventory}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-400">{product.lowStockThreshold}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={restockMap[product._id] || ""}
                                                onChange={(e) => setRestockMap({ ...restockMap, [product._id]: parseInt(e.target.value) || 0 })}
                                                className="w-24 bg-zinc-800 border-zinc-700"
                                                placeholder="Qty"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleRestock(product._id)}
                                                className="bg-green-600 hover:bg-green-700"
                                                disabled={!restockMap[product._id] || restockMap[product._id] <= 0}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Restock
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">All Products Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Product</TableHead>
                                <TableHead className="text-zinc-400">SKU</TableHead>
                                <TableHead className="text-zinc-400">Current Stock</TableHead>
                                <TableHead className="text-zinc-400">Threshold</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400">Tracking</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products?.map((product) => {
                                const status = getStockStatus(product.inventory, product.lowStockThreshold);
                                return (
                                    <TableRow key={product._id} className="border-zinc-800">
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-zinc-500" />
                                                {product.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 font-mono text-sm">{product.sku}</TableCell>
                                        <TableCell className="text-white font-medium">{product.inventory}</TableCell>
                                        <TableCell className="text-zinc-400">{product.lowStockThreshold}</TableCell>
                                        <TableCell>
                                            <Badge className={status.color}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.trackInventory ? "default" : "secondary"} className={product.trackInventory ? "bg-blue-600" : "bg-zinc-600"}>
                                                {product.trackInventory ? "Tracking" : "Not Tracking"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {products?.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            No products in inventory.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
