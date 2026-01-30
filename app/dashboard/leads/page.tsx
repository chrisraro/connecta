"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Mail, CheckCircle2, Clock } from "lucide-react";
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

export default function LeadsPage() {
    const leads = useQuery(api.leads.getLeads);
    const markContacted = useMutation(api.leads.markContacted);

    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [followUpMsg, setFollowUpMsg] = useState("");

    const handleFollowUpClick = (lead: any) => {
        setSelectedLead(lead);
        setFollowUpMsg(`Hi ${lead.inquirerName},

Thanks for inquiring about ${lead.propertyName}. I'd be happy to provide more details.

Are you available for a quick call or viewing this week?

Best regards,
[Your Name]`);
    };

    const handleSendAction = () => {
        if (!selectedLead) return;

        // MVP: Open Mailto
        // In real app: Send Grid / heavy integration
        const subject = `Re: Inquiry for ${selectedLead.propertyName}`;
        const body = encodeURIComponent(followUpMsg);
        window.open(`mailto:${selectedLead.inquirerContact}?subject=${subject}&body=${body}`);

        // Mark as contacted
        markContacted({ leadId: selectedLead._id });
        setSelectedLead(null);
    };

    if (leads === undefined) {
        return <div className="p-8">Loading leads...</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads & Inquiries</h1>
                    <p className="text-muted-foreground">Manage and follow up with potential clients.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {leads.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No inquiries yet. Share your profile to get started!</p>
                    </Card>
                ) : (
                    leads.map((lead) => (
                        <Card key={lead._id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{lead.inquirerName}</h3>
                                    <Badge variant={lead.status === "new" ? "destructive" : "secondary"}>
                                        {lead.status === "new" ? "New" : "Contacted"}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="font-medium text-foreground">{lead.propertyName}</span>
                                    • {new Date(lead.createdAt).toLocaleDateString()}
                                </p>
                                <p className="text-sm italic text-muted-foreground/80">"{lead.message || "I'm interested in this property."}"</p>
                                <div className="flex gap-4 text-xs pt-1">
                                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.inquirerContact}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 min-w-[140px]">
                                <Button size="sm" onClick={() => handleFollowUpClick(lead)}>
                                    <MessageSquare className="w-4 h-4 mr-2" /> Follow Up
                                </Button>
                                {lead.status === "new" && (
                                    <Button variant="ghost" size="sm" onClick={() => markContacted({ leadId: lead._id })}>
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Contacted
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Follow Up Modal (Using Dialog if available or simple overlay logic) */}
            {/* Assuming Dialog is not set up, I'll use a simple absolute overlay modal here or default Dialog if I can import it. */}
            <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Follow Up with {selectedLead?.inquirerName}</DialogTitle>
                        <DialogDescription>Customize your response below.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={followUpMsg}
                        onChange={(e) => setFollowUpMsg(e.target.value)}
                        rows={8}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
                        <Button onClick={handleSendAction}><Mail className="w-4 h-4 mr-2" /> Open Mail App</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
