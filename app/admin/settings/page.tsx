"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, Mail, Bell, Shield, Database, AlertTriangle, Save, Store } from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminSettingsPage() {
    const { user, isLoaded } = useUser();
    const [isSaving, setIsSaving] = useState(false);

    // ---- Shop settings (tax / shipping) ----
    const shopSettings = useQuery(api.settings.getShopSettings, {});
    const updateShopSettings = useMutation(api.settings.updateShopSettings);
    const [shopSaving, setShopSaving] = useState(false);
    const [shopSavedAt, setShopSavedAt] = useState<number | null>(null);
    const [shopForm, setShopForm] = useState({
        taxRatePercent: 0,
        shippingFlatRatePesos: 500,
        freeShippingThresholdPesos: 2500,
    });

    // Hydrate the form once settings load (centavos -> pesos for the UI).
    useEffect(() => {
        if (shopSettings) {
            setShopForm({
                taxRatePercent: shopSettings.taxRatePercent,
                shippingFlatRatePesos: shopSettings.shippingFlatRateCentavos / 100,
                freeShippingThresholdPesos: shopSettings.freeShippingThresholdCentavos / 100,
            });
        }
    }, [shopSettings]);

    // ---- Plan pricing (Pro / Business monthly price in ₱) ----
    const planPricing = useQuery(api.billing.getPlanPricing, {});
    const updatePlanPricing = useMutation(api.billing.updatePlanPricing);
    const [planSaving, setPlanSaving] = useState(false);
    const [planSavedAt, setPlanSavedAt] = useState<number | null>(null);
    const [planForm, setPlanForm] = useState({ proPesos: 299, businessPesos: 999 });

    useEffect(() => {
        if (planPricing) {
            setPlanForm({
                proPesos: planPricing.pro / 100,
                businessPesos: planPricing.business / 100,
            });
        }
    }, [planPricing]);

    const handleSavePlanPricing = async () => {
        setPlanSaving(true);
        try {
            await updatePlanPricing({
                proCentavos: Math.round(planForm.proPesos * 100),
                businessCentavos: Math.round(planForm.businessPesos * 100),
            });
            setPlanSavedAt(Date.now());
        } catch (error) {
            alert(error instanceof Error ? error.message : "Failed to save plan pricing");
        } finally {
            setPlanSaving(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1000);
    };

    const handleSaveShopSettings = async () => {
        setShopSaving(true);
        try {
            await updateShopSettings({
                taxRatePercent: shopForm.taxRatePercent,
                shippingFlatRateCentavos: Math.round(shopForm.shippingFlatRatePesos * 100),
                freeShippingThresholdCentavos: Math.round(shopForm.freeShippingThresholdPesos * 100),
            });
            setShopSavedAt(Date.now());
        } catch (error) {
            console.error("Failed to save shop settings:", error);
            alert(error instanceof Error ? error.message : "Failed to save shop settings");
        } finally {
            setShopSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
                <p className="text-zinc-400 mt-1">Configure system preferences and integrations</p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Shop Settings</CardTitle>
                            <CardDescription className="text-zinc-400">
                                Tax and shipping rates applied at checkout (PHP). Used by the storefront and order totals.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {shopSettings === undefined ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="animate-spin text-emerald-500 w-6 h-6" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Tax Rate (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={shopForm.taxRatePercent}
                                        onChange={(e) =>
                                            setShopForm({ ...shopForm, taxRatePercent: parseFloat(e.target.value) || 0 })
                                        }
                                        className="bg-zinc-950 border-zinc-800 text-white"
                                    />
                                    <p className="text-xs text-zinc-500">0 = no tax</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Flat Shipping (₱)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={shopForm.shippingFlatRatePesos}
                                        onChange={(e) =>
                                            setShopForm({ ...shopForm, shippingFlatRatePesos: parseFloat(e.target.value) || 0 })
                                        }
                                        className="bg-zinc-950 border-zinc-800 text-white"
                                    />
                                    <p className="text-xs text-zinc-500">Charged below the free-shipping threshold</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Free Shipping Over (₱)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={shopForm.freeShippingThresholdPesos}
                                        onChange={(e) =>
                                            setShopForm({ ...shopForm, freeShippingThresholdPesos: parseFloat(e.target.value) || 0 })
                                        }
                                        className="bg-zinc-950 border-zinc-800 text-white"
                                    />
                                    <p className="text-xs text-zinc-500">Orders at/above this ship free</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleSaveShopSettings}
                                    disabled={shopSaving}
                                >
                                    {shopSaving ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Save Shop Settings</>
                                    )}
                                </Button>
                                {shopSavedAt && !shopSaving && (
                                    <span className="text-xs text-emerald-500">Saved</span>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Settings className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Plan Pricing</CardTitle>
                            <CardDescription className="text-zinc-400">
                                Monthly (30-day) subscription prices in PHP. Used on the billing page and landing pricing.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {planPricing === undefined ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="animate-spin text-primary w-6 h-6" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Pro — monthly (₱)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={planForm.proPesos}
                                        onChange={(e) =>
                                            setPlanForm({ ...planForm, proPesos: parseFloat(e.target.value) || 0 })
                                        }
                                        className="bg-zinc-950 border-zinc-800 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Business — monthly (₱)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={planForm.businessPesos}
                                        onChange={(e) =>
                                            setPlanForm({ ...planForm, businessPesos: parseFloat(e.target.value) || 0 })
                                        }
                                        className="bg-zinc-950 border-zinc-800 text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={handleSavePlanPricing}
                                    disabled={planSaving}
                                >
                                    {planSaving ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Save Plan Pricing</>
                                    )}
                                </Button>
                                {planSavedAt && !planSaving && (
                                    <span className="text-xs text-primary">Saved</span>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Email Configuration</CardTitle>
                            <CardDescription className="text-zinc-400">SMTP settings and notification templates</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtp-host">SMTP Host</Label>
                            <Input id="smtp-host" placeholder="smtp.gmail.com" className="bg-zinc-950 border-zinc-800 text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtp-port">SMTP Port</Label>
                            <Input id="smtp-port" placeholder="587" className="bg-zinc-950 border-zinc-800 text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtp-user">SMTP Username</Label>
                            <Input id="smtp-user" type="email" placeholder="notifications@herald.ph" className="bg-zinc-950 border-zinc-800 text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtp-pass">SMTP Password</Label>
                            <Input id="smtp-pass" type="password" placeholder="••••••••" className="bg-zinc-950 border-zinc-800 text-white" />
                        </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled>
                        <Save className="w-4 h-4 mr-2" />
                        Save Email Settings
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <Bell className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Notifications</CardTitle>
                            <CardDescription className="text-zinc-400">System alerts and user notifications</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">New User Registration Alerts</Label>
                            <p className="text-xs text-zinc-400 mt-1">Get notified when new users sign up</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">NFC Card Activation Alerts</Label>
                            <p className="text-xs text-zinc-400 mt-1">Track card activation events</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">Lead Generation Notifications</Label>
                            <p className="text-xs text-zinc-400 mt-1">Alert on new lead submissions</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">Weekly Analytics Report</Label>
                            <p className="text-xs text-zinc-400 mt-1">Receive weekly platform summary</p>
                        </div>
                        <Switch />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Security</CardTitle>
                            <CardDescription className="text-zinc-400">Authentication and access control</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">Two-Factor Authentication (2FA)</Label>
                            <p className="text-xs text-zinc-400 mt-1">Require 2FA for all admin accounts</p>
                        </div>
                        <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">Session Timeout</Label>
                            <p className="text-xs text-zinc-400 mt-1">Auto-logout after inactivity</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-white">IP Whitelisting</Label>
                            <p className="text-xs text-zinc-400 mt-1">Restrict admin access to specific IPs</p>
                        </div>
                        <Switch />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <Database className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Data Management</CardTitle>
                            <CardDescription className="text-zinc-400">Export, backup, and data retention</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <Button variant="outline" className="bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-800" disabled>
                            Export All Users
                        </Button>
                        <Button variant="outline" className="bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-800" disabled>
                            Export All Leads
                        </Button>
                        <Button variant="outline" className="bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-800" disabled>
                            Backup Database
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-red-500/20 text-white">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg text-red-500">Danger Zone</CardTitle>
                            <CardDescription className="text-zinc-400">Irreversible actions - proceed with caution</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <div>
                            <Label className="text-white font-medium">Reset All NFC Cards</Label>
                            <p className="text-xs text-zinc-400 mt-1">Return all cards to inventory status</p>
                        </div>
                        <Button variant="destructive" disabled>
                            Reset Cards
                        </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <div>
                            <Label className="text-white font-medium">Purge All Leads</Label>
                            <p className="text-xs text-zinc-400 mt-1">Delete all lead data permanently</p>
                        </div>
                        <Button variant="destructive" disabled>
                            Purge Leads
                        </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <div>
                            <Label className="text-white font-medium">Delete All User Data</Label>
                            <p className="text-xs text-zinc-400 mt-1">This action cannot be undone</p>
                        </div>
                        <Button variant="destructive" disabled>
                            Delete Everything
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
