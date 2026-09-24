"use client";

import { useId, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mail, Phone } from "lucide-react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { cardSkin } from "@/lib/cardSkins";
import { profileUrl } from "@/lib/profileUrl";
import { DigitalCardConfig } from "@/types/profile";

interface DigitalBusinessCardProps {
  fullName: string;
  title: string;
  company?: string;
  phone: string;
  email: string;
  additionalPhones?: string[];
  additionalEmails?: string[];
  services?: string[];
  /** Accepted for call-site compatibility; the card has no room for a bio. */
  about?: string;
  profileId?: string;
  /** Vanity slug, when known — preferred over `profileId` for the QR target. */
  profileSlug?: string | null;
  /** Only `skin` is read: it is the one card setting that persists. */
  config?: Partial<DigitalCardConfig>;
}

/**
 * The digital twin of the physical NFC card, in the owner's card skin
 * (lib/cardSkins.ts) and the Survey Plan identity: a landscape ISO card
 * (85.6 × 54 mm) with a drawn lot boundary and the lot mark, the owner's
 * title block on the left and a QR to the live profile on the right.
 *
 * All sizes are container-relative (cqw), so the card is identical in the
 * builder preview, the Show card dialog and the exported PNG, which captures
 * the `[data-digital-card]` element.
 */
// The page origin is only known in the browser. Reading it through
// useSyncExternalStore gives the server render and hydration the same empty
// value, then the real origin, so the QR never mismatches the server HTML.
const noSubscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function DigitalBusinessCard({
  fullName,
  title,
  company,
  phone,
  email,
  additionalPhones = [],
  additionalEmails = [],
  services = [],
  profileId,
  profileSlug,
  config,
}: DigitalBusinessCardProps) {
  const skin = cardSkin(config?.skin);
  // useId returns ids like ":r1:"; strip the colons so url(#…) references
  // also survive html-to-image's clone for the PNG export.
  const clip = `dc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const host = useSyncExternalStore(noSubscribe, getOrigin, getServerOrigin);
  const qrUrl = profileId ? profileUrl(host, { id: profileId, slug: profileSlug }) : host;
  const phones = [phone, ...additionalPhones].filter(Boolean).slice(0, 2);
  const emails = [email, ...additionalEmails].filter(Boolean).slice(0, 1);
  const showQr = config?.showQrCode !== false;
  const qrInk = skin.split?.ink ?? "#12161F";

  return (
    <div
      data-digital-card
      className="relative aspect-[85.6/54] w-full max-w-[420px] select-none overflow-hidden rounded-[12px] [container-type:inline-size]"
      style={{ background: skin.swatch, color: skin.textColor, fontFamily: "var(--font-survey), sans-serif" }}
    >
      {/* The drawn boundary: a lot inset from the card edge, one corner
          chamfered, in the skin's line colour. */}
      <svg aria-hidden="true" viewBox="0 0 856 540" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <clipPath id={`${clip}-l`}>
            <rect x="0" y="0" width="428" height="540" />
          </clipPath>
          <clipPath id={`${clip}-r`}>
            <rect x="428" y="0" width="428" height="540" />
          </clipPath>
        </defs>
        <path
          d="M28 28 H790 L828 66 V512 H28 Z"
          fill="none"
          stroke={skin.lineColor}
          strokeOpacity={skin.split ? 0.55 : 0.35}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          clipPath={skin.split ? `url(#${clip}-l)` : undefined}
        />
        {skin.split && (
          <path
            d="M28 28 H790 L828 66 V512 H28 Z"
            fill="none"
            stroke={skin.split.line}
            strokeOpacity="0.6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${clip}-r)`}
          />
        )}
      </svg>

      <div className="relative flex h-full">
        {/* Title block */}
        <div
          className={`flex min-w-0 flex-col ${skin.split ? "w-1/2" : "flex-1"}`}
          style={{ padding: skin.split ? "7cqw 3cqw 6.5cqw 7cqw" : "7cqw 5cqw 6.5cqw 7cqw" }}
        >
          <ConnectaMark
            className="shrink-0"
            dotColor={skin.dotColor}
            style={{ width: "6.5cqw", height: "6.5cqw", color: skin.lineColor }}
          />
          {/* Names wrap to two lines rather than lose the surname. */}
          <p
            className="mt-[4cqw] line-clamp-2 break-words font-bold leading-[1.05]"
            style={{ fontSize: "5.6cqw", fontStretch: "125%" }}
          >
            {fullName || "Your name"}
          </p>
          {title && (
            <p
              className={`mt-[1.2cqw] font-medium ${skin.split ? "line-clamp-2" : "truncate"}`}
              style={{ fontSize: skin.split ? "3cqw" : "3.3cqw" }}
            >
              {title}
            </p>
          )}
          {company && (
            <p
              className={skin.split ? "line-clamp-2" : "truncate"}
              style={{ fontSize: skin.split ? "2.7cqw" : "3cqw", color: skin.softColor }}
            >
              {company}
            </p>
          )}
          {services.length > 0 && !skin.split && (
            <p className="mt-[1.2cqw] truncate" style={{ fontSize: "2.7cqw", color: skin.softColor }}>
              {services.slice(0, 3).join(" · ")}
            </p>
          )}

          <ul className="mt-auto space-y-[1cqw]" style={{ fontSize: "2.8cqw" }}>
            {phones.map((p) => (
              <li key={`p-${p}`} className="flex min-w-0 items-center gap-[1.6cqw]">
                <Phone aria-hidden="true" style={{ width: "2.8cqw", height: "2.8cqw", color: skin.lineColor }} className="shrink-0" />
                <span className="truncate font-mono">{p}</span>
              </li>
            ))}
            {emails.map((e) => (
              <li key={`e-${e}`} className="flex min-w-0 items-center gap-[1.6cqw]">
                <Mail aria-hidden="true" style={{ width: "2.8cqw", height: "2.8cqw", color: skin.lineColor }} className="shrink-0" />
                <span className={`font-mono ${skin.split ? "break-all" : "truncate"}`}>{e}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* QR: always dark modules on white paper, so any phone can scan it.
            On a split skin it sits on the light half. */}
        {showQr && (
          <div
            className={`flex shrink-0 flex-col items-center justify-center ${skin.split ? "w-1/2" : ""}`}
            style={{ padding: skin.split ? "6cqw" : "7cqw 7cqw 7cqw 0", color: skin.split?.ink ?? skin.softColor }}
          >
            <div className="bg-white" style={{ padding: "1.6cqw", width: "27cqw" }}>
              <QRCodeSVG value={qrUrl || "https://"} size={256} level="M" fgColor={qrInk} bgColor="#FFFFFF" className="block h-auto w-full" />
            </div>
            <p className="mt-[1.8cqw] font-semibold" style={{ fontSize: "2.5cqw" }}>
              Scan to connect
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
