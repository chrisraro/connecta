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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Loader2, FolderTree } from "lucide-react";
import { Id, Doc } from "@/convex/_generated/dataModel";

export default function CategoriesPage() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"productCategories"> | null>(null);

  const categories = useQuery(
    api.adminShop.getCategories,
    user?.id ? { clerkId: user.id } : "skip",
  );
  const createCategory = useMutation(api.adminShop.createCategory);
  const updateCategory = useMutation(api.adminShop.updateCategory);
  const deleteCategory = useMutation(api.adminShop.deleteCategory);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
    isActive: true,
    parentId: "" as string | undefined,
  });

  const isLoading = categories === undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      // Convert empty strings to undefined for optional fields
      const parentId = formData.parentId || undefined;

      if (editingId) {
        await updateCategory({
          clerkId: user.id,
          categoryId: editingId,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          parentId: parentId ? (parentId as Id<"productCategories">) : undefined,
        });
      } else {
        await createCategory({
          clerkId: user.id,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          parentId: parentId ? (parentId as Id<"productCategories">) : undefined,
        });
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Failed to save category. Check console for details.");
    }
  };

  const handleEdit = (category: Doc<"productCategories">) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      parentId: category.parentId || undefined,
    });
    setOpen(true);
  };

  const handleDelete = async (id: Id<"productCategories">) => {
    if (!user?.id) return;
    if (!confirm("Delete this category? Products will need reassignment.")) return;

    try {
      await deleteCategory({ clerkId: user.id, categoryId: id });
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      sortOrder: 0,
      isActive: true,
      parentId: undefined,
    });
    setEditingId(null);
    setOpen(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
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
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage product categories and hierarchy</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Add"} Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    })
                  }
                  className="bg-muted border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-muted border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Category (Optional)</Label>
                <select
                  value={formData.parentId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md"
                >
                  <option value="">None (Top Level)</option>
                  {categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
                  }
                  className="bg-muted border-border"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                  {editingId ? "Update" : "Create"} Category
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Slug</TableHead>
                <TableHead className="text-muted-foreground">Parent</TableHead>
                <TableHead className="text-muted-foreground">Sort</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => {
                const parent = categories.find((c) => c._id === category.parentId);
                return (
                  <TableRow key={category._id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-muted-foreground" />
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{parent?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                        className={category.isActive ? "bg-green-600" : "bg-secondary"}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category._id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {categories?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No categories yet. Create your first category to organize products.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
