# Admin Shop Pages - Quick Implementation Guide

The following admin pages need to be created to complete the e-commerce system:

## Required Admin Pages

### 1. `/admin/shop/products/page.tsx` - Product List
- Data table showing all products
- Columns: Image, Name, SKU, Category, Price, Inventory, Status, Actions
- Search & filter controls
- "Add Product" button → links to `/admin/shop/products/new`
- Edit/Delete actions per row

### 2. `/admin/shop/products/new/page.tsx` - Add Product Form
- Multi-section form:
  - Basic Info (name, slug, description, category, tags)
  - Pricing (basePrice, compareAtPrice, costPrice)
  - Inventory (sku, inventory, trackInventory toggle)
  - Images (multi-upload using existing ImageUploader)
  - Shipping (weight, dimensions)
- Submit to `api.adminShop.createProduct`

### 3. `/admin/shop/products/edit/[id]/page.tsx` - Edit Product
- Same form as "new", but loads existing product data
- Submit to `api.adminShop.updateProduct`

### 4. `/admin/shop/orders/page.tsx` - Order Management
- Orders table with filters
- View order details modal
- Update order status dropdown
- Export orders button

### 5. `/admin/shop/categories/page.tsx` - Category Management
- Category list with nested display
- Add/Edit/Delete category modals
- Drag-and-drop reordering

### 6. `/admin/shop/inventory/page.tsx` - Inventory Monitoring
- Low stock alerts banner
- Product inventory table
- Quick restock input
- Export to CSV

### 7. `/admin/shop/analytics/page.tsx` - Sales Dashboard
- Revenue stats cards
- Top products list
- Sales chart (placeholder)
- Date range selector

## Implementation Approach

Since these pages follow similar patterns to existing admin pages (like `/admin/users`, `/admin/factory`), you can:

1. **Copy existing admin page structure** from `/admin/users/page.tsx`
2. **Replace data source** with `api.adminShop.*` functions
3. **Update table columns** for shop-specific data
4. **Add forms** using shadcn/ui components (already installed)

## Key Convex Functions Available

All admin functions are in `convex/adminShop.ts`:
- `createProduct`, `updateProduct`, `deleteProduct`
- `createCategory`, `updateCategory`, `deleteCategory`
- `getProducts`, `getOrders`, `getSalesStats`
- `createVariation`, `updateVariation`, `deleteVariation`
- `getLowStockProducts`

## Example: Product List Page Structure

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function AdminProductsPage() {
  const { user } = useUser();
  const products = useQuery(api.adminShop.getProducts, {
    clerkId: user?.id,
    status: "all"
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/admin/shop/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Inventory</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map(product => (
            <TableRow key={product._id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell>${(product.basePrice / 100).toFixed(2)}</TableCell>
              <TableCell>{product.inventory}</TableCell>
              <TableCell>{product.isPublished ? "Published" : "Draft"}</TableCell>
              <TableCell>
                <Link href={`/admin/shop/products/edit/${product._id}`}>
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

## Next Steps

Would you like me to:
1. Create all admin pages now (will take 5-10 more iterations)?
2. Provide this guide so you can build them yourself following the pattern?
3. Focus on just the most critical admin page (Products) and you can replicate for others?
