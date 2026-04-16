"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, ShieldCheck, User } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersPage() {
    const { user, isLoaded } = useUser();
    const usersList = useQuery(api.admin.getAllUsers, user?.id ? { clerkId: user.id } : "skip");

    if (!isLoaded || usersList === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 text-white">User Management</h1>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Account</TableHead>
                            <TableHead className="text-zinc-400">Role</TableHead>
                            <TableHead className="text-zinc-400">Credits</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usersList.length === 0 ? (
                            <TableRow className="border-zinc-800">
                                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            usersList.map((u) => (
                                <TableRow key={u.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white">{u.name}</span>
                                            <span className="text-xs text-zinc-400">{u.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {u.role === "admin" ? (
                                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 gap-1">
                                                <User className="w-3 h-3" /> Agent
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-zinc-300 font-mono">
                                        {u.credits}
                                    </TableCell>
                                    <TableCell>
                                        {u.onboardingCompleted ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                                                Onboarded
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">
                                                Pending Setup
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
