"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, Mail, Search, MoreHorizontal, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Id } from "@/convex/_generated/dataModel";

interface Lead {
    _id: Id<"leads">;
    ownerId: Id<"users">;
    propertyId: Id<"properties">;
    propertyName: string;
    inquirerName: string;
    inquirerContact: string;
    message?: string;
    status: "new" | "contacted" | "closed";
    lastContactedAt?: number;
    createdAt: number;
}

export default function LeadsPage() {
    const { user } = useUser();
    const leads = useQuery(api.leads.getLeads, user?.id ? { clerkId: user.id } : "skip");
    const markContacted = useMutation(api.leads.markContacted);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [followUpMsg, setFollowUpMsg] = useState("");
    const [activeChip, setActiveChip] = useState("All");

    const chips = ["All", "New", "Contacted", "Closed"];

    const handleFollowUpClick = (lead: Lead) => {
        setSelectedLead(lead);
        setFollowUpMsg(`Hi ${lead.inquirerName},\n\nThanks for inquiring about ${lead.propertyName}. I'd be happy to provide more details.\n\nAre you available for a quick call or viewing this week?\n\nBest regards,\n[Your Name]`);
    };

    const handleSendAction = () => {
        if (!selectedLead) return;
        const subject = `Re: Inquiry for ${selectedLead.propertyName}`;
        const body = encodeURIComponent(followUpMsg);
        window.open(`mailto:${selectedLead.inquirerContact}?subject=${subject}&body=${body}`);
        markContacted({ leadId: selectedLead._id });
        setSelectedLead(null);
    };

    if (leads === undefined) {
        return <div className="flex justify-center p-12 text-zinc-500"><Loader2 className="animate-spin" /></div>;
    }

    const filteredLeads = leads.filter(lead => {
        if (activeChip === "All") return true;
        if (activeChip === "New") return lead.status === "new";
        if (activeChip === "Contacted") return lead.status === "contacted";
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="hidden md:block">
                    <h1 className="text-3xl font-bold tracking-tight">Leads & Inquiries</h1>
                    <p className="text-muted-foreground">Manage and follow up with potential clients.</p>
                </div>

                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search leads..." 
                        className="pl-10 bg-muted/50 border-border rounded-2xl h-12 md:h-10 focus-visible:ring-primary"
                    />
                </div>
            </div>

            {/* Chips UI */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {chips.map((chip) => (
                    <button
                        key={chip}
                        onClick={() => setActiveChip(chip)}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${
                            activeChip === chip 
                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                            : "bg-muted border-border text-muted-foreground hover:border-primary/50"
                        }`}
                    >
                        {chip}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredLeads.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border rounded-[2.5rem] bg-card backdrop-blur-sm">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground font-medium">No {activeChip.toLowerCase()} inquiries found.</p>
                    </div>
                ) : (
                    filteredLeads.map((lead) => (
                        <div key={lead._id} className="group relative bg-card backdrop-blur-sm border border-border rounded-[2rem] p-5 hover:border-primary/20 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                        lead.status === "new" ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground"
                                    }`}>
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black uppercase tracking-tight text-foreground">{lead.inquirerName}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className={lead.status === "new" ? "text-primary" : "text-muted-foreground"}>
                                                {lead.status === "new" ? "Priority" : "Followed Up"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Regarding</p>
                                    <p className="text-sm font-bold text-foreground uppercase">{lead.propertyName}</p>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed px-1 line-clamp-2">
                                    &quot;{lead.message || "Interested in learning more about this property."}&quot;
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button 
                                    className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => handleFollowUpClick(lead)}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Reply via Email
                                </Button>
                                {lead.status === "new" && (
                                    <Button 
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-2xl border-border hover:bg-muted"
                                        onClick={() => markContacted({ leadId: lead._id })}
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
                <DialogContent className="bg-card border-border rounded-[2.5rem] sm:max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Follow Up</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium tracking-tight">
                            Personalize your response to {selectedLead?.inquirerName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={followUpMsg}
                            onChange={(e) => setFollowUpMsg(e.target.value)}
                            rows={8}
                            className="bg-muted/50 border-border rounded-2xl focus-visible:ring-primary resize-none p-4 text-sm leading-relaxed"
                        />
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        <Button variant="ghost" onClick={() => setSelectedLead(null)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
                        <Button onClick={handleSendAction} className="rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] px-8 h-12 text-primary-foreground">
                            <ArrowRight className="w-4 h-4 mr-2" /> Send Message
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
