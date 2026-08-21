"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, Mail, Phone, Search, Download, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import Link from "next/link";

interface Lead {
    _id: Id<"leads">;
    ownerId: Id<"users">;
    propertyId?: Id<"properties">;
    propertyName?: string;
    inquirerName: string;
    inquirerContact: string;
    message?: string;
    status: "new" | "contacted" | "closed";
    lastContactedAt?: number;
    createdAt: number;
}

export default function LeadsPage() {
    const { user } = useUser();
    const leadsData = useQuery(api.leads.getLeads, user?.id ? { clerkId: user.id } : "skip");
    const markContacted = useMutation(api.leads.markContacted);

    const leads = leadsData?.leads;
    const lockedCount = leadsData?.lockedCount ?? 0;
    const canExport = leadsData?.canExport ?? false;

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [followUpMsg, setFollowUpMsg] = useState("");
    const [activeChip, setActiveChip] = useState("All");
    const [search, setSearch] = useState("");

    const chips = ["All", "New", "Contacted", "Closed"];

    const isPhone = (contact: string) => /^[+()\d\s-]{6,}$/.test(contact.trim());

    const handleFollowUpClick = (lead: Lead) => {
        setSelectedLead(lead);
        const refText = lead.propertyName ? `about ${lead.propertyName}` : "from my profile";
        setFollowUpMsg(`Hi ${lead.inquirerName},\n\nThanks for inquiring ${refText}. I'd be happy to provide more details.\n\nAre you available for a quick call or viewing this week?\n\nBest regards,\n[Your Name]`);
    };

    // Shared by both markContacted call sites below (the follow-up dialog's
    // Send action and the list item's quick "mark as contacted" button) so
    // a rejected write is never left silent — without this a lead could
    // stay stuck showing "New" in the UI while the backend write actually
    // failed, with no signal to the user that anything went wrong.
    const handleMarkContacted = async (leadId: Id<"leads">) => {
        try {
            await markContacted({ leadId });
        } catch (err) {
            console.error(err);
            toast.error(toUserMessage(err));
        }
    };

    const handleSendAction = async () => {
        if (!selectedLead) return;
        const subject = `Re: Inquiry ${selectedLead.propertyName ? `for ${selectedLead.propertyName}` : ""}`;
        const body = encodeURIComponent(followUpMsg);
        window.open(`mailto:${selectedLead.inquirerContact}?subject=${subject}&body=${body}`);
        await handleMarkContacted(selectedLead._id);
        setSelectedLead(null);
    };

    const filteredLeads = (leads ?? []).filter(lead => {
        const matchesChip =
            activeChip === "All"
                ? true
                : activeChip === "New"
                ? lead.status === "new"
                : activeChip === "Contacted"
                ? lead.status === "contacted"
                : lead.status === "closed";
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            lead.inquirerName.toLowerCase().includes(q) ||
            lead.inquirerContact.toLowerCase().includes(q) ||
            (lead.propertyName || "").toLowerCase().includes(q);
        return matchesChip && matchesSearch;
    });

    const handleExportCsv = () => {
        const rows = [
            ["Name", "Contact", "Regarding", "Message", "Status", "Date"],
            ...filteredLeads.map((l) => [
                l.inquirerName,
                l.inquirerContact,
                l.propertyName || "General Inquiry",
                (l.message || "").replace(/\n/g, " "),
                l.status,
                new Date(l.createdAt).toLocaleDateString(),
            ]),
        ];
        const csv = rows
            .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sigmatap-leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (leads === undefined) {
        return (
            <div className="space-y-6">
                <div className="hidden md:block">
                    <h1 className="text-3xl font-bold tracking-tight">Leads &amp; Inquiries</h1>
                    <p className="text-muted-foreground">Manage and follow up with potential clients.</p>
                </div>
                <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-[2rem]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="hidden md:block">
                    <h1 className="text-3xl font-bold tracking-tight">Leads &amp; Inquiries</h1>
                    <p className="text-muted-foreground">Manage and follow up with potential clients.</p>
                </div>

                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <label htmlFor="lead-search" className="sr-only">Search leads</label>
                        <Input
                            id="lead-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search leads..."
                            className="pl-10 bg-muted/50 border-border rounded-2xl h-12 md:h-10 focus-visible:ring-primary"
                        />
                    </div>
                    {leads.length > 0 && canExport && (
                        <Button
                            variant="outline"
                            onClick={handleExportCsv}
                            className="h-12 shrink-0 rounded-2xl md:h-10"
                            aria-label="Export leads as CSV"
                        >
                            <Download className="h-4 w-4 md:mr-2" aria-hidden="true" />
                            <span className="hidden md:inline">Export CSV</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Chips UI */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {chips.map((chip) => (
                    <button
                        key={chip}
                        onClick={() => setActiveChip(chip)}
                        aria-pressed={activeChip === chip}
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

            {lockedCount > 0 && (
                <Link
                    href="/dashboard/billing"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
                >
                    <p className="text-sm font-medium text-foreground">
                        <span className="font-bold">{lockedCount}</span> older{" "}
                        {lockedCount === 1 ? "lead is" : "leads are"} locked on the
                        Free plan. Upgrade to Pro to view all your leads.
                    </p>
                    <span className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                        Upgrade
                    </span>
                </Link>
            )}

            <div className="space-y-4">
                {filteredLeads.length === 0 ? (
                    <EmptyState
                        icon={MessageSquare}
                        title={search ? "No matching leads" : "No inquiries yet"}
                        description={
                            search
                                ? "Try a different search or filter."
                                : "Share your profile via NFC tap or QR code, and the leads you capture will appear here."
                        }
                        action={search ? undefined : { label: "Edit your profile", href: "/dashboard/builder" }}
                    />
                ) : (
                    filteredLeads.map((lead) => (
                        <div key={lead._id} className="group relative bg-card backdrop-blur-sm border border-border rounded-[2rem] p-5 hover:border-primary/20 transition-all duration-300">
                            {/* The `truncate` on the contact below only works if
                                every flex ancestor can shrink. Without min-w-0
                                they each sit at min-width:auto, so a long email
                                widened the whole card to ~423px inside a 320px
                                viewport and the overflow was clipped, not
                                scrolled. shrink-0 keeps the icon and status chip
                                at their intended size while the text gives way. */}
                            <div className="flex justify-between items-start gap-3 mb-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border ${
                                        lead.status === "new" ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground"
                                    }`}>
                                        <MessageSquare className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-black uppercase tracking-tight text-foreground">{lead.inquirerName}</h3>
                                        <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span className="shrink-0">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                            <span aria-hidden="true" className="shrink-0">•</span>
                                            <span className="truncate normal-case tracking-normal">{lead.inquirerContact}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <StatusChip status={lead.status} />
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter font-bold">Regarding</p>
                                    <p className="text-sm font-bold text-foreground uppercase">{lead.propertyName || "General Inquiry"}</p>
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
                                    <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                                    Reply
                                </Button>
                                {isPhone(lead.inquirerContact) ? (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-2xl border-border hover:bg-muted"
                                    >
                                        <a href={`tel:${lead.inquirerContact.replace(/\s/g, "")}`} aria-label={`Call ${lead.inquirerName}`}>
                                            <Phone className="w-5 h-5" aria-hidden="true" />
                                        </a>
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-2xl border-border hover:bg-muted"
                                    >
                                        <a href={`mailto:${lead.inquirerContact}`} aria-label={`Email ${lead.inquirerName}`}>
                                            <Mail className="w-5 h-5" aria-hidden="true" />
                                        </a>
                                    </Button>
                                )}
                                {lead.status === "new" && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-2xl border-border hover:bg-muted"
                                        onClick={() => handleMarkContacted(lead._id)}
                                        aria-label="Mark as contacted"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
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
                        <label htmlFor="followup-message" className="sr-only">Follow-up message</label>
                        <Textarea
                            id="followup-message"
                            value={followUpMsg}
                            onChange={(e) => setFollowUpMsg(e.target.value)}
                            rows={8}
                            className="bg-muted/50 border-border rounded-2xl focus-visible:ring-primary resize-none p-4 text-sm leading-relaxed"
                        />
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        <Button variant="ghost" onClick={() => setSelectedLead(null)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
                        <Button onClick={handleSendAction} className="rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] px-8 h-12 text-primary-foreground">
                            <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" /> Send Message
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusChip({ status }: { status: "new" | "contacted" | "closed" }) {
    const map = {
        new: { label: "New", className: "bg-primary/10 text-primary border-primary/20" },
        contacted: { label: "Contacted", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
        closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
    } as const;
    const { label, className } = map[status];
    return (
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${className}`}>
            {label}
        </span>
    );
}
