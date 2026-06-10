"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Percent, Copy, Check } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function DiscountsPage() {
    const { user } = useUser();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<Id<"discounts"> | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const discounts = useQuery(api.adminShop.getDiscounts, user?.id ? { clerkId: user.id } : "skip");
    const createDiscount = useMutation(api.adminShop.createDiscount);
    const updateDiscount = useMutation(api.adminShop.updateDiscount);
    const deleteDiscount = useMutation(api.adminShop.deleteDiscount);

    const [formData, setFormData] = useState({
        code: "",
        type: "percentage" as "percentage" | "fixed",
        value: 0,
        minOrderValue: 0,
        maxDiscountAmount: 0,
        usageLimit: 0,
        validFrom: Date.now(),
        validUntil: 0,
        isActive: true,
    });

    const isLoading = discounts === undefined;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            if (editingId) {
                await updateDiscount({
                    clerkId: user.id,
                    discountId: editingId,
                    ...formData,
                });
            } else {
                await createDiscount({
                    clerkId: user.id,
                    ...formData,
                });
            }
            resetForm();
        } catch (error) {
            console.error("Failed to save discount:", error);
        }
    };

    const handleEdit = (discount: any) => {
        setEditingId(discount._id);
        setFormData({
            code: discount.code,
            type: discount.type,
            value: discount.value,
            minOrderValue: discount.minOrderValue || 0,
            maxDiscountAmount: discount.maxDiscountAmount || 0,
            usageLimit: discount.usageLimit || 0,
            validFrom: discount.validFrom,
            validUntil: discount.validUntil || 0,
            isActive: discount.isActive,
        });
        setOpen(true);
    };

    const handleDelete = async (id: Id<"discounts">) => {
        if (!user?.id) return;
        if (!confirm("Delete this discount code?")) return;

        try {
            await deleteDiscount({ clerkId: user.id, discountId: id });
        } catch (error) {
            console.error("Failed to delete discount:", error);
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const resetForm = () => {
        setFormData({
            code: "",
            type: "percentage",
            value: 0,
            minOrderValue: 0,
            maxDiscountAmount: 0,
            usageLimit: 0,
            validFrom: Date.now(),
            validUntil: 0,
            isActive: true,
        });
        setEditingId(null);
        setOpen(false);
    };

    const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
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
                    <h1 className="text-3xl font-bold text-white">Discount Codes</h1>
                    <p className="text-zinc-400 mt-1">Create and manage promotional codes</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Discount
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit" : "Create"} Discount Code</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="bg-zinc-800 border-zinc-700 uppercase"
                                        placeholder="SUMMER2024"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value: "percentage" | "fixed") => setFormData({ ...formData, type: value })}
                                    >
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Value {formData.type === "percentage" ? "(%)" : "($)"}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                                    className="bg-zinc-800 border-zinc-700"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Min Order Value ($)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.minOrderValue}
                                        onChange={(e) => setFormData({ ...formData, minOrderValue: parseInt(e.target.value) })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Discount {formData.type === "percentage" ? "($)" : "(leave 0)"}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.maxDiscountAmount}
                                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseInt(e.target.value) })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Usage Limit (0 = unlimited)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valid Until (optional)</Label>
                                    <Input
                                        type="date"
                                        value={formData.validUntil ? new Date(formData.validUntil).toISOString().split("T")[0] : ""}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value ? new Date(e.target.value).getTime() : 0 })}
                                        className="bg-zinc-800 border-zinc-700"
                                    />
                                </div>
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
                                    {editingId ? "Update" : "Create"} Discount
                                </Button>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">All Discount Codes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Code</TableHead>
                                <TableHead className="text-zinc-400">Type</TableHead>
                                <TableHead className="text-zinc-400">Value</TableHead>
                                <TableHead className="text-zinc-400">Usage</TableHead>
                                <TableHead className="text-zinc-400">Valid Until</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {discounts?.map((discount) => (
                                <TableRow key={discount._id} className="border-zinc-800">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-zinc-800 px-2 py-1 rounded text-white font-mono">
                                                {discount.code}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(discount.code)}
                                            >
                                                {copiedCode === discount.code ? (
                                                    <Check className="w-3 h-3 text-green-600" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-zinc-500" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-zinc-400 capitalize">{discount.type}</TableCell>
                                    <TableCell className="text-white font-medium">
                                        {discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {discount.usedCount}{discount.usageLimit ? ` / ${discount.usageLimit}` : " / ∞"}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {discount.validUntil ? formatDate(discount.validUntil) : "Never"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={discount.isActive ? "default" : "secondary"} className={discount.isActive ? "bg-green-600" : "bg-zinc-600"}>
                                            {discount.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(discount)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(discount._id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {discounts?.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            No discount codes yet. Create your first promotional code.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
