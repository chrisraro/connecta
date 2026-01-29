"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function ProfilesPage() {
    const profiles = useQuery(api.profiles.getMyProfiles);

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
                <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500 mb-4">You haven't created any profiles yet.</p>
                    <Link href="/dashboard/builder">
                        <Button variant="outline">Create your first profile</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map((profile) => (
                        <Card key={profile._id} className="bg-zinc-900 border-zinc-800 text-white overflow-hidden">
                            <div
                                className="h-24 w-full"
                                style={{ backgroundColor: profile.layoutConfig.colorPalette.primary }}
                            ></div>
                            <CardHeader>
                                <CardTitle>{profile.name}</CardTitle>
                                <CardDescription>Theme: <span className="uppercase">{profile.layoutConfig.themeId}</span></CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-zinc-400">
                                    Agent: {profile.agentInfo.fullName}
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                <Link href={`/p/${profile._id}`} target="_blank" className="flex-1">
                                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                </Link>
                                <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700" disabled>
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
