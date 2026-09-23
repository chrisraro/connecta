"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  useAdminProducts,
  useAdminCategories,
  useDeleteProduct,
  type Product,
} from "@/hooks/useAdminShop";
import { useAuth } from "@/components/auth/AuthProvider";
import { imageUrl as resolveImageUrl } from "@/lib/imageUrl";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

function formatPrice(priceInCents: number): string {
  const amount = (priceInCents / 100).toFixed(2);
  return `₱${amount}`;
}

// Helper component to resolve and display storage images
function ProductImage({ storageId, alt }: { storageId: string; alt: string }) {
  const imageUrl = resolveImageUrl(storageId);

  const displayUrl = storageId?.startsWith("http") ? storageId : imageUrl;

  if (!displayUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        Loading...
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
        // that was already a full URL skips the optimizer instead of
        // throwing on an unlisted host.
        unoptimized={Boolean(storageId?.startsWith("http"))}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  const { user, isLoaded } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: products } = useAdminProducts();

  const { data: categories } = useAdminCategories();

  const deleteProduct = useDeleteProduct().mutateAsync;

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await deleteProduct(productId);
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error(toUserMessage(error));
    }
  };

  if (!isLoaded || products === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <Link href="/admin/shop/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryId || "all"}
          onValueChange={(val) => setCategoryId(val === "all" ? undefined : val)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const category = categories?.find((c) => c.id === product.category_id);
                const imageUrl = product.images[product.primary_image_index] || product.images[0];

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <ProductImage storageId={imageUrl} alt={product.name} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.is_featured && (
                            <Badge className="mt-1 bg-amber-500 text-xs">Featured</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{category?.name || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatPrice(product.base_price)}</p>
                        {product.compare_at_price &&
                          product.compare_at_price > product.base_price && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.compare_at_price)}
                            </p>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.track_inventory ? (
                        <Badge
                          variant="secondary"
                          className={
                            product.inventory === 0
                              ? "bg-red-500/10 text-red-600"
                              : product.inventory <= product.low_stock_threshold
                                ? "bg-yellow-500/10 text-yellow-600"
                                : "bg-green-500/10 text-green-600"
                          }
                        >
                          {product.inventory}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_published ? "default" : "secondary"}>
                        {product.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/shop/products/edit/${product.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {products.length} product{products.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
