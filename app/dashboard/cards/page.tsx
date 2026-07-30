"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { 
    SmartphoneNfc, 
    QrCode, 
    Plus, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    ExternalLink,
    Settings2,
    Trash2,
    Link
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function CardsPage() {
    const { user, isLoaded } = useUser();
    const myCards = useQuery(api.users.getMyCards, user?.id ? { clerkId: user.id } : "skip");
    const myProfiles = useQuery(api.profiles.getMyProfiles, user?.id ? { clerkId: user.id } : "skip");
    const activateCard = useMutation(api.cards.activateCard);
    const linkProfile = useMutation(api.cards.linkProfile);

    const [isActivating, setIsActivating] = useState(false);
    const [activationCode, setActivationCode] = useState("");
    const [activationError, setActivationError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showActivationDialog, setShowActivationDialog] = useState(false);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !activationCode) return;

        setIsActivating(true);
        setActivationError(null);
        try {
            await activateCard({
                clerkId: user.id,
                activationCode: activationCode.toUpperCase().trim()
            });
            setIsSuccess(true);
            setActivationCode("");
            setTimeout(() => {
                setIsSuccess(false);
                setShowActivationDialog(false);
            }, 2000);
        } catch (err: any) {
            setActivationError(err.message || "Failed to activate card. Please check the code.");
        } finally {
            setIsActivating(false);
        }
    };

    const handleLinkProfile = async (cardId: any, profileId: string) => {
        if (!user?.id) return;
        try {
            await linkProfile({
                clerkId: user.id,
                cardId,
                profileId: profileId === "none" ? undefined : (profileId as any)
            });
        } catch (err) {
            console.error(err);
            alert("Failed to link profile");
        }
    };

    if (!isLoaded || myCards === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">My NFC Cards</h1>
                    <p className="text-muted-foreground">Manage and link your physical Herald cards to your profiles.</p>
                </div>
                
                <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
                    <DialogTrigger asChild>
                        <Button className="font-bold h-12 px-6 rounded-2xl shadow-lg shadow-primary/20">
                            <Plus className="w-5 h-5 mr-2" />
                            Activate New Card
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Activate Your Card</DialogTitle>
                            <DialogDescription>
                                Enter the 6-character activation code found on your card or its packaging.
                            </DialogDescription>
                        </DialogHeader>
                        
                        {isSuccess ? (
                            <div className="py-10 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">Card Activated!</h3>
                                <p className="text-muted-foreground">Your card is now ready to be linked.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleActivate} className="space-y-6 py-4">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Activation Code</label>
                                        <Input 
                                            placeholder="E.G. AB12CD" 
                                            value={activationCode}
                                            onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                                            className="h-14 text-2xl font-black tracking-[0.3em] text-center uppercase"
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>
                                    
                                    {activationError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            {activationError}
                                        </div>
                                    )}

                                    <div className="p-4 bg-muted/50 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 text-center">
                                        <QrCode className="w-8 h-8 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Or scan the QR code on your card using your phone camera to activate automatically.
                                        </p>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold" disabled={isActivating || activationCode.length < 6}>
                                    {isActivating ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                                    Activate Card
                                </Button>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {myCards.length === 0 ? (
                <Card className="border-dashed py-20 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                            <SmartphoneNfc className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No Active Cards</h3>
                        <p className="text-muted-foreground max-w-xs mb-8 font-medium">
                            You haven&apos;t activated any physical Herald cards yet. Get started by clicking the button above.
                        </p>
                        <Button variant="outline" className="rounded-xl px-8 h-12" onClick={() => setShowActivationDialog(true)}>
                            Get Started
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myCards.map((card) => (
                        <Card key={card._id} className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="bg-background font-mono text-[10px] tracking-tighter">
                                        ID: {card.uuid.slice(-8).toUpperCase()}
                                    </Badge>
                                    <Badge className={card.linkedProfileId ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                        {card.linkedProfileId ? "Linked" : "Unlinked"}
                                    </Badge>
                                </div>
                                <CardTitle className="flex items-center gap-2">
                                    <SmartphoneNfc className="w-5 h-5 text-primary" />
                                    Herald NFC Card
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Connected Profile</label>
                                    <Select 
                                        defaultValue={card.linkedProfileId || "none"}
                                        onValueChange={(val) => handleLinkProfile(card._id, val)}
                                    >
                                        <SelectTrigger className="w-full h-11 rounded-xl">
                                            <SelectValue placeholder="Select a profile" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not Linked</SelectItem>
                                            {myProfiles?.map((p) => (
                                                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border">
                                    <div className="text-center flex-1 border-r">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground">Total Taps</div>
                                        <div className="text-xl font-bold">{card.tapCount}</div>
                                    </div>
                                    <div className="text-center flex-1">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground">Status</div>
                                        <div className="text-xs font-bold text-green-600 uppercase">Active</div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 border-t pt-4 flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 rounded-lg h-10"
                                    onClick={() => window.open(`/t/${card.uuid}`, '_blank')}
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Test Link
                                </Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
