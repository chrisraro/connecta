"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, CreditCard, Settings, SmartphoneNfc, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function DashboardSidebar({ className, onLinkClick }: { className?: string, onLinkClick?: () => void }) {
    const pathname = usePathname();

    const menuItems = [
        { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
        { title: "My Profiles", url: "/dashboard/profiles", icon: Users },
        { title: "NFC Cards", url: "/dashboard/cards", icon: SmartphoneNfc },
        { title: "Billings", url: "/dashboard/billing", icon: CreditCard },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
    ];

    return (
        <aside className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground ${className}`}>
            <div className="p-6 flex items-center gap-2 font-bold text-xl text-sidebar-primary">
                <SmartphoneNfc className="text-primary" />
                <span className="text-foreground">TapFolio</span>
            </div>
            <nav className="flex-1 px-4 space-y-2 py-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.url;
                    return (
                        <Link key={item.url} href={item.url} onClick={onLinkClick}>
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
                                <item.icon className="h-5 w-5" />
                                {item.title}
                            </div>
                        </Link>
                    );
                })}
            </nav>
            <div className="p-6 border-t border-sidebar-border">
                <div className="flex items-center gap-3">
                    <UserButton />
                    <div className="text-xs text-muted-foreground">
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
    const [isMobileOpen, setIsMobileOpen] = useState(false);

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
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Desktop Sidebar */}
            <DashboardSidebar className="hidden md:flex w-64" />

            <main className="flex-1 overflow-y-auto flex flex-col">
                {/* Mobile Header with Sidebar Toggle */}
                <div className="md:hidden p-4 border-b border-border flex justify-between items-center bg-sidebar">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 border-r border-sidebar-border w-72">
                                <DashboardSidebar onLinkClick={() => setIsMobileOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <span className="flex items-center gap-2">
                            <SmartphoneNfc className="text-primary w-5 h-5" />
                            TapFolio
                        </span>
                    </div>
                    <UserButton />
                </div>

                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
