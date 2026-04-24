"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Filter, Download, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function AdminAuditPage() {
    const { user, isLoaded } = useUser();
    
    // TODO: Create getAuditLogs query in Convex
    // For now, show placeholder
    const auditLogs: any[] = [];

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getActionColor = (action: string) => {
        if (action.includes("create") || action.includes("register")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (action.includes("delete") || action.includes("revoke")) return "bg-red-500/10 text-red-500 border-red-500/20";
        if (action.includes("update") || action.includes("edit")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
                    <p className="text-zinc-400 mt-1">Security events and platform activity tracking</p>
                </div>
                <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">
                    <Download className="w-4 h-4 mr-2" />
                    Export Logs
                </Button>
            </div>

            {/* Filters */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-zinc-400" />
                        <CardTitle className="text-lg">Filters</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Date Range</label>
                            <Button variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-400">
                                <Calendar className="w-4 h-4 mr-2" />
                                Last 7 days
                            </Button>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Action Type</label>
                            <Button variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-400">
                                All Actions
                            </Button>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">User</label>
                            <Button variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-400">
                                All Users
                            </Button>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Resource</label>
                            <Button variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-400">
                                All Resources
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Table */}
            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {auditLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <Shield className="w-8 h-8 text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Audit Logging Coming Soon</h3>
                            <p className="text-sm text-zinc-400 max-w-md mb-6">
                                We&apos;re implementing comprehensive audit logging to track:
                            </p>
                            <ul className="space-y-2 text-sm text-zinc-400 text-left max-w-md">
                                <li>🔐 User authentication events</li>
                                <li>📝 Profile creation and updates</li>
                                <li>💳 NFC card registrations and activations</li>
                                <li>👥 Admin role changes</li>
                                <li>🗑️ Data deletion events</li>
                                <li>📊 Export and download activities</li>
                            </ul>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead className="text-zinc-400">Timestamp</TableHead>
                                    <TableHead className="text-zinc-400">User</TableHead>
                                    <TableHead className="text-zinc-400">Action</TableHead>
                                    <TableHead className="text-zinc-400">Resource</TableHead>
                                    <TableHead className="text-zinc-400">IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditLogs.map((log) => (
                                    <TableRow key={log._id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="text-xs text-zinc-400 font-mono">
                                            {formatTimestamp(log.timestamp)}
                                        </TableCell>
                                        <TableCell className="text-sm text-white">{log.userName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getActionColor(log.action)}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-300">{log.resource}</TableCell>
                                        <TableCell className="text-xs text-zinc-500 font-mono">{log.ipAddress}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
