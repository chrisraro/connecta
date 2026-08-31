"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, LayoutDashboard, Users, SmartphoneNfc, LogOut, Menu, BarChart3, FileText, Settings, ShoppingCart, Package, Tags, ShoppingCart as CartIcon, TrendingUp, Percent } from "lucide-react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname(); // Move hooks BEFORE any conditional returns
    const { user, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const syncUser = useMutation(api.users.syncUser);

    /*
      This shell used to gate on users.role === "admin", which is a DIFFERENT
      admin system from the one that actually authorises admin data. Every
      admin Convex function calls authz.ts:requireAdmin, which reads the
      `admins` table — and nothing in admin.ts ever writes users.role. So the
      two could drift apart: setupFirstAdmin grants a real `admins` row yet
      left users.role as "agent", which rendered the console unreachable even
      for a legitimate superadmin.

      Gating on checkAdminStatus makes the shell agree with the data layer by
      construction: one source of truth, the `admins` table. It is also
      auth-checked server-side (it compares ctx.auth identity against the
      clerkId), so it cannot be spoofed by passing someone else's id.
    */
    const adminStatus = useQuery(
        api.admin.checkAdminStatus,
        user?.id ? { clerkId: user.id } : "skip"
    );

    // Ensure a users row exists for this Clerk account. checkAdminStatus
    // returns isAdmin:false until it does, so this must still run.
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/");
        } else if (isLoaded && user) {
            syncUser({
                clerkId: user.id,
                email: user.primaryEmailAddress?.emailAddress || "",
                name: user.fullName || "",
            }).catch(() => {
                // Sync failure leaves adminStatus falsy, which redirects below.
            });
        }
    }, [isLoaded, isSignedIn, user, router, syncUser]);

    const verifiedAdmin = adminStatus === undefined ? null : adminStatus.isAdmin;

    useEffect(() => {
        if (verifiedAdmin === false) {
            router.push("/dashboard"); // Kick out non-admins
        }
    }, [verifiedAdmin, router]);

    if (!isLoaded || verifiedAdmin === null) {
        return (
            <div className="dark h-screen w-full flex items-center justify-center bg-background text-foreground">
                <Loader2 className="animate-spin text-red-600 w-10 h-10" />
            </div>
        );
    }

    // We rely purely on `verifiedAdmin` which waits for DB sync. No more white-screen blocks.

    type NavItem = { href?: string; label: string; icon: React.ComponentType<{ className?: string }>; children?: NavItem[] };
    
    const navItems: NavItem[] = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/users", label: "User Management", icon: Users },
        { href: "/admin/factory", label: "NFC Factory", icon: SmartphoneNfc },
        {
            label: "Shop",
            icon: ShoppingCart,
            children: [
                { href: "/admin/shop/products", label: "Products", icon: Package },
                { href: "/admin/shop/categories", label: "Categories", icon: Tags },
                { href: "/admin/shop/orders", label: "Orders", icon: CartIcon },
                { href: "/admin/shop/inventory", label: "Inventory", icon: TrendingUp },
                { href: "/admin/shop/discounts", label: "Discounts", icon: Percent },
            ]
        },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/audit", label: "Audit Logs", icon: FileText },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="dark flex flex-col md:flex-row min-h-screen bg-background text-foreground">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-40">
                <div className="flex items-center gap-2 font-bold text-lg text-red-600">
                    <ConnectaMark className="h-5 w-5" />
                    <span>{CONNECTA.name} Admin</span>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="bg-background border-border text-foreground w-72 p-0">
                        {/*
                          Radix requires every DialogContent (which SheetContent
                          is) to have a DialogTitle, or it logs an accessibility
                          error and screen-reader users get an unlabelled dialog.
                          This brand line already WAS the visual title — it was
                          just a plain <div>, so it never registered as the
                          accessible name. SheetHeader/SheetTitle were imported
                          but unused.
                        */}
                        <SheetHeader className="p-6 border-b border-border space-y-0">
                            <SheetTitle className="flex items-center gap-2 font-bold text-xl text-red-600">
                                <ConnectaMark className="h-5 w-5" />
                                <span>{CONNECTA.name} Admin</span>
                            </SheetTitle>
                        </SheetHeader>
                        <nav className="p-4 space-y-2">
                            {navItems.map((item) => {
                                if ('children' in item) {
                                    return (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
                                                <item.icon className="w-4 h-4" />
                                                <span>{item.label}</span>
                                            </div>
                                            <div className="ml-7 space-y-1">
                                                {item.children?.map((child) => (
                                                    <Link key={child.href} href={child.href!}>
                                                        <Button
                                                            variant={pathname === child.href ? "secondary" : "ghost"}
                                                            className={cn(
                                                                "w-full justify-start gap-2 text-sm",
                                                                pathname === child.href
                                                                    ? "bg-red-600/10 text-red-600 hover:bg-red-600/20"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                                                            )}
                                                        >
                                                            <child.icon className="w-4 h-4" />
                                                            {child.label}
                                                        </Button>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                if (!item.href) return null;
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <div className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                            pathname === item.href ? "bg-red-600/10 text-red-500" : "text-muted-foreground hover:text-foreground hover:bg-card"
                                        )}>
                                            <item.icon className="h-5 w-5" />
                                            {item.label}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-1">
                            <Button
                                variant="ghost"
                                className="w-full justify-start min-h-11 text-muted-foreground hover:text-foreground"
                                onClick={() => router.push("/dashboard")}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                                Back to user app
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start min-h-11 text-muted-foreground hover:text-red-500"
                                onClick={() => signOut({ redirectUrl: "/" })}
                            >
                                <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                                Sign out
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </header>

            {/* Admin Sidebar (Desktop) */}
            <aside className="w-64 bg-background border-r border-border hidden md:flex flex-col">
                <div className="p-6 flex items-center gap-2 font-bold text-xl text-red-600">
                    <ConnectaMark className="h-5 w-5" />
                    <span>{CONNECTA.name} Admin</span>
                </div>

                <div className="px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Super User Control
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    {navItems.map((item) => {
                        if ('children' in item) {
                            return (
                                <div key={item.label} className="space-y-1">
                                    <div className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        <item.icon className="w-3 h-3" />
                                        <span>{item.label}</span>
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        {item.children?.map((child) => (
                                            <Link key={child.href} href={child.href!}>
                                                <div className={cn(
                                                    "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                    pathname === child.href ? "bg-red-600/10 text-red-500" : "text-muted-foreground hover:text-foreground hover:bg-card"
                                                )}>
                                                    <child.icon className="h-4 w-4" />
                                                    {child.label}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <Link key={item.href} href={item.href!}>
                                <div className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    pathname === item.href ? "bg-red-600/10 text-red-500" : "text-muted-foreground hover:text-foreground hover:bg-card"
                                )}>
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-border space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start min-h-11 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push("/dashboard")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                        Back to user app
                    </Button>
                    {/*
                      Distinct from "Back to user app": that keeps the session
                      and just navigates. Signing out is what lets you re-enter
                      as a different (non-admin) account to check the consumer
                      dashboard — previously impossible from inside /admin.
                    */}
                    <Button
                        variant="ghost"
                        className="w-full justify-start min-h-11 text-muted-foreground hover:text-red-500"
                        onClick={() => signOut({ redirectUrl: "/" })}
                    >
                        <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                        Sign out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-background/50 pb-24 md:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around px-2 z-40">
                {navItems.filter(item => !('children' in item)).slice(0, 4).map((item) => (
                    <Link key={item.href} href={item.href!} className="flex flex-col items-center justify-center gap-1 flex-1 h-full">
                        <item.icon className={cn(
                            "h-5 w-5",
                            pathname === item.href ? "text-red-500" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-tight",
                            pathname === item.href ? "text-red-500" : "text-muted-foreground"
                        )}>{item.label.split(' ')[0]}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
