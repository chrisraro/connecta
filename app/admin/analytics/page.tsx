"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Activity, Users, CreditCard, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminAnalyticsPage() {
    const { user, isLoaded } = useUser();
    const stats = useQuery(api.admin.getDashboardStats, user?.id ? { clerkId: user.id } : "skip");

    if (!isLoaded || stats === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    // Calculate mock growth percentages (replace with real data later)
    const userGrowth = 12.5;
    const cardGrowth = 8.3;
    const leadGrowth = 23.1;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Analytics & Insights</h1>
                <p className="text-zinc-400 mt-1">Platform metrics and performance trends</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">User Growth</CardTitle>
                        <Users className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalUsers}</div>
                        <div className="flex items-center mt-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
                            <span className="text-xs text-emerald-500 font-medium">+{userGrowth}% this month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Card Activations</CardTitle>
                        <CreditCard className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">{stats.activeCards}</div>
                        <div className="flex items-center mt-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
                            <span className="text-xs text-emerald-500 font-medium">+{cardGrowth}% this month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Leads</CardTitle>
                        <MessageSquare className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalLeads}</div>
                        <div className="flex items-center mt-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
                            <span className="text-xs text-emerald-500 font-medium">+{leadGrowth}% this month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Inventory</CardTitle>
                        <Activity className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-500">{stats.inventoryCards}</div>
                        <div className="flex items-center mt-2">
                            <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                                Available stock
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Coming Soon Notice */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <CardTitle className="text-xl">Advanced Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                            <Activity className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Charts & Visualizations Coming Soon</h3>
                        <p className="text-sm text-zinc-400 max-w-md">
                            We&apos;re building powerful analytics tools including:
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                            <li>📊 User growth trends over time</li>
                            <li>📈 NFC card activation heatmaps</li>
                            <li>📉 Lead generation funnel analysis</li>
                            <li>🎯 Conversion rate tracking</li>
                            <li>💰 Revenue and billing metrics</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
