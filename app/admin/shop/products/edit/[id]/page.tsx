"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ProductVariationsManager } from "./variations";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const [productId, setProductId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProductId(p.id));
  }, [params]);

  const categories = useQuery(
    api.adminShop.getCategories,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const allProducts = useQuery(
    api.adminShop.getProducts,
    user?.id && productId ? { clerkId: user.id } : "skip",
  );

  const product = allProducts?.find((p) => p._id === productId);

  const updateProduct = useMutation(api.adminShop.updateProduct);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    categoryId: "",
    basePrice: 0,
    compareAtPrice: 0,
    costPrice: 0,
    sku: "",
    barcode: "",
    inventory: 0,
    lowStockThreshold: 10,
    trackInventory: true,
    isPublished: false,
    isFeatured: false,
    tags: [] as string[],
    images: [] as string[],
    shippingRequired: true,
    weight: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm" as "cm" | "in",
    },
  });

  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        categoryId: product.categoryId || "",
        basePrice: product.basePrice / 100,
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice / 100 : 0,
        costPrice: product.costPrice ? product.costPrice / 100 : 0,
        sku: product.sku,
        barcode: product.barcode || "",
        inventory: product.inventory,
        lowStockThreshold: product.lowStockThreshold,
        trackInventory: product.trackInventory,
        isPublished: product.isPublished,
        isFeatured: product.isFeatured,
        tags: product.tags || [],
        images: product.images || [],
        shippingRequired: product.shippingRequired,
        weight: product.weight || 0,
        dimensions: product.dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },
      });
    }
  }, [product]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const addImage = (storageId: string) => {
    setFormData({ ...formData, images: [...formData.images, storageId] });
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !productId) return;

    if (!formData.categoryId) {
      alert("Please select a category");
      return;
    }

    if (formData.images.length === 0) {
      alert("Please add at least one image URL");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProduct({
        clerkId: user.id,
        productId: productId as Id<"products">,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        categoryId: formData.categoryId
          ? (formData.categoryId as Id<"productCategories">)
          : undefined,
        basePrice: Math.round(formData.basePrice * 100),
        compareAtPrice:
          formData.compareAtPrice > 0 ? Math.round(formData.compareAtPrice * 100) : undefined,
        costPrice: formData.costPrice > 0 ? Math.round(formData.costPrice * 100) : undefined,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        inventory: formData.inventory,
        lowStockThreshold: formData.lowStockThreshold,
        trackInventory: formData.trackInventory,
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
        tags: formData.tags,
        images: formData.images,
        primaryImageIndex: 0,
        weight: formData.weight > 0 ? formData.weight : undefined,
        dimensions:
          formData.dimensions.length > 0
            ? {
                length: formData.dimensions.length,
                width: formData.dimensions.width,
                height: formData.dimensions.height,
                unit: formData.dimensions.unit,
              }
            : undefined,
        shippingRequired: formData.shippingRequired,
      });

      router.push("/admin/shop/products");
    } catch (error) {
      console.error("Failed to update product:", error);
      alert("Failed to update product. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = !userLoaded || categories === undefined || allProducts === undefined;

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/shop/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground mt-1">Update product details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Base Price (₱) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Compare At Price (₱)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.compareAtPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      compareAtPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Original price before sale</p>
              </div>

              <div className="space-y-2">
                <Label>Cost Price (₱)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">Your cost for profit tracking</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Inventory Count *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.inventory}
                  onChange={(e) =>
                    setFormData({ ...formData, inventory: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.trackInventory}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, trackInventory: checked })
                  }
                />
                <Label>Track Inventory</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {formData.images.map((img, idx) => (
                  <ImageUploader
                    key={idx}
                    value={img}
                    onChange={(newUrl) => {
                      const newImages = [...formData.images];
                      newImages[idx] = newUrl;
                      setFormData({ ...formData, images: newImages });
                    }}
                    onRemove={() => removeImage(idx)}
                  />
                ))}

                {formData.images.length < 10 && (
                  <ImageUploader
                    onChange={(storageId) => addImage(storageId)}
                    placeholder="Add Product Image"
                  />
                )}
              </div>

              {formData.images.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Upload at least one product image. First image will be the primary image.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping & Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.shippingRequired}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, shippingRequired: checked })
                  }
                />
                <Label>Requires Shipping</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                />
                <Label>Published</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                />
                <Label>Featured</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/admin/shop/products">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Update Product"
            )}
          </Button>
        </div>
      </form>

      {user?.id && productId && (
        <ProductVariationsManager clerkId={user.id} productId={productId as Id<"products">} />
      )}
    </div>
  );
}
