"use client";

import { useState, useEffect } from "react";
import { User, Mail, MessageSquare, Wifi, WifiOff, Upload } from "lucide-react";
import { saveOfflineLead, getUnsyncedCount, isOnline, syncOfflineLeads } from "@/lib/offline-leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function OfflineLeadCapture() {
    const { user } = useUser();
    const createLead = useMutation(api.leads.createLead);
    const currentUser = useQuery(api.users.getUser);
    
    const [open, setOpen] = useState(false);
    const [online, setOnline] = useState(true);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setOnline(isOnline());
        setUnsyncedCount(getUnsyncedCount());

        const handleOnline = () => {
            setOnline(true);
            // Auto-sync when coming back online
            if (getUnsyncedCount() > 0 && user) {
                handleSync();
            }
        };
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (online && currentUser) {
                // Online: save directly to Convex
                await createLead({
                    ownerId: currentUser._id,
                    inquirerName: name,
                    inquirerContact: contact,
                    message: message || undefined,
                });
                
                // Reset form
                setName("");
                setContact("");
                setMessage("");
                setOpen(false);
            } else {
                // Offline: save to localStorage
                saveOfflineLead({
                    inquirerName: name,
                    inquirerContact: contact,
                    message: message || undefined,
                });

                setUnsyncedCount(getUnsyncedCount());
                
                // Reset form
                setName("");
                setContact("");
                setMessage("");
                setOpen(false);
            }
        } catch (error) {
            console.error("Failed to save lead:", error);
            // Fallback to offline storage
            saveOfflineLead({
                inquirerName: name,
                inquirerContact: contact,
                message: message || undefined,
            });
            setUnsyncedCount(getUnsyncedCount());
            setOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        if (!currentUser) return;
        
        setSyncing(true);
        try {
            const result = await syncOfflineLeads(createLead, currentUser._id);
            setUnsyncedCount(getUnsyncedCount());
            
            if (result.synced > 0) {
                alert(`Successfully synced ${result.synced} lead(s)!`);
            }
        } catch (error) {
            console.error("Failed to sync leads:", error);
            alert("Failed to sync leads. They will be synced automatically when connection is restored.");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-2">
                {unsyncedCount > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                        {unsyncedCount} unsynced
                    </Badge>
                )}
                
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            size="lg"
                            className="rounded-full shadow-2xl h-14 w-14 p-0 bg-primary hover:bg-primary/90"
                        >
                            <User className="w-6 h-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {!online ? (
                                    <>
                                        <WifiOff className="w-5 h-5 text-orange-500" />
                                        Offline Lead Capture
                                    </>
                                ) : (
                                    <>
                                        <Wifi className="w-5 h-5 text-green-500" />
                                        Capture Lead
                                    </>
                                )}
                            </DialogTitle>
                            <DialogDescription>
                                {!online 
                                    ? "Lead will be saved locally and synced when online."
                                    : "Add a new lead to your CRM."
                                }
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Name *
                                </label>
                                <Input
                                    placeholder="e.g. Maria Santos"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Contact *
                                </label>
                                <Input
                                    placeholder="Phone or Email"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Message (Optional)
                                </label>
                                <Textarea
                                    placeholder="Notes about this lead..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" className="flex-1" disabled={saving}>
                                    {saving ? "Saving..." : (
                                        <>
                                            {!online ? (
                                                <>
                                                    <WifiOff className="w-4 h-4 mr-2" />
                                                    Save Offline
                                                </>
                                            ) : (
                                                "Save Lead"
                                            )}
                                        </>
                                    )}
                                </Button>
                                
                                {unsyncedCount > 0 && online && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSync}
                                        disabled={syncing}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Sync ({unsyncedCount})
                                    </Button>
                                )}
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
