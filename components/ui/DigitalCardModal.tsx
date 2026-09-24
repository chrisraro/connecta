"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DigitalBusinessCard } from "@/components/ui/digital-business-card";
import { ProfileInfo, DigitalCardConfig } from "@/types/profile";
import { downloadVCard } from "@/lib/vcard";
import { Download, Share2, Check, Copy, Loader2, QrCode } from "lucide-react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import Link from "next/link";
import { profileUrl } from "@/lib/profileUrl";

interface DigitalCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: ProfileInfo;
  profileId?: string;
  profileSlug?: string | null;
  digitalCardConfig?: Partial<DigitalCardConfig>;
  isOwner?: boolean;
}

export function DigitalCardModal({
  open,
  onOpenChange,
  agent,
  profileId,
  profileSlug,
  digitalCardConfig,
  isOwner = false,
}: DigitalCardModalProps) {
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const host = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = profileId ? profileUrl(host, { id: profileId, slug: profileSlug }) : host;

  const handleDownloadImage = async () => {
    if (!cardWrapperRef.current) return;
    setIsDownloading(true);
    try {
      // Target the inner card element
      const cardEl =
        cardWrapperRef.current.querySelector<HTMLElement>("[data-digital-card]") ??
        cardWrapperRef.current;
      const dataUrl = await toPng(cardEl, {
        quality: 0.95,
        pixelRatio: 3,
        cacheBust: true,
      });

      const link = document.createElement("a");
      const safeName = (agent.fullName || "digital_card").replace(/\s+/g, "_").toLowerCase();
      link.download = `${safeName}_business_card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export card as PNG image:", err);
      toast.error("Unable to generate PNG image download. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveVCard = () => {
    downloadVCard(agent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-4 sm:p-6 bg-background overflow-hidden">
        <DialogHeader className="text-center sm:text-left mb-2">
          <DialogTitle className="text-xl font-bold [font-stretch:112%] flex items-center gap-2 text-foreground">
            <ConnectaMark className="w-6 h-6 text-primary" />
            Digital Business Card
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Access, share, or download your instant NFC digital business card as a PNG image.
          </DialogDescription>
        </DialogHeader>

        {/* Card Container */}
        <div className="flex flex-col items-center justify-center my-4">
          <div
            ref={cardWrapperRef}
            className="sheet-grid w-full flex justify-center border-[1.5px] border-input p-4"
          >
            <DigitalBusinessCard
              fullName={agent.fullName}
              title={agent.title}
              company={agent.company}
              phone={agent.phone}
              email={agent.email}
              additionalPhones={agent.additionalPhones}
              additionalEmails={agent.additionalEmails}
              services={agent.services}
              about={agent.about}
              profileId={profileId}
              profileSlug={profileSlug}
              config={digitalCardConfig}
            />
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="w-full gap-2"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? "Exporting..." : "Download Image"}
          </Button>

          <Button
            onClick={handleSaveVCard}
            variant="outline"
            className="w-full gap-2"
          >
            <Share2 className="w-4 h-4 text-primary" />
            Save Contact (.vcf)
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button
            onClick={handleCopyLink}
            variant="secondary"
            className="flex-1 gap-2"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Link Copied!" : "Copy Web Card Link"}
          </Button>

          {isOwner && (
            <Link
              // The card being shown, not create mode: a bare builder URL made
              // a new profile on a paid plan instead of editing this one.
              href={
                profileId
                  ? `/dashboard/builder?id=${profileId}&tab=card`
                  : "/dashboard/builder?tab=card"
              }
              onClick={() => onOpenChange(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <QrCode className="w-3.5 h-3.5" />
                Edit Design
              </Button>
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
