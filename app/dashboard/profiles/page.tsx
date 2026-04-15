"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ExternalLink, Edit, QrCode } from "lucide-react";
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

export default function ProfilesPage() {
    const { user } = useUser();
    const profiles = useQuery(api.profiles.getMyProfiles, user?.id ? { clerkId: user.id } : "skip");

    if (profiles === undefined) {
        return <div className="flex justify-center p-12 text-zinc-500"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">My Profiles</h1>
                    <p className="text-zinc-400">Manage your digital business cards.</p>
                </div>
                <Link href="/dashboard/builder">
                    <Button className="font-bold bg-white text-black hover:bg-gray-200">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New
                    </Button>
                </Link>
            </div>

            {profiles.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card">
                    <p className="text-muted-foreground mb-4">You haven't created any profiles yet.</p>
                    <Link href="/dashboard/builder">
                        <Button>Create your first profile</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((profile) => (
                        <Card key={profile._id} className="overflow-hidden">
                            <div
                                className="h-24 w-full"
                                style={{ backgroundColor: profile.layoutConfig.colorPalette.primary }}
                            ></div>
                            <CardHeader>
                                <CardTitle>{profile.name}</CardTitle>
                                <CardDescription>Theme: <span className="uppercase">{profile.layoutConfig.themeId}</span></CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    Agent: {profile.agentInfo.fullName}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-wrap gap-2">
                                <Link href={`/p/${profile._id}`} target="_blank" className="flex-1 min-w-[100px]">
                                    <Button variant="outline" className="w-full">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                </Link>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" className="flex-1 min-w-[100px]">
                                            <QrCode className="w-4 h-4 mr-2" />
                                            Card
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-xl border-zinc-800 p-0 overflow-hidden border-0 shadow-none flex flex-col items-center justify-center gap-6">
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
                                                    className="rounded-full px-8 bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold"
                                                >
                                                    Close Card
                                                </Button>
                                            </DialogClose>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                <Button variant="secondary" disabled className="px-3">
                                    <Edit className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
