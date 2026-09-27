"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { accountName } from "@/lib/accountName";
import { useDeleteLead, useMyLeads, useUpdateLeadStatus, type Lead } from "@/hooks/useLeads";
import { leadReplyLinks } from "@/lib/leadContact";
import { leadStatusActions, type LeadAction } from "@/lib/leadActions";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  MessageSquare,
  CheckCircle2,
  Mail,
  Phone,
  Search,
  Download,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UpgradeGate } from "@/components/billing/UpgradeGate";
import Link from "next/link";
import { CONNECTA } from "@/lib/brand";
import { useMyProfiles } from "@/hooks/useProfiles";
import { newestProfileId } from "@/lib/builderEntry";
import { leadsExportFilename, toCsv } from "@/lib/csv";

export default function LeadsPage() {
  const { user } = useAuth();
  const { data: appUser } = useCurrentUser();
  // Signs the prefilled reply with the owner's real name, not a placeholder.
  const signature = accountName(appUser, user?.user_metadata);
  const { data: leadsData } = useMyLeads();
  // "Edit your profile" must name a profile: the bare builder URL means CREATE,
  // which on a paid plan made a duplicate profile instead of editing one.
  const { data: myProfiles } = useMyProfiles();
  const newestId = myProfiles ? newestProfileId(myProfiles) : null;
  const editProfileHref = newestId ? `/dashboard/builder?id=${newestId}` : "/dashboard/builder";
  const updateStatus = useUpdateLeadStatus().mutateAsync;
  const markContacted = ({ leadId }: { leadId: string }) =>
    updateStatus({ id: leadId, status: "contacted" });
  const deleteLead = useDeleteLead().mutateAsync;
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const leads = leadsData?.leads;
  const lockedCount = leadsData?.lockedCount ?? 0;
  const canExport = leadsData?.canExport ?? false;

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [followUpMsg, setFollowUpMsg] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [search, setSearch] = useState("");

  const chips = ["All", "New", "Contacted", "Closed"];

  const handleFollowUpClick = (lead: Lead) => {
    setSelectedLead(lead);
    const refText = lead.property_name ? `about ${lead.property_name}` : "from my profile";
    setFollowUpMsg(
      `Hi ${lead.inquirer_name},\n\nThanks for inquiring ${refText}. I'd be happy to provide more details.\n\nAre you available for a quick call or viewing this week?\n\nBest regards,${signature ? `\n${signature}` : ""}`,
    );
  };

  // Shared by both markContacted call sites below (the follow-up dialog's
  // Send action and the list item's quick "mark as contacted" button) so
  // a rejected write is never left silent — without this a lead could
  // stay stuck showing "New" in the UI while the backend write actually
  // failed, with no signal to the user that anything went wrong.
  const handleMarkContacted = async (leadId: string) => {
    try {
      await markContacted({ leadId });
    } catch (err) {
      console.error(err);
      toast.error(toUserMessage(err));
    }
  };

  // B14: reply on the channel the lead left: SMS, WhatsApp or Viber for a
  // number, email for an address. Opening one counts as contacting them.
  const replyLinks = (lead: Lead) =>
    leadReplyLinks({
      contact: lead.inquirer_contact,
      subject: `Re: your inquiry${lead.property_name ? ` about ${lead.property_name}` : ""}`,
      body: followUpMsg,
    }).filter((link) => link.channel !== "call");

  const handleReplySent = (lead: Lead) => {
    if (lead.status === "new") void handleMarkContacted(lead.id);
    setSelectedLead(null);
  };

  // B13: close, reopen and delete, alongside mark-contacted.
  const handleLeadAction = async (lead: Lead, action: LeadAction) => {
    if (action === "delete") {
      setLeadToDelete(lead);
      return;
    }
    const status: Lead["status"] = action === "reopen" ? "new" : action;
    try {
      await updateStatus({ id: lead.id, status });
    } catch (err) {
      toast.error(toUserMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    try {
      await deleteLead(leadToDelete.id);
      toast.success("Lead deleted");
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setLeadToDelete(null);
    }
  };

  const filteredLeads = (leads ?? []).filter((lead) => {
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
      lead.inquirer_name.toLowerCase().includes(q) ||
      lead.inquirer_contact.toLowerCase().includes(q) ||
      (lead.property_name || "").toLowerCase().includes(q);
    return matchesChip && matchesSearch;
  });

  const handleExportCsv = () => {
    const rows = [
      ["Name", "Contact", "Regarding", "Message", "Status", "Date"],
      ...filteredLeads.map((l) => [
        l.inquirer_name,
        l.inquirer_contact,
        l.property_name || "General Inquiry",
        (l.message || "").replace(/\n/g, " "),
        l.status,
        new Date(l.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = leadsExportFilename(CONNECTA.name, new Date().toISOString().slice(0, 10));
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
            <Skeleton key={i} className="h-48" />
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
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="lead-search" className="sr-only">
              Search leads
            </label>
            <Input
              id="lead-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-10"
            />
          </div>
          {leads.length > 0 && (
            // CSV export used to just vanish for free users
            // (canExport === false) with no explanation — now it
            // stays visible as a locked CTA via the shared
            // gating component instead of disappearing.
            <UpgradeGate locked={!canExport} reason="CSV export is a Lead tools feature." variant="inline">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="shrink-0"
                aria-label="Export leads as CSV"
              >
                <Download className="h-4 w-4 md:mr-2" aria-hidden="true" />
                <span className="hidden md:inline">Export CSV</span>
              </Button>
            </UpgradeGate>
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
            className={`px-6 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-[1.5px] ${
              activeChip === chip
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:text-foreground"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {lockedCount > 0 && (
        <Link
          href="/dashboard/billing"
          className="flex items-center justify-between gap-3 border-[1.5px] border-input px-5 py-4 transition-colors hover:bg-accent"
        >
          <p className="text-sm font-medium text-foreground">
            <span className="font-semibold">{lockedCount}</span> older{" "}
            {lockedCount === 1 ? "lead is" : "leads are"} locked on the Free plan. Upgrade to Lead
            tools to view all your leads.
          </p>
          <span className="shrink-0 text-sm font-semibold text-primary">Upgrade</span>
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
            action={search ? undefined : { label: "Edit your profile", href: editProfileHref }}
          />
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="relative border-[1.5px] border-input bg-background p-5"
            >
              {/* The `truncate` on the contact below only works if
                                every flex ancestor can shrink. Without min-w-0
                                they each sit at min-width:auto, so a long email
                                widened the whole card to ~423px inside a 320px
                                viewport and the overflow was clipped, not
                                scrolled. shrink-0 keeps the icon and status chip
                                at their intended size while the text gives way. */}
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border-[1.5px] border-input text-muted-foreground">
                    <MessageSquare className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">
                      {lead.inquirer_name}
                    </h3>
                    <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
                      <span className="shrink-0">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                      <span aria-hidden="true" className="shrink-0">
                        •
                      </span>
                      <span className="truncate">{lead.inquirer_contact}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusChip status={lead.status} />
                </div>
              </div>

              <div className="mb-6 border-t-[1.5px] border-input">
                <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5">
                  <p className="text-[13px] font-semibold text-muted-foreground">Regarding</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {lead.property_name || "General inquiry"}
                  </p>
                </div>
                <p className="pt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {lead.message ? <>&quot;{lead.message}&quot;</> : <span className="italic">No message</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button className="flex-1" onClick={() => handleFollowUpClick(lead)}>
                  <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                  Reply
                </Button>
                {(() => {
                  const quick = leadReplyLinks({
                    contact: lead.inquirer_contact,
                    subject: "",
                    body: "",
                  }).find((link) => link.channel === "call" || link.channel === "email");
                  if (!quick) return null;
                  const Icon = quick.channel === "call" ? Phone : Mail;
                  return (
                    <Button asChild variant="outline" size="icon" className="size-9">
                      <a
                        href={quick.href}
                        aria-label={`${quick.channel === "call" ? "Call" : "Email"} ${lead.inquirer_name}`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </Button>
                  );
                })()}
                {leadStatusActions(lead.status).map((action) => {
                  const meta = {
                    contacted: { label: "Mark as contacted", Icon: CheckCircle2, tone: "text-primary" },
                    closed: { label: "Close lead", Icon: Archive, tone: "" },
                    reopen: { label: "Reopen lead", Icon: RotateCcw, tone: "" },
                    delete: { label: "Delete lead", Icon: Trash2, tone: "text-destructive" },
                  }[action];
                  return (
                    <Button
                      key={action}
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={() => handleLeadAction(lead, action)}
                      aria-label={meta.label}
                      title={meta.label}
                    >
                      <meta.Icon className={`w-4 h-4 ${meta.tone}`} aria-hidden="true" />
                    </Button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Follow up</DialogTitle>
            <DialogDescription>
              Personalize your response to {selectedLead?.inquirer_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="followup-message" className="sr-only">
              Follow-up message
            </label>
            <Textarea
              id="followup-message"
              value={followUpMsg}
              onChange={(e) => setFollowUpMsg(e.target.value)}
              rows={8}
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setSelectedLead(null)}>
              Cancel
            </Button>
            {selectedLead && replyLinks(selectedLead).length === 0 && (
              <p className="text-sm text-muted-foreground sm:self-center">
                No phone or email to reply to. Copy the message and send it where they reached you.
              </p>
            )}
            {selectedLead &&
              replyLinks(selectedLead).map((link) => (
                <Button key={link.channel} asChild>
                  <a
                    href={link.href}
                    target={link.channel === "whatsapp" ? "_blank" : undefined}
                    rel={link.channel === "whatsapp" ? "noopener noreferrer" : undefined}
                    onClick={() => handleReplySent(selectedLead)}
                  >
                    Send by {link.label}
                  </a>
                </Button>
              ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {leadToDelete?.inquirer_name}&apos;s details and message will be permanently deleted.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusChip({ status }: { status: "new" | "contacted" | "closed" }) {
  const map = {
    new: { label: "New", className: "border-primary text-primary" },
    contacted: { label: "Contacted", className: "border-input text-foreground" },
    closed: { label: "Closed", className: "border-input text-muted-foreground" },
  } as const;
  const { label, className } = map[status];
  return (
    <span className={`shrink-0 border-[1.5px] px-3 py-1 text-[13px] font-semibold ${className}`}>
      {label}
    </span>
  );
}
