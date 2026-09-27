"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { ProfileData } from "@/types/profile";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { formatCatalogPrice } from "@/lib/payment";
import { buildServiceCatalogItems, CatalogItem } from "@/lib/serviceCatalog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowUpRight,
  Send,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { useCreateLead } from "@/hooks/useLeads";
import { PROFILE_COPY as t } from "@/components/survey/copy";
import styles from "@/components/survey/survey.module.css";

interface StorefrontViewProps {
  data: ProfileData;
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * The profile's "Services & products" tab, in the Survey Plan world: square
 * tags, flat `--sv-ground` placeholders and 1.5px `--sv-line` rules, on the
 * same `--sv-*` custom properties SurveyProfile sets on the page root.
 */
export function StorefrontView({ data }: StorefrontViewProps) {
  const { agent, products = [], ownerId } = data;
  // createLead posts to /api/leads (see hooks/useLeads.ts).
  const createLead = useCreateLead();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "products" | "services">("all");
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  // Inquiry lead form modal state.
  const [inquiryItem, setInquiryItem] = useState<CatalogItem | null>(null);
  const [inquiryForm, setInquiryForm] = useState({ name: "", contact: "", message: "" });
  // L-8: nothing is sent until the visitor agrees.
  const [consent, setConsent] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const uid = useId();

  // Normalize catalog items.
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
    const defaultMsg = `Hi ${agent.fullName}, I am interested in your offering: "${item.title}"${
      item.price ? ` (${formatCatalogPrice(item.price)})` : ""
    }. Please contact me with availability and details.`;

    setInquiryForm({ name: "", contact: "", message: defaultMsg });
    setConsent(false);
    setInquiryStatus("idle");
    setInquiryItem(item);
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.name || !inquiryForm.contact || !consent) return;

    setInquiryStatus("sending");
    try {
      await createLead.mutateAsync({
        owner_id: ownerId,
        inquirer_name: inquiryForm.name,
        inquirer_contact: inquiryForm.contact,
        message: inquiryForm.message,
        consent,
      });

      setInquiryStatus("sent");
      setTimeout(() => {
        setInquiryItem(null);
      }, 2500);
    } catch (err) {
      console.error("Failed to submit inquiry lead:", err);
      toast.error(toUserMessage(err));
      setInquiryStatus("error");
    }
  };

  const categories: { id: "all" | "products" | "services"; label: string; count: number }[] = [
    { id: "all", label: "All offerings", count: allCatalogItems.length },
    { id: "products", label: "Products", count: productItems.length },
    { id: "services", label: "Services", count: serviceItems.length },
  ];

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-16 lg:max-w-[900px] lg:px-14 lg:pb-14 lg:pt-10">
      {/* ─── Business header ────────────────────────────────────────── */}
      <div className="mt-6 border-[1.5px] p-5" style={{ borderColor: "var(--sv-line)" }}>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div
            className={`${styles.duotone} h-20 w-20 shrink-0 border-[1.5px]`}
            style={{ borderColor: "var(--sv-line)" }}
          >
            <ProfileImage
              src={agent.avatarUrl}
              alt={agent.fullName}
              fallbackSeed={agent.fullName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className={`${styles.expanded} text-2xl font-bold leading-tight`}>
              {agent.company || agent.fullName}
            </h1>
            <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "var(--sv-soft)" }}>
              {agent.about || agent.title || t.storefrontTab}
            </p>

            {(agent.phone || agent.email || agent.website) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone.replace(/\s+/g, "")}`}
                    className={`${styles.cell} flex items-center gap-1.5 border-[1.5px] px-3 py-1.5 text-[13px] font-semibold`}
                    style={{ borderColor: "var(--sv-line)" }}
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className={`${styles.cell} flex items-center gap-1.5 border-[1.5px] px-3 py-1.5 text-[13px] font-semibold`}
                    style={{ borderColor: "var(--sv-line)" }}
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    {agent.email}
                  </a>
                )}
                {agent.website && (
                  <a
                    href={normalizeUrl(agent.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.cell} flex items-center gap-1.5 border-[1.5px] px-3 py-1.5 text-[13px] font-semibold`}
                    style={{ borderColor: "var(--sv-line)" }}
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    Website
                    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex w-full overflow-x-auto border-[1.5px] sm:w-auto"
          style={{ borderColor: "var(--sv-line)" }}
        >
          {categories.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              aria-pressed={activeCategory === c.id}
              className={`${styles.cell} flex-1 whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold sm:flex-initial ${
                i > 0 ? "border-l-[1.5px]" : ""
              }`}
              style={{
                borderColor: "var(--sv-line)",
                backgroundColor: activeCategory === c.id ? "var(--sv-line)" : "transparent",
                color: activeCategory === c.id ? "var(--sv-ground)" : "var(--sv-ink)",
              }}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--sv-soft)" }}
            aria-hidden="true"
          />
          <label htmlFor={`${uid}-search`} className="sr-only">
            Search catalog
          </label>
          <input
            id={`${uid}-search`}
            placeholder="Search catalog…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${styles.field} pl-9`}
            style={{ minHeight: "44px" }}
          />
        </div>
      </div>

      {/* ─── Catalog grid ────────────────────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div
          className="mt-8 border-[1.5px] border-dashed px-6 py-14 text-center"
          style={{ borderColor: "var(--sv-line)" }}
        >
          <ShoppingBag className="mx-auto h-8 w-8" style={{ color: "var(--sv-soft)" }} aria-hidden="true" />
          <h3 className="mt-4 text-[17px] font-bold">No items found</h3>
          <p className="mt-1 text-[14px]" style={{ color: "var(--sv-soft)" }}>
            No matching products or services for the current filter.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => (
            <li key={index} className="border-[1.5px]" style={{ borderColor: "var(--sv-line)" }}>
              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="flex w-full flex-col text-left"
              >
                <div className="flex items-center justify-between border-b-[1.5px] px-3 py-2" style={{ borderColor: "var(--sv-line)" }}>
                  <span className={`${styles.mono} text-[11px] uppercase`} style={{ color: "var(--sv-soft)" }}>
                    {item.type}
                  </span>
                  {item.price !== undefined && item.price > 0 && (
                    <span className={`${styles.mono} text-[13px] font-semibold`}>
                      {formatCatalogPrice(item.price)}
                    </span>
                  )}
                </div>
                <div
                  className="flex aspect-[4/3] w-full items-center justify-center"
                  style={{ backgroundColor: "var(--sv-ground)" }}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : item.type === "product" ? (
                    <ShoppingBag className="h-9 w-9" style={{ color: "var(--sv-soft)" }} aria-hidden="true" />
                  ) : (
                    <Briefcase className="h-9 w-9" style={{ color: "var(--sv-soft)" }} aria-hidden="true" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 border-t-[1.5px] p-4" style={{ borderColor: "var(--sv-line)" }}>
                  <h3 className="text-[16px] font-bold leading-snug line-clamp-1">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--sv-soft)" }}>
                    {item.description}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold">
                    View &amp; inquire
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ─── Item details modal ──────────────────────────────────────── */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{selectedItem.title}</DialogTitle>
              {selectedItem.price !== undefined && selectedItem.price > 0 && (
                <DialogDescription className="text-base font-semibold text-foreground">
                  {formatCatalogPrice(selectedItem.price)}
                </DialogDescription>
              )}
            </DialogHeader>

            {selectedItem.image && (
              <div className="aspect-[16/9] w-full border-[1.5px] border-input">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
              {selectedItem.description}
            </p>

            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const itemToInquire = selectedItem;
                  setSelectedItem(null);
                  openInquiryModal(itemToInquire);
                }}
                className={`${styles.primary} ${styles.semiExpanded} flex h-11 w-full items-center justify-center gap-2 text-[15px] font-bold`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Inquire via lead form
              </button>

              {selectedItem.link && (
                <a
                  href={normalizeUrl(selectedItem.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-1.5 border-[1.5px] border-input text-[15px] font-semibold sm:w-auto sm:px-4"
                >
                  External link
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Inquiry lead form modal ─────────────────────────────────── */}
      {inquiryItem && (
        <Dialog open={!!inquiryItem} onOpenChange={() => setInquiryItem(null)}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>Inquire about {inquiryItem.title}</DialogTitle>
              <DialogDescription>
                Send a message directly to {agent.fullName}.
              </DialogDescription>
            </DialogHeader>

            {inquiryStatus === "sent" ? (
              <div className="space-y-3 py-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center border-[1.5px] border-input text-primary">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold">Inquiry sent</h3>
                <p className="text-sm text-muted-foreground">
                  Your message has been sent to {agent.fullName}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor={`${uid}-name`} className="text-[13px] font-semibold">
                    Your name
                  </label>
                  <Input
                    id={`${uid}-name`}
                    required
                    placeholder="e.g. Maria Santos"
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${uid}-contact`} className="text-[13px] font-semibold">
                    Your email or mobile phone
                  </label>
                  <Input
                    id={`${uid}-contact`}
                    required
                    placeholder="e.g. maria@example.com or 09171234567"
                    value={inquiryForm.contact}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, contact: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`${uid}-message`} className="text-[13px] font-semibold">
                    Message
                  </label>
                  <Textarea
                    id={`${uid}-message`}
                    required
                    rows={3}
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id={`${uid}-consent`}
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <label htmlFor={`${uid}-consent`} className="text-[13px] leading-snug text-muted-foreground">
                    {(() => {
                      const text = t.consent(agent.fullName);
                      const at = text.lastIndexOf(t.privacyPolicy);
                      if (at < 0) return text;
                      return (
                        <>
                          {text.slice(0, at)}
                          <Link
                            href="/privacy#lead-data"
                            className="font-semibold text-foreground underline underline-offset-2"
                          >
                            {t.privacyPolicy}
                          </Link>
                          {text.slice(at + t.privacyPolicy.length)}
                        </>
                      );
                    })()}
                  </label>
                </div>

                {inquiryStatus === "error" && (
                  <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    That didn&apos;t send. Check your connection and try again.
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={inquiryStatus === "sending" || !consent}
                    className={`${styles.primary} ${styles.semiExpanded} flex h-11 flex-1 items-center justify-center gap-2 text-[15px] font-bold disabled:opacity-60`}
                  >
                    {inquiryStatus === "sending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    {inquiryStatus === "sending" ? "Sending…" : "Send inquiry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInquiryItem(null)}
                    className="h-11 px-4 text-[15px] font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
