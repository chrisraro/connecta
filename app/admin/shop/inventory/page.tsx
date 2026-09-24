"use client";

import { useState } from "react";
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
import {
  useAdminProducts,
  useUpdateProduct,
  useLowStockProducts,
  type Product,
} from "@/hooks/useAdminShop";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export default function InventoryPage() {
  const { user } = useAuth();
  const [restockMap, setRestockMap] = useState<Record<string, number>>({});

  const { data: products } = useAdminProducts();
  const { data: lowStockProducts } = useLowStockProducts();
  const updateProduct = useUpdateProduct().mutateAsync;

  const isLoading = products === undefined || lowStockProducts === undefined;

  const handleRestock = async (productId: string) => {
    if (!user?.id) return;

    const product = products?.find((p) => p.id === productId);
    if (!product) return;

    const additionalStock = restockMap[productId] || 0;
    if (additionalStock <= 0) return;

    try {
      // updateProduct patches only the supplied fields, so we only need to
      // send the new inventory count.
      await updateProduct({
        id: productId,
        patch: { inventory: product.inventory + additionalStock },
      });

      setRestockMap({ ...restockMap, [productId]: 0 });
    } catch (error) {
      console.error("Failed to restock:", error);
      toast.error(toUserMessage(error));
    }
  };

  const getStockStatus = (inventory: number, threshold: number) => {
    if (inventory === 0) return { label: "Out of Stock", color: "bg-destructive" };
    if (inventory <= threshold) return { label: "Low Stock", color: "bg-[var(--connecta-mark)]" };
    return { label: "In Stock", color: "bg-primary" };
  };

  const exportToCSV = () => {
    if (!products?.length) return;

    const headers = ["Name", "SKU", "Inventory", "Threshold", "Status"];
    const rows = products.map((p) => {
      const status = getStockStatus(p.inventory, p.low_stock_threshold);
      return [p.name, p.sku, p.inventory, p.low_stock_threshold, status.label];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Monitor stock levels and manage restocking</p>
        </div>
        <Button onClick={exportToCSV} className="bg-muted hover:bg-accent">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Alert className="border-destructive text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Low Stock Alert</AlertTitle>
          <AlertDescription>
            {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} need
            {lowStockProducts.length === 1 ? "s" : ""} restocking.
          </AlertDescription>
        </Alert>
      )}

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="bg-card border-destructive">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Product</TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground">Current Stock</TableHead>
                  <TableHead className="text-muted-foreground">Threshold</TableHead>
                  <TableHead className="text-muted-foreground">Restock Qty</TableHead>
                  <TableHead className="text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{product.inventory}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.low_stock_threshold}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={restockMap[product.id] || ""}
                        onChange={(e) =>
                          setRestockMap({
                            ...restockMap,
                            [product.id]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-24 bg-muted border-border"
                        placeholder="Qty"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleRestock(product.id)}
                        className="bg-primary hover:bg-primary"
                        disabled={!restockMap[product.id] || restockMap[product.id] <= 0}
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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">All Products Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground">SKU</TableHead>
                <TableHead className="text-muted-foreground">Current Stock</TableHead>
                <TableHead className="text-muted-foreground">Threshold</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Tracking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => {
                const status = getStockStatus(product.inventory, product.low_stock_threshold);
                return (
                  <TableRow key={product.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {product.inventory}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.low_stock_threshold}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.track_inventory ? "default" : "secondary"}
                        className={product.track_inventory ? "bg-primary" : "bg-secondary"}
                      >
                        {product.track_inventory ? "Tracking" : "Not Tracking"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {products?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No products in inventory.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
