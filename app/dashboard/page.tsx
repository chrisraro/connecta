"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { ChevronRight, Sparkles, LayoutTemplate, MessageSquare, ExternalLink, Loader2, Users, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/lib/utils";

export default function DashboardPage() {
    const { user } = useUser();
    const clerkId = user?.id;

    const onboarding = useQuery(api.users.getOnboardingStatus, clerkId ? { clerkId } : "skip");
    const profiles = useQuery(api.profiles.getMyProfiles, clerkId ? { clerkId } : "skip");
    const leads = useQuery(api.leads.getLeads, clerkId ? { clerkId } : "skip");
    const cards = useQuery(api.users.getMyCards, clerkId ? { clerkId } : "skip");

    const isOnboardingComplete = onboarding?.completed ?? true;
    
    const activeProfilesCount = profiles?.length ?? 0;
    const newLeadsCount = leads?.filter(l => l.status === "new").length ?? 0;
    const totalTaps = cards?.reduce((acc, card) => acc + card.tapCount, 0) ?? 0;

    const isLoading = profiles === undefined;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-1">
                    Welcome{user?.firstName ? `, ${user.firstName}` : " Back"} 👋
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
                                <Sparkles className="w-5 h-5 text-primary" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    label="Total Taps" 
                    value={totalTaps.toString()} 
                    color="text-foreground" 
                    icon={<ExternalLink className="w-4 h-4" />}
                />
                <StatCard 
                    label="Active Profiles" 
                    value={activeProfilesCount.toString()} 
                    color="text-foreground" 
                    icon={<LayoutTemplate className="w-4 h-4" />}
                />
                <StatCard 
                    label="New Leads" 
                    value={newLeadsCount.toString()} 
                    color="text-emerald-500" 
                    icon={<MessageSquare className="w-4 h-4" />}
                />
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
                    <div className="h-40 flex items-center justify-center bg-card border border-dashed border-border rounded-2xl">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : activeProfilesCount === 0 ? (
                    <div className="p-10 border border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center text-center bg-card backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Profiles Created Yet</h2>
                        <p className="text-muted-foreground max-w-md mb-6 text-sm font-medium">
                            Create your first digital portfolio card and share it via NFC tap or QR code.
                        </p>
                        <Link href="/dashboard/builder">
                            <Button className="rounded-2xl px-8 bg-primary text-primary-foreground">
                                Create New Profile
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profiles.slice(0, 4).map((profile) => (
                            <div key={profile._id} className="group bg-card border border-border p-4 rounded-3xl hover:border-primary/30 transition-all duration-300 flex items-center gap-4 relative overflow-hidden">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border bg-muted shrink-0">
                                    <img 
                                        src={resolveImageUrl(profile.agentInfo.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} 
                                        alt={profile.name}
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
                                        <Link href={`/p/${profile._id}`} target="_blank">
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-colors" asChild title="Edit">
                                        <Link href={`/dashboard/builder?id=${profile._id}`}>
                                            <Edit2 className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
    return (
        <div className="bg-card border border-border p-6 rounded-[2rem] relative overflow-hidden group hover:border-primary/20 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                {icon}
            </div>
            <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">{label}</h3>
            <div className={`text-4xl font-black tracking-tighter ${color}`}>{value}</div>
        </div>
    );
}
