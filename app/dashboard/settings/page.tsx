"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";

export default function SettingsPage() {
    const { user } = useUser();

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-zinc-400">Manage your personal information.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-6">
                <div className="space-y-2">
                    <Label className="text-zinc-300">Full Name</Label>
                    <Input
                        defaultValue={user?.fullName || ""}
                        className="bg-zinc-950 border-zinc-800 focus:border-white transition-colors"
                        disabled
                    />
                    <p className="text-xs text-zinc-500">Managed via Clerk Auth</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-zinc-300">Email Address</Label>
                    <Input
                        defaultValue={user?.primaryEmailAddress?.emailAddress || ""}
                        className="bg-zinc-950 border-zinc-800 focus:border-white transition-colors"
                        disabled
                    />
                </div>

                <div className="pt-4 border-t border-zinc-800">
                    <h3 className="text-lg font-bold text-red-500 mb-4">Danger Zone</h3>
                    <Button variant="destructive" className="bg-red-900/20 text-red-500 hover:bg-red-900/40 border-none">
                        Delete Account
                    </Button>
                </div>
            </div>
        </div>
    );
}
