"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const { user } = useUser();
    const onboarding = useQuery(api.users.getOnboardingStatus, user?.id ? { clerkId: user.id } : "skip");

    const isOnboardingComplete = onboarding?.completed ?? true; // optimistic

    return (
        <div>
            <h1 className="text-3xl font-bold mb-1">
                Welcome{user?.firstName ? `, ${user.firstName}` : " Back"} 👋
            </h1>
            <p className="text-muted-foreground mb-8">
                Manage your portfolio, share via NFC &amp; QR, and capture leads.
            </p>

            {/* ─── Onboarding Banner ─────────────────────────────────────── */}
            {!isOnboardingComplete && onboarding !== undefined && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-5">
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
                            <Button size="sm" className="shrink-0 gap-1">
                                Continue Setup <ChevronRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* ─── Stats ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <StatCard label="Total Taps" value="0" color="text-foreground" />
                <StatCard label="Active Profiles" value="0" color="text-foreground" />
                <StatCard label="New Leads" value="0" color="text-green-500" />
            </div>

            {/* ─── Empty State ────────────────────────────────────────────── */}
            <div className="p-10 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center bg-card">
                <h2 className="text-xl font-semibold mb-2">No Profiles Created Yet</h2>
                <p className="text-muted-foreground max-w-md mb-6 text-sm">
                    Create your first digital portfolio card and share it via NFC tap or QR code.
                </p>
                <Link href="/dashboard/builder">
                    <Button>Create New Profile</Button>
                </Link>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="bg-card border border-border p-5 rounded-xl">
            <h3 className="text-muted-foreground text-sm font-medium mb-1">{label}</h3>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
        </div>
    );
}

