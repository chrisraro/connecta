"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
    Copy, 
    Download, 
    Loader2, 
    Plus, 
    SmartphoneNfc, 
    Printer, 
    X, 
    QrCode, 
    Zap,
    ShieldCheck,
    AlertCircle,
    Trash2,
    CheckSquare,
    Square
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Id } from "@/convex/_generated/dataModel";
import { SIGMATAP } from "@/lib/brand";

// Define NDEF types since they might not be in the global scope
interface NDEFReadingEvent extends Event {
    serialNumber: string;
}

/**
 * The host physical NFC tags are encoded with, and that the printed
 * sticker's QR code resolves to. Both are written onto real merchandise, so
 * a wrong value here is not a cosmetic bug — it ships dead cards.
 *
 * This used to be a hard-coded literal, deliberately frozen through two brand
 * passes on the reasoning that the deployment had not moved and rewriting it
 * would point every card at a dead URL. That reasoning silently expired: by
 * the third rename the host was returning 404 and was no longer even an alias
 * on the Vercel project, so the "safe" frozen value had itself become the
 * dead URL it existed to prevent. Every tag written in that window pointed
 * nowhere, and the guard in lib/brand.test.ts was allowlisting the very line
 * that carried the rot.
 *
 * Deriving it from NEXT_PUBLIC_APP_URL means the encoded host tracks whatever
 * the deployment actually is, so it cannot drift out of sync with a rename
 * again. The fallback only covers local/dev builds that have not set the var.
 *
 * The retired host has since been re-aliased to the live deployment so cards
 * written while it was dead resolve again — keep that alias for as long as
 * any of those cards are in circulation. See docs/rename-runbook.md.
 */
const PRODUCTION_DOMAIN = (
    process.env.NEXT_PUBLIC_APP_URL || "https://sigmatap.vercel.app"
).replace(/\/+$/, "");

export default function AdminFactoryPage() {
    const { user, isLoaded } = useUser();
    const cardsList = useQuery(api.admin.getCards, user?.id ? { clerkId: user.id } : "skip");
    const registerCard = useMutation(api.admin.registerSingleCard);
    const deleteCards = useMutation(api.admin.deleteCards);

    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [lastRegistered, setLastRegistered] = useState<{ id: Id<"cards">, uuid: string, activationCode: string } | null>(null);
    const [showPrintDialog, setShowPrintDialog] = useState(false);
    const [selectedCard, setSelectedCard] = useState<{ uuid: string, activationCode: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<Id<"cards">>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    const stopScanning = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsScanning(false);
    };

    const [ndefStatus, setNdefStatus] = useState<string | null>(null);

    const startScanning = async () => {
        if (!("NDEFReader" in window)) {
            setScanError("Web NFC is not supported on this browser/device. Use Chrome on Android.");
            return;
        }

        setIsScanning(true);
        setScanError(null);
        setNdefStatus(null);
        abortControllerRef.current = new AbortController();

        try {
            // @ts-expect-error NDEFReader is experimental
            const ndef = new window.NDEFReader();
            await ndef.scan({ signal: abortControllerRef.current.signal });

            ndef.onreadingerror = () => {
                setScanError("Could not read NFC tag. Try again.");
            };

            ndef.onreading = async (event: NDEFReadingEvent) => {
                const serialNumber = event.serialNumber;
                if (!serialNumber) {
                    setScanError("Tag has no serial number.");
                    return;
                }

                try {
                    setNdefStatus("Writing NDEF URL...");
                    // Write ONLY the URL to the NFC tag
                    // This ensures maximum compatibility across all devices
                    // The vCard download will happen on the profile page when loaded
                    const url = `${PRODUCTION_DOMAIN}/t/${serialNumber}`;
                    console.log("Writing NDEF URL:", url);
                    
                    await ndef.write({
                        records: [{ recordType: "url", data: url }]
                    });
                    setNdefStatus("NDEF Write Success!");
                    console.log("Successfully wrote URL to NFC tag");

                    // Register the card in Convex
                    if (!user?.id) {
                        setScanError("User not authenticated.");
                        return;
                    }

                    // The activation code is generated server-side: 6 chars
                    // from an unambiguous uppercase alphabet, unique-checked
                    // against the cards table. The old client-side
                    // `ACT-<serial>-<timestamp>` codes were never enterable in
                    // the user activation form (which promises 6 characters
                    // and uppercases input before an exact-match lookup).
                    const result = await registerCard({
                        clerkId: user!.id!,
                        uuid: serialNumber,
                    });
                    
                    // Transform response to match expected state shape
                    const cardData = {
                        id: result.cardId,
                        uuid: result.uuid,
                        activationCode: result.activationCode
                    };
                    
                    setLastRegistered(cardData);
                    setSelectedCard(cardData);
                    setShowPrintDialog(true);
                    
                    // Optional: keep scanning for next card?
                    // For now, stop to show the result
                    stopScanning();
                } catch (err) {
                    const error = err as Error;
                    setScanError(error.message || "Failed to register card.");
                }
            };

        } catch (error) {
            const err = error as Error;
            if (err.name !== "AbortError") {
                setScanError(`Error: ${err.message}`);
                setIsScanning(false);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleManualRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const uuid = formData.get("uuid") as string;
        
        if (!uuid) return;
        if (!user?.id) {
            alert("User not authenticated.");
            return;
        }

        try {
            // Server generates the 6-char activation code — see the NFC
            // scan handler above for why the client no longer does.
            const result = await registerCard({
                clerkId: user!.id!,
                uuid: uuid,
            });

            // Transform response to match expected state shape
            const cardData = {
                id: result.cardId,
                uuid: result.uuid,
                activationCode: result.activationCode
            };

            setLastRegistered(cardData);
            setSelectedCard(cardData);
            setShowPrintDialog(true);
            (e.target as HTMLFormElement).reset();
        } catch (err) {
            const error = err as Error;
            alert(error.message);
        }
    };

    const toggleSelectAll = () => {
        if (!cardsList) return;
        if (selectedIds.size === cardsList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(cardsList.map(c => c._id)));
        }
    };

    const toggleSelect = (id: Id<"cards">) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!user?.id) {
            alert("User not authenticated.");
            return;
        }
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} card(s)?`)) return;

        setIsDeleting(true);
        try {
            await deleteCards({
                clerkId: user!.id!,
                cardIds: Array.from(selectedIds)
            });
            setSelectedIds(new Set());
        } catch (err) {
            const error = err as Error;
            alert(error.message || "Failed to delete cards.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteSingle = async (id: Id<"cards">) => {
        if (!user?.id) {
            alert("User not authenticated.");
            return;
        }
        if (!confirm("Are you sure you want to delete this card?")) return;

        setIsDeleting(true);
        try {
            await deleteCards({
                clerkId: user!.id!,
                cardIds: [id]
            });
            const newSet = new Set(selectedIds);
            newSet.delete(id);
            setSelectedIds(newSet);
        } catch (err) {
            const error = err as Error;
            alert(error.message || "Failed to delete card.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isLoaded || cardsList === undefined) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="animate-spin text-red-600 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Print specific CSS */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 text-foreground">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <SmartphoneNfc className="text-red-500 w-8 h-8" />
                        NFC Factory
                    </h1>
                    <p className="text-muted-foreground mt-1">Scan physical cards to register them and generate activation QR codes.</p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <Button 
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-foreground h-12 px-6 rounded-2xl transition-all"
                        >
                            {isDeleting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete Selected ({selectedIds.size})
                        </Button>
                    )}
                    <Button 
                        onClick={isScanning ? stopScanning : startScanning}
                        className={isScanning 
                            ? "bg-muted text-foreground border border-border hover:bg-accent h-12 px-6 rounded-2xl" 
                            : "bg-red-600 hover:bg-red-700 text-foreground font-bold h-12 px-8 rounded-2xl shadow-lg shadow-red-900/20"
                        }
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                                Cancel Scanning...
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5 mr-2" />
                                Scan NFC Card
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* How It Works Info */}
            <div className="mb-8 bg-card/50 border border-border rounded-3xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-500" />
                    How Card Activation Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background/50 rounded-2xl p-4 border border-border">
                        <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
                            <span className="text-red-500 font-black">1</span>
                        </div>
                        <h4 className="font-bold text-foreground text-sm mb-2">Register Card</h4>
                        <p className="text-xs text-muted-foreground">Scan or manually register cards. They start as &quot;inventory&quot; status.</p>
                    </div>
                    <div className="bg-background/50 rounded-2xl p-4 border border-border">
                        <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
                            <span className="text-red-500 font-black">2</span>
                        </div>
                        <h4 className="font-bold text-foreground text-sm mb-2">Customer Taps</h4>
                        <p className="text-xs text-muted-foreground">Customer taps the card → redirected to signup with auto-activation.</p>
                    </div>
                    <div className="bg-background/50 rounded-2xl p-4 border border-border">
                        <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center mb-3">
                            <span className="text-red-500 font-black">3</span>
                        </div>
                        <h4 className="font-bold text-foreground text-sm mb-2">Card Activated</h4>
                        <p className="text-xs text-muted-foreground">After signup, card is automatically claimed and linked to their profile.</p>
                    </div>
                </div>
            </div>

            {isScanning && (
                <div className="mb-8 p-12 bg-card/50 border-2 border-dashed border-red-500/30 rounded-[2.5rem] flex flex-col items-center justify-center text-center animate-pulse">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <SmartphoneNfc className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Scan</h2>
                    <p className="text-muted-foreground max-w-sm">Bring a physical NFC card close to your device&apos;s NFC reader to register it.</p>
                    {ndefStatus && (
                        <div className="mt-4 px-4 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-xs font-bold animate-pulse">
                            {ndefStatus}
                        </div>
                    )}
                </div>
            )}

            {scanError && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{scanError}</p>
                    <Button variant="ghost" size="icon" className="ml-auto text-red-500 hover:bg-red-500/10" onClick={() => setScanError(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Registration & Recent */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card border border-border rounded-3xl p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-red-500" />
                            Manual Register
                        </h3>
                        <form onSubmit={handleManualRegister} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Card UID / Serial</label>
                                <Input 
                                    name="uuid"
                                    placeholder="e.g. 04:A1:B2:C3:D4:E5:F6" 
                                    className="bg-background border-border h-12 rounded-xl text-foreground font-mono"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full bg-muted hover:bg-accent text-foreground h-12 rounded-xl">
                                Register Manually
                            </Button>
                        </form>
                    </div>

                    {lastRegistered && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldCheck className="w-12 h-12 text-emerald-500" />
                            </div>
                            <h3 className="text-emerald-500 font-bold mb-4 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" />
                                Just Registered
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-[10px] uppercase font-black text-emerald-500/60 tracking-widest">Activation Code</div>
                                    <div className="text-2xl font-black text-foreground tracking-[0.2em]">{lastRegistered.activationCode}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-black text-emerald-500/60 tracking-widest">Card ID (UID)</div>
                                    <div className="text-xs font-mono text-muted-foreground truncate">{lastRegistered.uuid}</div>
                                </div>
                                <Button 
                                    onClick={() => {
                                        setSelectedCard(lastRegistered);
                                        setShowPrintDialog(true);
                                    }}
                                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-foreground rounded-xl"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Sticker
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Records Table */}
                <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-background/30">
                            <div>
                                <h2 className="font-bold text-foreground text-lg">Inventory Database</h2>
                                <p className="text-xs text-muted-foreground">{cardsList.length} total cards registered</p>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-12 pl-6">
                                            <Checkbox 
                                                checked={cardsList.length > 0 && selectedIds.size === cardsList.length}
                                                onCheckedChange={toggleSelectAll}
                                                className="border-border data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                            />
                                        </TableHead>
                                        <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Card UID</TableHead>
                                        <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Code</TableHead>
                                        <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                                        <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cardsList.length === 0 ? (
                                        <TableRow className="border-border">
                                            <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-medium">
                                                No cards registered yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        cardsList.map((card) => (
                                            <TableRow key={card._id} className={`border-border transition-colors group ${selectedIds.has(card._id) ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-accent/30"}`}>
                                                <TableCell className="pl-6">
                                                    <Checkbox 
                                                        checked={selectedIds.has(card._id)}
                                                        onCheckedChange={() => toggleSelect(card._id)}
                                                        className="border-border data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs text-foreground">{card.uuid}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono font-black text-red-500 tracking-wider">
                                                        {card.activationCode}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {card.status === "inventory" ? (
                                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold uppercase tracking-tight">
                                                            In Stock
                                                        </Badge>
                                                    ) : card.status === "active" ? (
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold uppercase tracking-tight">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold uppercase tracking-tight">
                                                            Lost
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                            onClick={() => {
                                                                setSelectedCard(card);
                                                                setShowPrintDialog(true);
                                                            }}
                                                            title="Print Sticker"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-foreground hover:text-red-500 hover:bg-red-500/10"
                                                            onClick={() => handleDeleteSingle(card._id)}
                                                            title="Delete Card"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Preview Dialog */}
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent className="sm:max-w-md bg-background border-border text-foreground rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase">Label Preview</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            This is how the physical sticker will look when printed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-10">
                        {/* The Actual Label Template */}
                        <div 
                            id="print-section"
                            className="bg-white p-4 rounded-lg flex flex-col items-center justify-center shadow-2xl"
                            style={{ width: '200px', height: '200px' }}
                        >
                            <div className="mb-2 text-black font-black text-xs tracking-[0.2em] uppercase">{SIGMATAP.name}</div>

                            <QRCodeSVG
                                value={`${PRODUCTION_DOMAIN}/t/${selectedCard?.uuid || ""}`}
                                size={110}
                                level="H"
                                marginSize={1}
                            />

                            <div className="mt-2 text-black font-mono text-[9px] text-center px-2 truncate max-w-full">
                                {PRODUCTION_DOMAIN.replace(/^https?:\/\//, "")}/t/{selectedCard?.uuid?.substring(0, 8)}...
                            </div>

                            {/* The manual-entry fallback promises "the
                                6-character code found on your card or its
                                packaging" — so the code has to actually BE on
                                the label, not only in the admin table. */}
                            <div className="mt-1 text-black font-black text-[13px] tracking-[0.25em]">
                                {selectedCard?.activationCode}
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                            <div className="p-4 bg-card rounded-2xl border border-border">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Sticker Size</p>
                                <p className="text-sm font-bold">25mm x 25mm</p>
                            </div>
                            <div className="p-4 bg-card rounded-2xl border border-border">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">DPI Recommendation</p>
                                <p className="text-sm font-bold">300 DPI</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between gap-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowPrintDialog(false)}
                            className="rounded-xl bg-muted hover:bg-accent border-none text-foreground"
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={handlePrint}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-foreground font-bold"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Label
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
