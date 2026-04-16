"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Activity, DollarSign, Loader2, Warehouse } from "lucide-react";

export default function AdminDashboardPage() {
    const { user, isLoaded } = useUser();
    const stats = useQuery(api.admin.getDashboardStats, user?.id ? { clerkId: user.id } : "skip");

    if (!isLoaded || stats === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 text-white">Admin Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-zinc-500 mt-1">Registered accounts</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Inventory Cards</CardTitle>
                        <Warehouse className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-500">{stats.inventoryCards}</div>
                        <p className="text-xs text-zinc-500 mt-1">Unassigned blanks</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active NFC Cards</CardTitle>
                        <CreditCard className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">{stats.activeCards}</div>
                        <p className="text-xs text-zinc-500 mt-1">Paired by users</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Leads</CardTitle>
                        <Activity className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalLeads}</div>
                        <p className="text-xs text-zinc-500 mt-1">Generated system-wide</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
