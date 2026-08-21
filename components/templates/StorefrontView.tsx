"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileData } from "@/types/profile";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { formatPHP } from "@/lib/payment";
import { buildServiceCatalogItems, CatalogItem } from "@/lib/serviceCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Search,
    ShoppingBag,
    Briefcase,
    Phone,
    Mail,
    Globe,
    ExternalLink,
    Building2,
    ArrowRight,
    Store,
    Send,
    Loader2,
    CheckCircle2,
    MessageSquare,
} from "lucide-react";

interface StorefrontViewProps {
    data: ProfileData;
}

export function StorefrontView({ data }: StorefrontViewProps) {
    const { agent, products = [], ownerId } = data;
    const createLead = useMutation(api.leads.createLead);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<"all" | "products" | "services">("all");
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

    // Inquiry Lead Form Modal State
    const [inquiryItem, setInquiryItem] = useState<CatalogItem | null>(null);
    const [inquiryForm, setInquiryForm] = useState({ name: "", contact: "", message: "" });
    const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
    const [inquirySuccess, setInquirySuccess] = useState(false);

    // Normalize catalog items
    const productItems: CatalogItem[] = (products || []).map((p) => ({
        type: "product",
        title: p.title,
        description: p.description,
        price: p.price,
        image: p.image,
        link: p.link,
    }));

    // agent.services (simple string tags, edited by the builder's "Services"
    // panel) is the ONE authoritative services source — see
    // lib/serviceCatalog.ts's doc comment for why this used to be a merge of
    // two sources and no longer is.
    const serviceItems: CatalogItem[] = buildServiceCatalogItems(agent);
    const allCatalogItems = [...productItems, ...serviceItems];

    const filteredItems = allCatalogItems.filter((item) => {
        const matchesCategory =
            activeCategory === "all"
                ? true
                : activeCategory === "products"
                ? item.type === "product"
                : item.type === "service";

        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !query ||
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });

    const openInquiryModal = (item: CatalogItem) => {
        const defaultMsg = `Hi ${agent.fullName}, I am interested in inquiring about your offering: "${item.title}"${
            item.price ? ` (${formatPHP(item.price)})` : ""
        }. Please contact me with availability and details.`;

        setInquiryForm({ name: "", contact: "", message: defaultMsg });
        setInquirySuccess(false);
        setInquiryItem(item);
    };

    const handleSendInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inquiryForm.name || !inquiryForm.contact) return;

        setIsSubmittingInquiry(true);
        try {
            await createLead({
                ownerId: ownerId as Id<"users">,
                inquirerName: inquiryForm.name,
                inquirerContact: inquiryForm.contact,
                message: inquiryForm.message,
            });

            setInquirySuccess(true);
            setTimeout(() => {
                setInquirySuccess(false);
                setInquiryItem(null);
            }, 3000);
        } catch (err) {
            console.error("Failed to submit inquiry lead:", err);
            toast.error(toUserMessage(err));
        } finally {
            setIsSubmittingInquiry(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-background text-foreground pb-20 selection:bg-yellow-500/30">
            {/* ─── Hero Header & Business Branding ─────────────────────── */}
            <div className="relative border-b border-border bg-card/60 backdrop-blur-xl overflow-hidden">
                <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[200%] bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                        {/* Avatar / Logo */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-primary/20 shadow-2xl bg-muted shrink-0 relative">
                            <ProfileImage
                                src={agent.avatarUrl}
                                alt={agent.fullName}
                                fallbackSeed={agent.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20 gap-1 rounded-full text-xs font-bold uppercase">
                                    <Store className="w-3 h-3" /> Business Storefront
                                </Badge>
                                {agent.company && (
                                    <Badge variant="outline" className="px-3 py-1 gap-1 rounded-full text-xs font-medium">
                                        <Building2 className="w-3 h-3" /> {agent.company}
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                                {agent.company || agent.fullName}
                            </h1>

                            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed font-medium">
                                {agent.about || `${agent.title} • Products & Offered Services`}
                            </p>

                            {/* Contact Badges */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                                {agent.phone && (
                                    <a
                                        href={`tel:${agent.phone}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{agent.phone}</span>
                                    </a>
                                )}
                                {agent.email && (
                                    <a
                                        href={`mailto:${agent.email}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>{agent.email}</span>
                                    </a>
                                )}
                                {agent.website && (
                                    <a
                                        href={agent.website.startsWith("http") ? agent.website : `https://${agent.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>Website</span>
                                        <ExternalLink className="w-3 h-3 opacity-60" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Main Catalog Content ─────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Filter Controls Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    {/* Category Tabs */}
                    {/* `flex-1` below carries `min-width: auto`, so each tab
                        is floored at its own min-content width (measured 87 /
                        85 / 84px). Their 272px total fits a real 320px phone
                        (~284px available) but not the builder's 182px preview
                        frame, where the strip was clipped and the "Services"
                        tab's right edge landed 21px past the viewport with no
                        way to reach it. Scrolling the strip — the same
                        treatment the dashboard filter chips get — keeps the
                        tabs stretched when they fit and reachable when they
                        don't, without clipping either way. */}
                    <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border w-full overflow-x-auto sm:w-auto">
                        <button
                            onClick={() => setActiveCategory("all")}
                            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeCategory === "all"
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            All Offerings ({allCatalogItems.length})
                        </button>
                        <button
                            onClick={() => setActiveCategory("products")}
                            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeCategory === "products"
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Products ({productItems.length})
                        </button>
                        <button
                            onClick={() => setActiveCategory("services")}
                            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeCategory === "services"
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Services ({serviceItems.length})
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search catalog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card border-border rounded-xl text-xs"
                        />
                    </div>
                </div>

                {/* Catalog Grid */}
                {filteredItems.length === 0 ? (
                    <div className="text-center py-16 px-4 border border-dashed border-border rounded-3xl bg-card/30">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold mb-1">No items found</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            No matching products or services were found for your current filter.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => setSelectedItem(item)}
                                className="group bg-card border border-border hover:border-primary/40 rounded-3xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col cursor-pointer"
                            >
                                {/* Media Container */}
                                <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                                            {item.type === "product" ? (
                                                <ShoppingBag className="w-10 h-10 opacity-70" />
                                            ) : (
                                                <Briefcase className="w-10 h-10 opacity-70" />
                                            )}
                                        </div>
                                    )}

                                    {/* Type Tag */}
                                    <div className="absolute top-3 left-3">
                                        <Badge
                                            variant="secondary"
                                            className={`capitalize text-[10px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
                                                item.type === "product"
                                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                            }`}
                                        >
                                            {item.type}
                                        </Badge>
                                    </div>

                                    {/* Price Tag */}
                                    {item.price !== undefined && item.price > 0 && (
                                        <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md border border-border px-3 py-1 rounded-xl shadow-lg">
                                            <span className="text-xs font-extrabold text-foreground">
                                                {formatPHP(item.price)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                    <div>
                                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between border-t border-border/60">
                                        <span className="text-[11px] font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            View &amp; Inquire <ArrowRight className="w-3 h-3" />
                                        </span>
                                        {item.link && (
                                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Item Details Modal ──────────────────────────────────── */}
            {selectedItem && (
                <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                    <DialogContent className="sm:max-w-[520px] p-0 bg-background/95 backdrop-blur-2xl border-border rounded-3xl overflow-hidden shadow-2xl">
                        <div className="aspect-[16/9] w-full bg-muted relative">
                            {selectedItem.image ? (
                                <img
                                    src={selectedItem.image}
                                    alt={selectedItem.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                                    {selectedItem.type === "product" ? (
                                        <ShoppingBag className="w-12 h-12 opacity-80" />
                                    ) : (
                                        <Briefcase className="w-12 h-12 opacity-80" />
                                    )}
                                </div>
                            )}

                            <div className="absolute top-4 left-4">
                                <Badge className="capitalize text-xs font-bold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border-0">
                                    {selectedItem.type}
                                </Badge>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">{selectedItem.title}</h2>
                                    {selectedItem.price !== undefined && selectedItem.price > 0 && (
                                        <p className="text-lg font-extrabold text-primary mt-0.5">
                                            {formatPHP(selectedItem.price)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                {selectedItem.description}
                            </p>

                            {/* Action Buttons */}
                            <div className="pt-4 flex flex-col sm:flex-row items-center gap-2 border-t border-border">
                                <Button
                                    onClick={() => {
                                        const itemToInquire = selectedItem;
                                        setSelectedItem(null);
                                        openInquiryModal(itemToInquire);
                                    }}
                                    className="w-full font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                                >
                                    <MessageSquare className="w-4 h-4" /> Inquire via Lead Form
                                </Button>

                                {selectedItem.link && (
                                    <a
                                        href={selectedItem.link.startsWith("http") ? selectedItem.link : `https://${selectedItem.link}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full sm:w-auto"
                                    >
                                        <Button variant="outline" className="w-full font-semibold gap-1.5 rounded-xl border-border">
                                            External Link <ExternalLink className="w-3.5 h-3.5" />
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* ─── Inquiry Lead Form Modal ─────────────────────────────── */}
            {inquiryItem && (
                <Dialog open={!!inquiryItem} onOpenChange={() => setInquiryItem(null)}>
                    <DialogContent className="sm:max-w-[460px] p-6 bg-background/95 backdrop-blur-2xl border-border rounded-3xl overflow-hidden shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                <Send className="w-4 h-4 text-primary" />
                                Inquire about {inquiryItem.title}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Send an instant lead message directly to {agent.fullName}.
                            </DialogDescription>
                        </DialogHeader>

                        {inquirySuccess ? (
                            <div className="py-8 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-base">Inquiry Sent!</h3>
                                <p className="text-xs text-muted-foreground">
                                    Your message has been sent directly to {agent.fullName}. They will review it in their dashboard.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendInquiry} className="space-y-4 pt-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground mb-1 block">Your Name</label>
                                    <Input
                                        required
                                        placeholder="e.g. Maria Santos"
                                        value={inquiryForm.name}
                                        onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                                        className="text-xs rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground mb-1 block">Your Email or Mobile Phone</label>
                                    <Input
                                        required
                                        placeholder="e.g. maria@example.com or 09171234567"
                                        value={inquiryForm.contact}
                                        onChange={(e) => setInquiryForm({ ...inquiryForm, contact: e.target.value })}
                                        className="text-xs rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground mb-1 block">Message / Inquiry Details</label>
                                    <Textarea
                                        required
                                        rows={3}
                                        value={inquiryForm.message}
                                        onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                                        className="text-xs rounded-xl resize-none"
                                    />
                                </div>

                                <div className="pt-2 flex items-center gap-2">
                                    <Button
                                        type="submit"
                                        disabled={isSubmittingInquiry}
                                        className="flex-1 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                                    >
                                        {isSubmittingInquiry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {isSubmittingInquiry ? "Sending..." : "Submit Inquiry"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setInquiryItem(null)}
                                        className="rounded-xl"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
