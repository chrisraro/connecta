"use client";

import { useId, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mail, Phone, User } from "lucide-react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { CONNECTA } from "@/lib/brand";
import { cardSkin, type CardSkin } from "@/lib/cardSkins";
import { profileUrl } from "@/lib/profileUrl";
import { DigitalCardConfig } from "@/types/profile";

export type CardOrientation = "landscape" | "portrait";

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
  /** The portrait card shows the owner's photo in a small lot. */
  avatarUrl?: string;
  profileId?: string;
  /** Vanity slug, when known — preferred over `profileId` for the QR target. */
  profileSlug?: string | null;
  /** Only `skin` is read: it is the one card setting that persists. */
  config?: Partial<DigitalCardConfig>;
  /** A view of the same card, not a saved setting. */
  orientation?: CardOrientation;
}

// The page origin is only known in the browser. Reading it through
// useSyncExternalStore gives the server render and hydration the same empty
// value, then the real origin, so the QR never mismatches the server HTML.
const noSubscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

// A chamfered lot for the portrait photo: top-right corner cut at 45°.
const LOT_CLIP = "polygon(0 0, 76% 0, 100% 24%, 100% 100%, 0 100%)";

/**
 * The digital twin of the physical NFC card, in the owner's card skin
 * (lib/cardSkins.ts) and the Survey Plan identity. One card, two views:
 *
 * - landscape (85.6 × 54 mm): title block left, QR right;
 * - portrait (54 × 85.6 mm): the Access card layout — label, a large QR,
 *   then company, name, role and the owner's photo, with a footer rule.
 *
 * Both draw a lot boundary with one chamfered corner. All sizes are
 * container-relative (cqw), so the builder preview, the dialog and the
 * exported PNG (which captures `[data-digital-card]`) are identical.
 */
export function DigitalBusinessCard(props: DigitalBusinessCardProps) {
  const skin = cardSkin(props.config?.skin);
  const host = useSyncExternalStore(noSubscribe, getOrigin, getServerOrigin);
  const qrUrl = props.profileId ? profileUrl(host, { id: props.profileId, slug: props.profileSlug }) : host;
  // useId returns ids like ":r1:"; strip the colons so url(#…) references
  // also survive html-to-image's clone for the PNG export.
  const clip = `dc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return props.orientation === "portrait" ? (
    <PortraitCard {...props} skin={skin} qrUrl={qrUrl} clip={clip} />
  ) : (
    <LandscapeCard {...props} skin={skin} qrUrl={qrUrl} clip={clip} />
  );
}

type CardProps = DigitalBusinessCardProps & { skin: CardSkin; qrUrl: string; clip: string };

/** The lot boundary, inset from the card edge, top-right corner chamfered.
 *  Split skins draw each half in the ink of its own ground. */
function Boundary({
  skin,
  clip,
  width,
  height,
  splitAt,
  axis,
}: {
  skin: CardSkin;
  clip: string;
  width: number;
  height: number;
  splitAt: number;
  axis: "x" | "y";
}) {
  const i = 28;
  const c = 38;
  const d = `M${i} ${i} H${width - i - c} L${width - i} ${i + c} V${height - i} H${i} Z`;
  const first = axis === "x" ? { x: 0, y: 0, w: splitAt, h: height } : { x: 0, y: 0, w: width, h: splitAt };
  const second =
    axis === "x"
      ? { x: splitAt, y: 0, w: width - splitAt, h: height }
      : { x: 0, y: splitAt, w: width, h: height - splitAt };
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <clipPath id={`${clip}-a`}>
          <rect x={first.x} y={first.y} width={first.w} height={first.h} />
        </clipPath>
        <clipPath id={`${clip}-b`}>
          <rect x={second.x} y={second.y} width={second.w} height={second.h} />
        </clipPath>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={skin.lineColor}
        strokeOpacity={skin.split ? 0.55 : 0.35}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        clipPath={skin.split ? `url(#${clip}-a)` : undefined}
      />
      {skin.split && (
        <path
          d={d}
          fill="none"
          stroke={skin.split.line}
          strokeOpacity="0.6"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${clip}-b)`}
        />
      )}
    </svg>
  );
}

/** QR: always dark modules on white paper, so any phone can scan it. */
function Qr({ value, ink, width, level = "M" }: { value: string; ink: string; width: string; level?: "M" | "H" }) {
  return (
    <div className="bg-white" style={{ padding: "1.6cqw", width }}>
      <QRCodeSVG value={value || "https://"} size={256} level={level} fgColor={ink} bgColor="#FFFFFF" className="block h-auto w-full" />
    </div>
  );
}

const cardBase =
  "relative w-full select-none overflow-hidden rounded-[12px] [container-type:inline-size]";

function LandscapeCard({
  fullName,
  title,
  company,
  phone,
  email,
  additionalPhones = [],
  additionalEmails = [],
  services = [],
  config,
  skin,
  qrUrl,
  clip,
}: CardProps) {
  const phones = [phone, ...additionalPhones].filter(Boolean).slice(0, 2);
  const emails = [email, ...additionalEmails].filter(Boolean).slice(0, 1);
  const showQr = config?.showQrCode !== false;
  const split = skin.split;

  return (
    <div
      data-digital-card
      className={`${cardBase} aspect-[85.6/54] max-w-[420px]`}
      style={{ background: skin.swatch, color: skin.textColor, fontFamily: "var(--font-survey), sans-serif" }}
    >
      <Boundary skin={skin} clip={clip} width={856} height={540} splitAt={428} axis="x" />

      <div className="relative flex h-full">
        <div
          className={`flex min-w-0 flex-col ${split ? "w-1/2" : "flex-1"}`}
          style={{ padding: split ? "7cqw 3cqw 6.5cqw 7cqw" : "7cqw 5cqw 6.5cqw 7cqw" }}
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
              className={`mt-[1.2cqw] font-medium ${split ? "line-clamp-2" : "truncate"}`}
              style={{ fontSize: split ? "3cqw" : "3.3cqw" }}
            >
              {title}
            </p>
          )}
          {company && (
            <p
              className={split ? "line-clamp-2" : "truncate"}
              style={{ fontSize: split ? "2.7cqw" : "3cqw", color: skin.softColor }}
            >
              {company}
            </p>
          )}
          {services.length > 0 && !split && (
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
                <span className={`font-mono ${split ? "break-all" : "truncate"}`}>{e}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* On a split skin the QR sits on the light half. */}
        {showQr && (
          <div
            className={`flex shrink-0 flex-col items-center justify-center ${split ? "w-1/2" : ""}`}
            style={{ padding: split ? "6cqw" : "7cqw 7cqw 7cqw 0", color: split?.ink ?? skin.softColor }}
          >
            <Qr value={qrUrl} ink={split?.ink ?? "#12161F"} width="27cqw" />
            <p className="mt-[1.8cqw] font-semibold" style={{ fontSize: "2.5cqw" }}>
              Scan to connect
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PortraitCard({ fullName, title, company, avatarUrl, skin, qrUrl, clip }: CardProps) {
  const split = skin.split;
  // Split skins stack in portrait: the QR on the dark ground, the owner's
  // details on the light ground below.
  const background = split
    ? `linear-gradient(180deg, ${split.primary} 0 60%, ${split.ground} 60% 100%)`
    : skin.swatch;
  const detailInk = split?.ink ?? skin.textColor;
  const detailSoft = split?.soft ?? skin.softColor;
  const ruleColor = split?.line ?? skin.lineColor;

  return (
    <div
      data-digital-card
      className={`${cardBase} flex aspect-[54/85.6] max-w-[320px] flex-col`}
      style={{ background, color: skin.textColor, fontFamily: "var(--font-survey), sans-serif" }}
    >
      <Boundary skin={skin} clip={clip} width={540} height={856} splitAt={514} axis="y" />

      <div className="relative flex h-full flex-col" style={{ padding: "11cqw 11cqw 9cqw" }}>
        {/* Label */}
        <div className="flex items-center justify-center gap-[2cqw]">
          <ConnectaMark
            dotColor={skin.dotColor}
            style={{ width: "6cqw", height: "6cqw", color: skin.lineColor }}
          />
          <span className="font-semibold" style={{ fontSize: "3.6cqw", color: skin.softColor }}>
            Access card
          </span>
        </div>

        {/* A large QR: this view is for being scanned across a table. */}
        <div className="flex flex-1 items-center justify-center" style={{ paddingBlock: "5cqw" }}>
          <Qr value={qrUrl} ink="#12161F" width="72cqw" level="H" />
        </div>

        {/* Title block, with the photo in a small lot */}
        <div className="flex items-end justify-between gap-[4cqw]" style={{ color: detailInk }}>
          <div className="min-w-0 flex-1">
            {company && (
              <p className="truncate font-semibold" style={{ fontSize: "3.4cqw", color: detailSoft }}>
                {company}
              </p>
            )}
            <p
              className="mt-[1cqw] line-clamp-2 break-words font-bold leading-[1.05]"
              style={{ fontSize: "8cqw", fontStretch: "125%" }}
            >
              {fullName || "Your name"}
            </p>
            <p className="mt-[1.4cqw] truncate font-medium" style={{ fontSize: "3.8cqw", color: detailSoft }}>
              {title || "Member"}
            </p>
          </div>
          <div
            className="relative shrink-0 overflow-hidden"
            style={{ width: "19cqw", height: "19cqw", clipPath: LOT_CLIP, background: split ? split.line : "rgb(255 255 255 / 0.12)" }}
          >
            {avatarUrl ? (
              <ProfileImage src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
                <User style={{ width: "8cqw", height: "8cqw", color: split ? split.ground : skin.softColor }} />
              </span>
            )}
          </div>
        </div>

        {/* Footer rule */}
        <p
          className="mt-[5cqw] border-t pt-[3.5cqw] text-center font-medium"
          style={{ fontSize: "2.9cqw", color: detailSoft, borderColor: `color-mix(in srgb, ${ruleColor} 30%, transparent)` }}
        >
          {CONNECTA.name} digital identity
        </p>
      </div>
    </div>
  );
}
