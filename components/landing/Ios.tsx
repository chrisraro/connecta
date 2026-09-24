"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Calendar,
  Camera,
  Clock,
  Compass,
  Contact,
  Image as ImageIcon,
  Mail,
  Map,
  MessageCircle,
  Music,
  Phone,
  Search,
  Settings,
  StickyNote,
  Wallet,
} from "lucide-react";
import { CONNECTA, publicHost } from "@/lib/brand";
import styles from "./landing.module.css";

/*
 * The iPhone scenes of the tap story, drawn at the miniature's 284-unit design
 * width (the `.mini` zoom scales them). Layout, type and the NFC banner follow
 * iOS; app icons are generic glyph tiles, not Apple's artwork.
 */

// The host shown in the banner and Safari's address bar: the real public
// domain once configured, never a dev or placeholder host (lib/brand.ts).
export const DEMO_HOST = publicHost(CONNECTA);

const IOS_FONT: CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", system-ui, sans-serif',
};

/** Time, Dynamic Island, and the signal / Wi-Fi / battery cluster. */
export function StatusBar({ tone }: { tone: "light" | "dark" }) {
  const c = tone === "light" ? "#FFFFFF" : "#000000";
  return (
    <div className="relative flex h-[38px] items-center justify-between px-[22px] pt-[4px]" style={{ ...IOS_FONT, color: c }}>
      <span className="w-[52px] text-center text-[11.5px] font-semibold tracking-[-0.01em]">9:41</span>
      <span aria-hidden="true" className="absolute left-1/2 top-[8px] h-[22px] w-[82px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex w-[52px] items-center justify-end gap-[4px]" aria-hidden="true">
        <svg viewBox="0 0 17 11" className="h-[8px] w-[12px]" fill={c}>
          <rect x="0" y="7" width="3" height="4" rx="0.8" />
          <rect x="4.6" y="5" width="3" height="6" rx="0.8" />
          <rect x="9.2" y="2.6" width="3" height="8.4" rx="0.8" />
          <rect x="13.8" y="0" width="3" height="11" rx="0.8" />
        </svg>
        <svg viewBox="0 0 16 11.5" className="h-[8px] w-[11px]" fill={c}>
          <path d="M8 2.3c2.2 0 4.2.8 5.7 2.2l1.1-1.1C13 1.6 10.6.6 8 .6S3 1.6 1.2 3.4l1.1 1.1C3.8 3.1 5.8 2.3 8 2.3Z" />
          <path d="M8 5.6c1.3 0 2.5.5 3.4 1.3l1.1-1.1C11.3 4.7 9.7 4 8 4s-3.3.7-4.5 1.8l1.1 1.1C5.5 6.1 6.7 5.6 8 5.6Z" />
          <path d="M8 11.4 10.2 9.2C9.6 8.7 8.8 8.4 8 8.4s-1.6.3-2.2.8L8 11.4Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-[9px] w-[18px]">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke={c} strokeOpacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.3" fill={c} />
          <path d="M25 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1S25.8 4.7 25 4.4Z" fill={c} fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

function AppIcon({ bg, children, size = 43 }: { bg: string; children: ReactNode; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center text-white"
      style={{ width: size, height: size, borderRadius: size * 0.2237, background: bg, boxShadow: "inset 0 0 0 0.5px rgb(255 255 255 / 0.18)" }}
    >
      {children}
    </span>
  );
}

const glyph = "h-[22px] w-[22px]";

const APPS: { label: string; bg: string; icon: ReactNode }[] = [
  { label: "Mail", bg: "linear-gradient(180deg,#1E9BFF,#1463F3)", icon: <Mail className={glyph} strokeWidth={1.9} /> },
  { label: "Calendar", bg: "#FFFFFF", icon: <Calendar className={glyph} strokeWidth={1.9} color="#FF3B30" /> },
  { label: "Photos", bg: "linear-gradient(180deg,#FFB340,#FF6A3D)", icon: <ImageIcon className={glyph} strokeWidth={1.9} /> },
  { label: "Camera", bg: "linear-gradient(180deg,#8E8E93,#48484A)", icon: <Camera className={glyph} strokeWidth={1.9} /> },
  { label: "Maps", bg: "linear-gradient(180deg,#5BD66B,#2FB24C)", icon: <Map className={glyph} strokeWidth={1.9} /> },
  { label: "Clock", bg: "#1C1C1E", icon: <Clock className={glyph} strokeWidth={1.9} /> },
  { label: "Notes", bg: "linear-gradient(180deg,#FFE066,#FFCC00)", icon: <StickyNote className={glyph} strokeWidth={1.9} color="#6B5200" /> },
  { label: "Wallet", bg: "#000000", icon: <Wallet className={glyph} strokeWidth={1.9} /> },
  { label: "Music", bg: "linear-gradient(180deg,#FF5A73,#FA2D48)", icon: <Music className={glyph} strokeWidth={1.9} /> },
  { label: "Settings", bg: "linear-gradient(180deg,#A3A3A8,#6E6E73)", icon: <Settings className={glyph} strokeWidth={1.9} /> },
  { label: "Contacts", bg: "linear-gradient(180deg,#C9CCD2,#A6AAB2)", icon: <Contact className={glyph} strokeWidth={1.9} /> },
  { label: "Messenger", bg: "linear-gradient(180deg,#7B61FF,#1E88FF)", icon: <MessageCircle className={glyph} strokeWidth={1.9} /> },
];

const DOCK: { bg: string; icon: ReactNode }[] = [
  { bg: "linear-gradient(180deg,#5BE37A,#28C650)", icon: <Phone className={glyph} strokeWidth={1.9} fill="currentColor" /> },
  { bg: "linear-gradient(180deg,#FFFFFF,#E9EEF5)", icon: <Compass className={glyph} strokeWidth={1.7} color="#1A7CF5" /> },
  { bg: "linear-gradient(180deg,#5BE37A,#28C650)", icon: <MessageCircle className={glyph} strokeWidth={1.9} fill="currentColor" /> },
  { bg: "linear-gradient(180deg,#FF5A73,#FA2D48)", icon: <Music className={glyph} strokeWidth={1.9} /> },
];

/** An unlocked iPhone on its Home Screen: widget, app grid, Search, dock. */
export function HomeScreen() {
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        ...IOS_FONT,
        background:
          "radial-gradient(120% 70% at 20% 0%, #3B5BD9 0%, transparent 60%), radial-gradient(110% 80% at 100% 100%, #D0312D 0%, transparent 55%), linear-gradient(170deg, #1B2A6B 0%, #12161F 100%)",
      }}
    >
      <StatusBar tone="light" />
      <div className="mt-[10px] grid grid-cols-4 gap-x-[19px] gap-y-[12px] px-[22px]">
        {/* Weather widget, 2 × 2 */}
        <div className="col-span-2 row-span-2 flex flex-col justify-between rounded-[19px] p-[11px] text-white" style={{ background: "linear-gradient(180deg,#3E8CEB,#2566C9)" }}>
          <div>
            <p className="text-[10.5px] font-semibold leading-tight">Naga City</p>
            <p className="text-[30px] font-light leading-none tracking-[-0.02em]">31°</p>
          </div>
          <div className="text-[9px] font-medium leading-snug">
            <p>Partly Cloudy</p>
            <p className="opacity-80">H:33° L:25°</p>
          </div>
        </div>
        {APPS.map((a) => (
          <div key={a.label} className="flex flex-col items-center gap-[4px]">
            <AppIcon bg={a.bg}>{a.icon}</AppIcon>
            <span className="text-[8.5px] font-medium leading-none text-white" style={{ textShadow: "0 0.5px 1px rgb(0 0 0 / 0.25)" }}>
              {a.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex justify-center pb-[10px]">
        <span className={`${styles.glass} flex h-[22px] items-center gap-[4px] rounded-full px-[10px] text-[9.5px] font-medium text-white`}>
          <Search className="h-[9px] w-[9px]" strokeWidth={2.4} aria-hidden="true" /> Search
        </span>
      </div>
      <div className={`${styles.glass} mx-[10px] mb-[10px] flex justify-between rounded-[27px] px-[13px] py-[11px]`}>
        {DOCK.map((d, i) => (
          <AppIcon key={i} bg={d.bg}>
            {d.icon}
          </AppIcon>
        ))}
      </div>
    </div>
  );
}

/** The system banner iOS shows when it reads a card's URL in the background. */
export function NfcBanner({ shown }: { shown: boolean }) {
  return (
    <div
      role="status"
      aria-hidden={!shown}
      className={`${styles.banner} ${styles.glassLight} ${shown ? "" : styles.bannerHidden} absolute inset-x-[7px] top-[40px] flex items-center gap-[8px] rounded-[20px] px-[10px] py-[9px]`}
      style={IOS_FONT}
    >
      <AppIcon bg="linear-gradient(180deg,#FFFFFF,#E9EEF5)" size={27}>
        <Compass className="h-[15px] w-[15px]" strokeWidth={1.8} color="#1A7CF5" />
      </AppIcon>
      <div className="min-w-0 flex-1 text-black">
        <p className="flex items-baseline justify-between gap-2 text-[10.5px] font-semibold leading-tight">
          Website NFC Tag <span className="text-[9px] font-normal" style={{ color: "rgb(60 60 67 / 0.6)" }}>now</span>
        </p>
        <p className="truncate text-[10.5px] leading-tight">Open &ldquo;{DEMO_HOST}&rdquo; in Safari</p>
      </div>
    </div>
  );
}

/** Safari's floating bottom bar: back, the address pill, and more. */
export function SafariBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-[6px] px-[10px] pb-[16px] pt-[8px]" style={IOS_FONT}>
      <span className={`${styles.glassLight} flex h-[30px] w-[30px] items-center justify-center rounded-full`} aria-hidden="true">
        <svg viewBox="0 0 10 16" className="h-[10px] w-[7px]" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2 2 8l6 6" />
        </svg>
      </span>
      <span className={`${styles.glassLight} flex h-[30px] flex-1 items-center justify-center rounded-full text-[10.5px] font-medium text-black`}>
        {DEMO_HOST}
      </span>
      <span className={`${styles.glassLight} flex h-[30px] w-[30px] items-center justify-center gap-[2px] rounded-full`} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-black" />
        ))}
      </span>
      <span aria-hidden="true" className="absolute bottom-[5px] left-1/2 h-[4px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
    </div>
  );
}
