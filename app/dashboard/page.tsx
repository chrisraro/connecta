"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { ChevronRight, Sparkles, LayoutTemplate, MessageSquare, ExternalLink, Users, Edit2, SmartphoneNfc, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { profilePath } from "@/lib/profileUrl";

export default function DashboardPage() {
    const { user } = useUser();
    const clerkId = user?.id;

    const onboarding = useQuery(api.users.getOnboardingStatus, clerkId ? { clerkId } : "skip");
    const profiles = useQuery(api.profiles.getMyProfiles, clerkId ? { clerkId } : "skip");
    const leads = useQuery(api.leads.getLeads, clerkId ? { clerkId } : "skip");
    const cards = useQuery(api.users.getMyCards, clerkId ? { clerkId } : "skip");

    const isOnboardingComplete = onboarding?.completed ?? true;

    const leadsList = leads?.leads ?? [];
    const activeProfilesCount = profiles?.length ?? 0;
    const newLeadsCount = leadsList.filter(l => l.status === "new").length;
    const totalLeadsCount = leadsList.length + (leads?.lockedCount ?? 0);
    const totalTaps = cards?.reduce((acc, card) => acc + card.tapCount, 0) ?? 0;
    const activeCardsCount = cards?.filter(c => c.status === "active").length ?? 0;
    const recentLeads = leadsList.slice(0, 4);

    const isLoading = profiles === undefined;
    const statsLoading = profiles === undefined || leads === undefined || cards === undefined;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-1">
                    Welcome{user?.firstName ? `, ${user.firstName}` : " back"}
                </h1>
                <p className="text-muted-foreground">
                    Manage your portfolio, share via NFC &amp; QR, and capture leads.
                </p>
            </div>

            {/* ─── Onboarding Banner ─────────────────────────────────────── */}
            {!isOnboardingComplete && onboarding !== undefined && (
                <div className="rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-base">Complete your profile setup</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Add your contact info, services, and photo so clients know who you are.
                                </p>
                            </div>
                        </div>
                        <Link href="/dashboard/onboarding">
                            <Button size="sm" className="shrink-0 gap-1 rounded-xl">
                                Continue Setup <ChevronRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* ─── Stats ─────────────────────────────────────────────────── */}
            {statsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-[2rem]" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Taps"
                        value={totalTaps.toString()}
                        color="text-foreground"
                        icon={<ExternalLink className="w-4 h-4" />}
                    />
                    <StatCard
                        label="Total Leads"
                        value={totalLeadsCount.toString()}
                        color="text-foreground"
                        icon={<MessageSquare className="w-4 h-4" />}
                    />
                    <StatCard
                        label="Active Cards"
                        value={activeCardsCount.toString()}
                        color="text-foreground"
                        icon={<SmartphoneNfc className="w-4 h-4" />}
                    />
                    <StatCard
                        label="New Leads"
                        value={newLeadsCount.toString()}
                        color="text-emerald-500"
                        icon={<Sparkles className="w-4 h-4" />}
                    />
                </div>
            )}

            {/* ─── Quick Actions ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <QuickAction href="/dashboard/cards" icon={SmartphoneNfc} label="Activate a card" />
                <QuickAction href="/dashboard/builder" icon={Edit2} label="Edit profile" />
                <QuickAction
                    href={profiles && profiles.length > 0 ? profilePath(profiles[0]) : "/dashboard/profiles"}
                    icon={ExternalLink}
                    label="View public profile"
                    external={!!(profiles && profiles.length > 0)}
                />
                <QuickAction href="/shop" icon={ShoppingBag} label="Buy cards" />
            </div>

            {/* ─── Profiles Section ───────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Recent Profiles</h2>
                    {activeProfilesCount > 0 && (
                        <Link href="/dashboard/profiles">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View All <ChevronRight className="ml-1 w-4 h-4" />
                            </Button>
                        </Link>
                    )}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-24 rounded-3xl" />
                        <Skeleton className="h-24 rounded-3xl" />
                    </div>
                ) : activeProfilesCount === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No profiles created yet"
                        description="Create your first digital portfolio card and share it via NFC tap or QR code."
                        action={{ label: "Create new profile", href: "/dashboard/builder" }}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profiles.slice(0, 4).map((profile) => (
                            <div key={profile._id} className="group bg-card border border-border p-4 rounded-3xl hover:border-primary/30 transition-all duration-300 flex items-center gap-4 relative overflow-hidden">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border bg-muted shrink-0">
                                    <img
                                        src={resolveImageUrl(profile.agentInfo.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`}
                                        alt={`${profile.name} profile avatar`}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm truncate uppercase tracking-tight">{profile.name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-primary/10 text-primary rounded-full">
                                            {profile.layoutConfig.themeId}
                                        </span>
                                        <span className="text-[10px] font-medium text-muted-foreground italic">
                                            {new Date(profile._creationTime).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors" asChild title="Preview">
                                        <Link href={profilePath(profile)} target="_blank" aria-label={`Preview ${profile.name}`}>
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-colors" asChild title="Edit">
                                        <Link href={`/dashboard/builder?id=${profile._id}`} aria-label={`Edit ${profile.name}`}>
                                            <Edit2 className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Recent Leads ──────────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Recent Leads</h2>
                    {totalLeadsCount > 0 && (
                        <Link href="/dashboard/leads">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View All <ChevronRight className="ml-1 w-4 h-4" />
                            </Button>
                        </Link>
                    )}
                </div>

                {leads === undefined ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                    </div>
                ) : recentLeads.length === 0 ? (
                    <EmptyState
                        icon={MessageSquare}
                        title="No leads yet"
                        description="When someone taps your card and sends a message, it appears here."
                    />
                ) : (
                    <div className="space-y-3">
                        {recentLeads.map((lead) => (
                            <Link
                                key={lead._id}
                                href="/dashboard/leads"
                                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <MessageSquare className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{lead.inquirerName}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {lead.message || lead.propertyName || lead.inquirerContact}
                                    </p>
                                </div>
                                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickAction({ href, icon: Icon, label, external }: { href: string; icon: React.ElementType; label: string; external?: boolean }) {
    return (
        <Link
            href={href}
            target={external ? "_blank" : undefined}
            className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">{label}</span>
        </Link>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
    return (
        <div className="bg-card border border-border p-6 rounded-[2rem] relative overflow-hidden group hover:border-primary/20 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true">
                {icon}
            </div>
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">{label}</h3>
            <div className={`text-4xl font-black tracking-tighter ${color}`}>{value}</div>
        </div>
    );
}
