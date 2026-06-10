"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Activity, Loader2, Warehouse, ArrowRight, Shield, BarChart3, Settings, DollarSign, ShoppingBag, AlertTriangle, UserCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/payment";

export default function AdminDashboardPage() {
    const { user, isLoaded } = useUser();
    const stats = useQuery(api.admin.getAdminDashboard, user?.id ? { clerkId: user.id } : "skip");
    const adminStatus = useQuery(api.admin.checkAdminStatus, user?.id ? { clerkId: user.id } : "skip");

    if (!isLoaded || stats === undefined || adminStatus === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-zinc-400 mt-1">
                        Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                    </p>
                </div>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <Shield className="w-3 h-3" />
                    {adminStatus.role}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-zinc-500 mt-1">Registered accounts</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active NFC Cards</CardTitle>
                        <CreditCard className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">{stats.activeCards}</div>
                        <p className="text-xs text-zinc-500 mt-1">Paired by users</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Profiles</CardTitle>
                        <UserCircle className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalProfiles}</div>
                        <p className="text-xs text-zinc-500 mt-1">Published portfolios</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">{formatPHP(stats.revenue)}</div>
                        <p className="text-xs text-zinc-500 mt-1">From paid orders</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Paid Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.paidOrders}</div>
                        <p className="text-xs text-zinc-500 mt-1">of {stats.totalOrders} total</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Inventory Cards</CardTitle>
                        <Warehouse className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-500">{stats.inventoryCards}</div>
                        <p className="text-xs text-zinc-500 mt-1">Unassigned blanks</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Low Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={"text-3xl font-bold " + (stats.lowStockCount > 0 ? "text-red-500" : "")}>{stats.lowStockCount}</div>
                        <p className="text-xs text-zinc-500 mt-1">Products need restock</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">New Leads (7d)</CardTitle>
                        <Activity className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.newLeads7d}</div>
                        <p className="text-xs text-zinc-500 mt-1">of {stats.totalLeads} total</p>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href="/admin/users">
                        <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                        <Users className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <CardTitle className="text-lg">User Management</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-400 mb-4">
                                    Manage user accounts, roles, and permissions
                                </p>
                                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white group-hover:translate-x-1 transition-transform">
                                    View Users
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/factory">
                        <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer group">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <CardTitle className="text-lg">NFC Factory</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-400 mb-4">
                                    Register cards, scan NFC, and manage inventory
                                </p>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:translate-x-1 transition-transform">
                                    Manage Cards
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/analytics">
                        <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/10 cursor-pointer group">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-green-500" />
                                    </div>
                                    <CardTitle className="text-lg">Analytics</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-400 mb-4">
                                    View platform metrics, trends, and insights
                                </p>
                                <Button className="w-full bg-green-600 hover:bg-green-700 text-white group-hover:translate-x-1 transition-transform">
                                    View Analytics
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/audit">
                        <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer group">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <CardTitle className="text-lg">Audit Logs</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-400 mb-4">
                                    Track all platform actions and security events
                                </p>
                                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white group-hover:translate-x-1 transition-transform">
                                    View Logs
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/settings">
                        <Card className="bg-zinc-900 border-zinc-800 text-white hover:border-gray-500/50 transition-all hover:shadow-lg hover:shadow-gray-500/10 cursor-pointer group">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-gray-500/10 rounded-lg flex items-center justify-center">
                                        <Settings className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <CardTitle className="text-lg">Settings</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-400 mb-4">
                                    Configure platform settings and integrations
                                </p>
                                <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white group-hover:translate-x-1 transition-transform">
                                    Open Settings
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}
