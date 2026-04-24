"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, Mail, Bell, Shield, Database, AlertTriangle, Save } from "lucide-react";
import { useState } from "react";

export default function AdminSettingsPage() {
    const { user, isLoaded } = useUser();
    const [isSaving, setIsSaving] = useState(false);

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        // TODO: Implement settings save logic
        setTimeout(() => setIsSaving(false), 1000);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
                <p className="text-zinc-400 mt-1">Configure system preferences and integrations</p>
            </div>

            {/* Email Settings */}
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
                            <Input id="smtp-user" type="email" placeholder="notifications@tapfolio.com" className="bg-zinc-950 border-zinc-800 text-white" />
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

            {/* Notification Settings */}
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

            {/* Security Settings */}
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

            {/* Data Management */}
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

            {/* Danger Zone */}
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
                            <p className="text-xs text-zinc-400 mt-1">⚠️ This action cannot be undone</p>
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
