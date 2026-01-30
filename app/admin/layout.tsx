"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, LayoutDashboard, Users, SmartphoneNfc, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useUser();
    const userRole = useQuery(api.users.getUser); // We need to ensure this returns the role

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        }
    }, [isLoaded, isSignedIn, router]);

    // Effect to redirect if not admin
    useEffect(() => {
        if (userRole !== undefined) {
            if (userRole === null || userRole.role !== "admin") {
                router.push("/dashboard"); // Kick out non-admins
            }
        }
    }, [userRole, router]);

    if (!isLoaded || userRole === undefined) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-white">
                <Loader2 className="animate-spin text-red-600 w-10 h-10" />
            </div>
        );
    }

    // Double check before rendering children
    if (userRole === null || userRole.role !== "admin") {
        return null; // Will redirect via useEffect
    }

    return (
        <div className="flex min-h-screen bg-black text-white">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-zinc-950 border-r border-zinc-900 hidden md:flex flex-col">
                <div className="p-6 flex items-center gap-2 font-bold text-xl text-red-600">
                    <SmartphoneNfc />
                    <span>TapFolio Admin</span>
                </div>

                <div className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Super User Control
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    <Link href="/admin">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                            <LayoutDashboard className="h-5 w-5" />
                            Overview
                        </div>
                    </Link>
                    <Link href="/admin/users">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                            <Users className="h-5 w-5" />
                            User Management
                        </div>
                    </Link>
                    <Link href="/admin/factory">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
                            <SmartphoneNfc className="h-5 w-5" />
                            NFC Factory
                        </div>
                    </Link>
                </nav>

                <div className="p-6 border-t border-zinc-900">
                    <Button variant="ghost" className="w-full justify-start text-zinc-500 hover:text-red-500" onClick={() => router.push("/dashboard")}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Back to User App
                    </Button>
                </div>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto bg-zinc-950/50">
                {children}
            </main>
        </div>
    );
}
