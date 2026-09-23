"use client";

import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import { formatPHP } from "@/lib/payment";
import {
  useProductVariations,
  useCreateVariation,
  useUpdateVariation,
  useDeleteVariation,
  type ProductVariation,
} from "@/hooks/useAdminShop";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

type OptionRow = { option_name: string; option_value: string };

/** product_variations.options is jsonb; Postgres cannot type its shape. */
function optionsOf(v: { options: unknown }): OptionRow[] {
  return Array.isArray(v.options) ? (v.options as OptionRow[]) : [];
}

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

export function ProductVariationsManager({ productId }: { productId: string }) {
  const { data: variations } = useProductVariations(productId);
  const createVariation = useCreateVariation().mutateAsync;
  const updateVariation = useUpdateVariation().mutateAsync;
  const deleteVariation = useDeleteVariation().mutateAsync;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VariationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (v: ProductVariation) => {
    setEditingId(v.id);
    setForm({
      name: v.name,
      sku: v.sku,
      pricePesos: v.price / 100,
      inventory: v.inventory,
      options: (v.options as OptionRow[] | null) || [],
    });
    setOpen(true);
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { option_name: "", option_value: "" }] });
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
      toast.error("Name and SKU are required");
      return;
    }
    const cleanOptions = form.options.filter((o) => o.option_name.trim() && o.option_value.trim());
    setSaving(true);
    try {
      if (editingId) {
        await updateVariation({
          id: editingId,
          patch: {
            name: form.name,
            sku: form.sku,
            price: Math.round(form.pricePesos * 100),
            inventory: form.inventory,
            options: cleanOptions,
          },
        });
      } else {
        await createVariation({
          product_id: productId,
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
      toast.error(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (variationId: string) => {
    if (!confirm("Delete this variation?")) return;
    try {
      await deleteVariation(variationId);
    } catch (error) {
      console.error("Failed to delete variation:", error);
      toast.error(toUserMessage(error));
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
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="font-mono text-sm">{v.sku}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {optionsOf(v).length > 0
                      ? optionsOf(v)
                          .map((o) => `${o.option_name}: ${o.option_value}`)
                          .join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>{formatPHP(v.price)}</TableCell>
                  <TableCell>{v.inventory}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
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
                  onChange={(e) => setForm({ ...form, inventory: parseInt(e.target.value) || 0 })}
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
                onChange={(e) => setForm({ ...form, pricePesos: parseFloat(e.target.value) || 0 })}
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
                    value={opt.option_name}
                    onChange={(e) => updateOption(idx, "option_name", e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g. XL)"
                    value={opt.option_value}
                    onChange={(e) => updateOption(idx, "option_value", e.target.value)}
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
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
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
