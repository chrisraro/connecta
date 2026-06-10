"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import { formatPHP } from "@/lib/payment";

type OptionRow = { optionName: string; optionValue: string };

type VariationForm = {
  name: string;
  sku: string;
  pricePesos: number;
  inventory: number;
  options: OptionRow[];
};

const emptyForm: VariationForm = {
  name: "",
  sku: "",
  pricePesos: 0,
  inventory: 0,
  options: [],
};

export function ProductVariationsManager({
  clerkId,
  productId,
}: {
  clerkId: string;
  productId: Id<"products">;
}) {
  const variations = useQuery(api.adminShop.getProductVariations, { clerkId, productId });
  const createVariation = useMutation(api.adminShop.createVariation);
  const updateVariation = useMutation(api.adminShop.updateVariation);
  const deleteVariation = useMutation(api.adminShop.deleteVariation);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"productVariations"> | null>(null);
  const [form, setForm] = useState<VariationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v._id);
    setForm({
      name: v.name,
      sku: v.sku,
      pricePesos: v.price / 100,
      inventory: v.inventory,
      options: v.options || [],
    });
    setOpen(true);
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { optionName: "", optionValue: "" }] });
  };

  const updateOption = (idx: number, key: keyof OptionRow, value: string) => {
    const options = [...form.options];
    options[idx] = { ...options[idx], [key]: value };
    setForm({ ...form, options });
  };

  const removeOption = (idx: number) => {
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.sku.trim()) {
      alert("Name and SKU are required");
      return;
    }
    const cleanOptions = form.options.filter(
      (o) => o.optionName.trim() && o.optionValue.trim()
    );
    setSaving(true);
    try {
      if (editingId) {
        await updateVariation({
          clerkId,
          variationId: editingId,
          name: form.name,
          sku: form.sku,
          price: Math.round(form.pricePesos * 100),
          inventory: form.inventory,
          options: cleanOptions,
        });
      } else {
        await createVariation({
          clerkId,
          productId,
          name: form.name,
          sku: form.sku,
          price: Math.round(form.pricePesos * 100),
          inventory: form.inventory,
          options: cleanOptions,
        });
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save variation:", error);
      alert(error instanceof Error ? error.message : "Failed to save variation");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variationId: Id<"productVariations">) => {
    if (!confirm("Delete this variation?")) return;
    try {
      await deleteVariation({ clerkId, variationId });
    } catch (error) {
      console.error("Failed to delete variation:", error);
      alert(error instanceof Error ? error.message : "Failed to delete variation");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Variations</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Optional product variants (e.g. size, color). Prices are entered in ₱.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Variation
        </Button>
      </CardHeader>
      <CardContent>
        {variations === undefined ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : variations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No variations yet. Add one to offer variants of this product.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Options</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((v) => (
                <TableRow key={v._id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="font-mono text-sm">{v.sku}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.options.length > 0
                      ? v.options.map((o) => `${o.optionName}: ${o.optionValue}`).join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>{formatPHP(v.price)}</TableCell>
                  <TableCell>{v.inventory}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(v._id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Variation" : "Add Variation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Large / Red"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Inventory</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.inventory}
                  onChange={(e) =>
                    setForm({ ...form, inventory: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (₱) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.pricePesos}
                onChange={(e) =>
                  setForm({ ...form, pricePesos: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
              </div>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Name (e.g. Size)"
                    value={opt.optionName}
                    onChange={(e) => updateOption(idx, "optionName", e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g. XL)"
                    value={opt.optionValue}
                    onChange={(e) => updateOption(idx, "optionValue", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(idx)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : editingId ? (
                  "Save Changes"
                ) : (
                  "Add Variation"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
