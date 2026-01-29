"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
// import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"; // Removed as not installed
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, CreditCard, Settings, SmartphoneNfc } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Placeholder for full sidebar component if not fully scaffolded by shadcn yet
// creating a simple layout wrapper instead if sidebar is complex
function DashboardSidebar() {
    const pathname = usePathname();

    const menuItems = [
        { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
        { title: "My Profiles", url: "/dashboard/profiles", icon: Users },
        { title: "NFC Cards", url: "/dashboard/cards", icon: SmartphoneNfc },
        { title: "Billings", url: "/dashboard/billing", icon: CreditCard },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
    ];

    return (
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 hidden md:flex flex-col">
            <div className="p-6 flex items-center gap-2 font-bold text-xl text-white">
                <SmartphoneNfc className="text-yellow-500" />
                <span>TapFolio</span>
            </div>
            <nav className="flex-1 px-4 space-y-2 py-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.url;
                    return (
                        <Link key={item.url} href={item.url}>
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-yellow-500 text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                                <item.icon className="h-5 w-5" />
                                {item.title}
                            </div>
                        </Link>
                    );
                })}
            </nav>
            <div className="p-6 border-t border-zinc-800">
                <div className="flex items-center gap-3">
                    <UserButton />
                    <div className="text-xs text-zinc-500">
                        Manage Account
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoaded } = useUser();
    const syncUser = useMutation(api.users.syncUser);

    useEffect(() => {
        if (isLoaded && user) {
            syncUser({
                clerkId: user.id,
                email: user.primaryEmailAddress?.emailAddress || "",
                name: user.fullName || "",
            });
        }
    }, [isLoaded, user, syncUser]);

    return (
        <div className="flex min-h-screen bg-black text-white">
            <DashboardSidebar />
            <main className="flex-1 overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <SmartphoneNfc className="text-yellow-500" />
                        TapFolio
                    </div>
                    <UserButton />
                </div>
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
