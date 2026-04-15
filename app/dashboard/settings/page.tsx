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
                <p className="text-muted-foreground">Manage your personal information.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <Input
                        defaultValue={user?.fullName || ""}
                        className="bg-muted/50 border-border focus:border-primary transition-colors"
                        disabled
                    />
                    <p className="text-xs text-muted-foreground">Managed via Clerk Auth</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-muted-foreground">Email Address</Label>
                    <Input
                        defaultValue={user?.primaryEmailAddress?.emailAddress || ""}
                        className="bg-muted/50 border-border focus:border-primary transition-colors"
                        disabled
                    />
                </div>

                <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-bold text-destructive mb-4">Danger Zone</h3>
                    <Button variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none">
                        Delete Account
                    </Button>
                </div>
            </div>
        </div>
    );
}
