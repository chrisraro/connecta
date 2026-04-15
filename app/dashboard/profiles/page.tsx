"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ExternalLink, QrCode, Search, Users } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AccessCard } from "@/components/profile-builder/AccessCard";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ProfilesPage() {
    const { user } = useUser();
    const profiles = useQuery(api.profiles.getMyProfiles, user?.id ? { clerkId: user.id } : "skip");
    const [activeChip, setActiveChip] = useState("All");

    if (profiles === undefined) {
        return <div className="flex justify-center p-12 text-zinc-500"><Loader2 className="animate-spin" /></div>;
    }

    const chips = ["All", "Active", "Recently Updated", "Drafts"];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="hidden md:block">
                    <h1 className="text-3xl font-bold">My Profiles</h1>
                    <p className="text-muted-foreground">Manage your digital business cards.</p>
                </div>

                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search profiles..." 
                        className="pl-10 bg-muted/50 border-border rounded-2xl h-12 md:h-10 focus-visible:ring-primary"
                    />
                </div>

                <Link href="/dashboard/builder" className="hidden md:block">
                    <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New
                    </Button>
                </Link>
            </div>

            {/* Chips UI for Mobile/Modern Feel */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {chips.map((chip) => (
                    <button
                        key={chip}
                        onClick={() => setActiveChip(chip)}
                        className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${
                            activeChip === chip 
                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                            : "bg-muted border-border text-muted-foreground hover:border-primary/50"
                        }`}
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {profiles.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card backdrop-blur-sm">
                    <p className="text-muted-foreground mb-6 font-medium">You haven&apos;t created any profiles yet.</p>
                    <Link href="/dashboard/builder">
                        <Button className="rounded-2xl px-8 h-12 bg-primary text-primary-foreground">Create your first profile</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((profile) => (
                        <Card key={profile._id} className="overflow-hidden border-border bg-card backdrop-blur-sm hover:border-primary/20 transition-all duration-300 group rounded-[2rem]">
                            <div
                                className="h-32 w-full relative"
                                style={{ backgroundColor: profile.layoutConfig.colorPalette.primary }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-white font-bold text-sm uppercase tracking-wider">{profile.layoutConfig.themeId}</span>
                                </div>
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground">{profile.name}</CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">
                                    {profile.agentInfo.fullName}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-6">
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live Profile
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-wrap gap-3 pt-0 pb-6 px-6">
                                <Link href={`/p/${profile._id}`} target="_blank" className="flex-1 min-w-[100px]">
                                    <Button variant="outline" className="w-full rounded-2xl border-border hover:bg-muted transition-all">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                </Link>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" className="flex-1 min-w-[100px] rounded-2xl bg-muted text-foreground hover:bg-muted/80 transition-all">
                                            <QrCode className="w-4 h-4 mr-2" />
                                            Card
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] bg-card/90 backdrop-blur-2xl border-border p-0 overflow-hidden border-0 shadow-none flex flex-col items-center justify-center gap-6">
                                        <DialogHeader className="sr-only">
                                            <DialogTitle>Access Card for {profile.name}</DialogTitle>
                                        </DialogHeader>
                                        
                                        <div className="w-full flex justify-center pt-8 px-4">
                                            <AccessCard 
                                                profileId={profile._id} 
                                                agent={profile.agentInfo} 
                                            />
                                        </div>

                                        <div className="pb-8 px-4 w-full flex justify-center">
                                            <DialogClose asChild>
                                                <Button 
                                                    variant="outline" 
                                                    className="rounded-full px-10 h-12 bg-muted border-border text-foreground hover:bg-muted/80 font-black uppercase tracking-widest text-xs"
                                                >
                                                    Dismiss
                                                </Button>
                                            </DialogClose>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
