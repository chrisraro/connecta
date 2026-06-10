"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, CreditCard, Settings, SmartphoneNfc, MessageSquare, Sparkles, Bell, Zap, LayoutTemplate, ChevronRight, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "@/components/ui/notifications-popover";
import { OfflineLeadCapture } from "@/components/profile-builder/OfflineLeadCapture";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

function QuickActionsToggle() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button size="icon" className="quick-actions-fab fixed bottom-28 right-6 z-50 h-14 w-14 rounded-2xl shadow-2xl shadow-primary/40 bg-primary text-primary-foreground hover:scale-105 transition-transform md:hidden">
                    <Sparkles className="w-7 h-7" />
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2.5rem] border-border bg-card p-0 overflow-hidden pb-10">
                <SheetHeader className="p-6 border-b border-border">
                    <SheetTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Quick Actions
                    </SheetTitle>
                </SheetHeader>
                <div className="p-4 grid gap-3">
                    <QuickActionItem 
                        href="/dashboard/builder"
                        icon={LayoutTemplate}
                        label="Profile Builder"
                        desc="Create or edit your digital card"
                        color="bg-blue-500"
                    />
                    <QuickActionItem 
                        href="/dashboard/leads"
                        icon={MessageSquare}
                        label="View Leads"
                        desc="Check recent inquiries"
                        color="bg-green-500"
                    />
                    <QuickActionItem 
                        href="/dashboard/cards"
                        icon={SmartphoneNfc}
                        label="Activate Card"
                        desc="Sync new physical NFC card"
                        color="bg-purple-500"
                    />
                    <QuickActionItem 
                        href="/dashboard/billing"
                        icon={CreditCard}
                        label="Upgrade Pro"
                        desc="Unlock unlimited profiles"
                        color="bg-amber-500"
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function QuickActionItem({ href, icon: Icon, label, desc, color }: { href: string, icon: React.ElementType, label: string, desc: string, color: string }) {
    return (
        <Link href={href}>
            <div className="flex items-center gap-4 p-4 rounded-3xl bg-muted/50 border border-border hover:bg-muted transition-colors group">
                <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="font-bold text-sm tracking-tight">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
        </Link>
    );
}

function DashboardSidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { user } = useUser();
    const onboarding = useQuery(api.users.getOnboardingStatus, user?.id ? { clerkId: user.id } : "skip");
    const isOnboardingIncomplete = onboarding !== undefined && !onboarding.completed;

    const menuItems = [
        { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
        { title: "My Profiles", url: "/dashboard/profiles", icon: Users },
        { title: "Leads", url: "/dashboard/leads", icon: MessageSquare },
        { title: "NFC Cards", url: "/dashboard/cards", icon: SmartphoneNfc },
        { title: "Team", url: "/dashboard/team", icon: Building2 },
        { title: "Billings", url: "/dashboard/billing", icon: CreditCard },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
        { title: "Profile Setup", url: "/dashboard/onboarding", icon: Sparkles, badge: isOnboardingIncomplete },
    ];

    return (
        <aside className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground ${className}`}>
            <div className="p-6 flex items-center gap-2 font-bold text-xl">
                <SmartphoneNfc className="text-primary" />
                <span className="text-foreground font-black tracking-tight">TapFolio</span>
            </div>
            <nav className="flex-1 px-4 space-y-2 py-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                    return (
                        <Link key={item.url} href={item.url}>
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="flex-1">{item.title}</span>
                                {(item as { badge?: boolean }).badge && (
                                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" title="Incomplete" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>
            <div className="p-6 border-t border-sidebar-border">
                <div className="flex items-center gap-3 bg-sidebar-accent/50 p-3 rounded-2xl border border-sidebar-border">
                    <UserButton />
                    <div className="flex-1 text-xs text-muted-foreground font-medium">
                        Manage Account
                    </div>
                    <NotificationsPopover />
                </div>
            </div>
        </aside>
    );
}

function MobileBottomNav() {
    const pathname = usePathname();
    const navItems = [
        { title: "Home", url: "/dashboard", icon: LayoutDashboard },
        { title: "Profiles", url: "/dashboard/profiles", icon: Users },
        { title: "Leads", url: "/dashboard/leads", icon: MessageSquare },
        { title: "Cards", url: "/dashboard/cards", icon: SmartphoneNfc },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
    ];

    return (
        <div className="mobile-bottom-nav fixed bottom-6 left-4 right-4 z-50 md:hidden">
            <nav className="bg-background/80 backdrop-blur-2xl border border-border rounded-[2.5rem] p-2 flex items-center justify-between shadow-2xl ring-1 ring-border/50 overflow-hidden">
                {navItems.map((item) => {
                    const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                    return (
                        <Link key={item.url} href={item.url} className="relative flex-1 group">
                            <div className={`flex flex-col items-center justify-center py-2.5 rounded-full transition-all duration-300 ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                <item.icon className={`h-6 w-6 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] font-bold mt-1 tracking-wide transition-all duration-300 ${isActive ? "opacity-100 scale-100" : "opacity-0 scale-90 h-0 overflow-hidden"}`}>
                                    {item.title}
                                </span>
                                {isActive && (
                                    <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

function MobileHeader() {
    const pathname = usePathname();
    const getPageTitle = () => {
        if (pathname === "/dashboard") return "Overview";
        if (pathname.startsWith("/dashboard/profiles")) return "Profiles";
        if (pathname.startsWith("/dashboard/leads")) return "Inquiries";
        if (pathname.startsWith("/dashboard/cards")) return "My Cards";
        if (pathname.startsWith("/dashboard/team")) return "Team";
        if (pathname.startsWith("/dashboard/billing")) return "Billing";
        if (pathname.startsWith("/dashboard/settings")) return "Settings";
        return "TapFolio";
    };

    return (
        <header className="md:hidden sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">2026 Edition</span>
                <h1 className="text-xl font-black tracking-tight text-foreground">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-3">
                <NotificationsPopover />
                <div className="p-0.5 rounded-full border-2 border-primary/20">
                    <UserButton />
                </div>
            </div>
        </header>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoaded } = useUser();
    const syncUser = useMutation(api.users.syncUser);
    const router = useRouter();
    const pathname = usePathname();

    // Check admin status
    const adminStatus = useQuery(
        api.admin.checkAdminStatus,
        isLoaded && user ? { clerkId: user.id } : "skip"
    );

    useEffect(() => {
        if (isLoaded && user) {
            syncUser({
                clerkId: user.id,
                email: user.primaryEmailAddress?.emailAddress || "",
                name: user.fullName || "",
            });
        }
    }, [isLoaded, user, syncUser]);

    // Redirect admins to admin dashboard (except onboarding)
    useEffect(() => {
        if (!isLoaded || !adminStatus || !pathname) return;
        
        if (adminStatus.isAdmin && pathname !== "/dashboard/onboarding") {
            console.log("Admin detected on user dashboard, redirecting to admin...");
            router.replace("/admin");
        }
    }, [isLoaded, adminStatus, pathname, router]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
            {/* Desktop Sidebar */}
            <DashboardSidebar className="hidden md:flex w-72" />

            <main className="flex-1 overflow-y-auto flex flex-col relative pb-32 md:pb-0">
                {/* Mobile Header */}
                <MobileHeader />

                <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
                    {children}
                </div>

                {/* Mobile Quick Actions FAB */}
                <QuickActionsToggle />

                {/* Offline Lead Capture Button */}
                <OfflineLeadCapture />
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
