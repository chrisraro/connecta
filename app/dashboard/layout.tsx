"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, CreditCard, Settings, SmartphoneNfc, MessageSquare, Sparkles, Zap, LayoutTemplate, ChevronRight, Loader2, Building2, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SigmaTapMark } from "@/components/brand/SigmaTapMark";
import { Button } from "@/components/ui/button";
import { NotificationsPopover } from "@/components/ui/notifications-popover";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OfflineLeadCapture } from "@/components/profile-builder/OfflineLeadCapture";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { SIGMATAP } from "@/lib/brand";

// Shared between the mobile header and the desktop sidebar footer so the
// account avatar looks identical in both places (same component in two
// places looking different is a bug). Both userButtonTrigger and
// userButtonAvatarBox are pinned to the *same* 44px box — Clerk's default
// avatar box (40px) is smaller than its own trigger's tap target, which
// used to leave a visible gap around the photo when a wrapping div added a
// ring on top of that mismatch. Sizing them equal and putting the ring
// directly on the avatar box (a box-shadow ring, not a border, so it never
// eats into the photo's box) makes the ring hug the image edge instead.
// The `!` importants are required: Clerk's own component styles otherwise
// win the specificity fight against plain Tailwind utility classes.
const AVATAR_BUTTON_APPEARANCE = {
    elements: {
        userButtonAvatarBox: "w-11! h-11! rounded-full! ring-2! ring-primary/20!",
        userButtonTrigger: "rounded-full! w-11! h-11! flex items-center justify-center",
    },
};

/**
 * Mobile dashboard used to mount two independent floating action buttons —
 * this Quick Actions sheet trigger (bottom-28) and OfflineLeadCapture's own
 * floating "capture a lead" button (bottom-24) — which physically overlapped
 * by 40px (h-14 buttons 16px apart vertically) and rendered as one malformed
 * shape. Consolidated to a single FAB: it opens this sheet, and "Capture a
 * lead" is the first, most prominent item inside it (someone just met a
 * person and wants to log them — a genuinely primary action). All of
 * OfflineLeadCapture's offline-queue/online-detection/submit behaviour is
 * unchanged; only *how it's triggered* moved (see OfflineLeadCapture.tsx).
 */
function DashboardFabs() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [leadDialogOpen, setLeadDialogOpen] = useState(false);
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    return (
        <>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        aria-label="Quick actions"
                        className="quick-actions-fab fixed bottom-28 right-6 z-50 h-14 w-14 rounded-2xl shadow-[var(--e-overlay)] bg-primary text-primary-foreground hover:scale-105 transition-transform md:hidden"
                    >
                        <Sparkles className="w-7 h-7" />
                        {unsyncedCount > 0 && (
                            <span
                                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse"
                                aria-hidden="true"
                            >
                                {unsyncedCount}
                            </span>
                        )}
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
                        <QuickActionButton
                            icon={User}
                            label="Capture a Lead"
                            desc={unsyncedCount > 0 ? `${unsyncedCount} unsynced — log a new contact` : "Log a new contact you just met"}
                            color="bg-rose-500"
                            badge={unsyncedCount > 0 ? unsyncedCount : undefined}
                            onClick={() => {
                                setSheetOpen(false);
                                setLeadDialogOpen(true);
                            }}
                        />
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

            {/* Always mounted (not gated by the sheet's open state) so the
                offline queue / online-offline listeners keep running exactly
                as before consolidation. Its own open state is controlled by
                the Quick Actions item above. */}
            <OfflineLeadCapture
                open={leadDialogOpen}
                onOpenChange={setLeadDialogOpen}
                onUnsyncedCountChange={setUnsyncedCount}
            />
        </>
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

/** Same visual vocabulary as QuickActionItem, but a real <button> (it opens
 * a dialog in place rather than navigating), so it carries its own accessible
 * name from its visible label text instead of needing an icon-only aria-label. */
function QuickActionButton({ icon: Icon, label, desc, color, badge, onClick }: { icon: React.ElementType, label: string, desc: string, color: string, badge?: number, onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="flex items-center gap-4 p-4 rounded-3xl bg-muted/50 border border-border hover:bg-muted transition-colors group w-full text-left">
            <div className={`relative w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                <Icon className="w-6 h-6" />
                {badge !== undefined && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {badge}
                    </span>
                )}
            </div>
            <div className="flex-1">
                <div className="font-bold text-sm tracking-tight">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>
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
                <SigmaTapMark className="h-6 w-6 text-primary" />
                <span className="text-foreground font-black tracking-tight">{SIGMATAP.name}</span>
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
                    <UserButton appearance={AVATAR_BUTTON_APPEARANCE} />
                    <div className="flex-1 text-xs text-muted-foreground font-medium">
                        Manage Account
                    </div>
                    <ThemeToggle />
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
            {/* No `overflow-hidden` here: the pill's height used to be
                derived from whichever item happened to be active (only the
                active item reserved space for its label via a
                scale-90/h-0 trick), so any per-item height difference risked
                the label text getting clipped against the pill's own
                rounded bounds. Every item now always reserves the same
                fixed label height (opacity toggles visibility, not layout),
                so the pill's height is constant and there's nothing left
                for overflow-hidden to need to clip. */}
            <nav className="bg-background/80 backdrop-blur-2xl border border-border rounded-full p-2 flex items-center justify-between shadow-[var(--e-overlay)] ring-1 ring-border/50">
                {navItems.map((item) => {
                    const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                    return (
                        <Link key={item.url} href={item.url} className="relative flex-1 group">
                            <div className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-full transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                <item.icon className={`h-6 w-6 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-105"}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] leading-none font-bold tracking-wide transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}>
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
        return SIGMATAP.name;
    };

    return (
        <header className="md:hidden sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex flex-col justify-center">
                {/* The "2026 Edition" kicker that used to sit here was removed:
                    it dated the product in the chrome of every screen, and a
                    small uppercase wide-tracked label above a heading is the
                    eyebrow pattern this project's design rules ban outright. */}
                {/* Not an <h1>: each page under app/dashboard/** already owns the
                    real page-title heading (e.g. "Welcome back" on /dashboard,
                    "Team Workspace" on /dashboard/team). This mobile top-bar
                    label just mirrors that title in the sticky header — a second
                    literal <h1> always present in the DOM (this bar is only
                    CSS-hidden above md, not unmounted) duplicated the page's
                    real h1 and broke "exactly one h1 per page". */}
                <p className="text-xl font-black tracking-tight text-foreground">{getPageTitle()}</p>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <NotificationsPopover />
                <UserButton appearance={AVATAR_BUTTON_APPEARANCE} />
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

            {/* No `overflow-y-auto` here: `main` never actually overflows (it's
                a flex item that auto-sizes to its content, so the *window*
                is what scrolls) — but `overflow-y: auto` still makes this
                element `position: sticky`'s containing block per spec, which
                makes every sticky descendant (this file's own MobileHeader,
                the builder page's header, the builder's pinned preview
                column) inert. Removing it is a no-op for scrolling and lets
                sticky work the way it's supposed to (Task 2 review, Critical
                #1/#2 + Important #3/#6 — see app/dashboard/builder/page.tsx). */}
            {/* pb-48 (192px) clears the tallest fixed mobile chrome: the FAB's
                top edge sits at bottom-28 + h-14 = 168px from the viewport
                bottom, so page content (e.g. the "Recent Profiles" card)
                needs at least that much bottom padding or it renders
                underneath the nav/FAB instead of above them. */}
            {/* min-w-0: <main> is a flex item, and flex items default to
                min-width:auto, which refuses to shrink below their content's
                intrinsic width. Any page with a horizontally-scrolling strip
                (the filter chips on /profiles and /leads) therefore pushed
                <main> to ~436px inside a 320px viewport. The body's
                overflow-x:hidden then CLIPPED the excess rather than
                scrolling it, so the right edge of every such page was simply
                cut off on small phones — with no scrollbar to reveal it.
                min-w-0 lets <main> match the viewport and hands the
                horizontal scrolling back to the strip that asked for it. */}
            <main className="flex-1 min-w-0 flex flex-col relative pb-48 md:pb-0">
                {/* Mobile Header */}
                <MobileHeader />

                <div className="flex-1 min-w-0 p-6 md:p-10 max-w-7xl mx-auto w-full">
                    {children}
                </div>

                {/* Mobile FABs: single Quick Actions trigger + the (always
                    mounted) offline lead capture dialog it now opens. */}
                <DashboardFabs />
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
