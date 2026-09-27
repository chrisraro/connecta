import { AgentInfo } from "@/types/profile";
import { imageUrl } from "@/lib/imageUrl";

/*
 * "Save contact" as a vCard 3.0 file (RFC 2426).
 *
 * B12 (2026-09-27): values were written raw, so a comma in an address or
 * company split it into the wrong fields; there was no photo or profile
 * link; and the download URL was revoked before iOS Safari had read it.
 */

/** Escape a value for a vCard text field. */
export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

const utf8 = new TextEncoder();

/**
 * Fold a content line at 75 octets (UTF-8), continuing with a leading space.
 * Works per code point, so a multi-byte character or an emoji's surrogate
 * pair is never split across lines.
 */
export function foldVCardLine(line: string): string {
  const out: string[] = [];
  let current = "";
  let used = 0;
  let limit = 75;
  for (const char of line) {
    const size = utf8.encode(char).length;
    if (used + size > limit) {
      out.push(current);
      current = "";
      used = 0;
      limit = 74; // continuation lines start with a space
    }
    current += char;
    used += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export interface VCardExtras {
  /** The public profile, added as the contact's profile link. */
  profileUrl?: string;
  /** The avatar, embedded so it shows without a network fetch. */
  photo?: { type: "JPEG" | "PNG" | "GIF" | "WEBP"; base64: string };
}

export function buildVCard(agent: AgentInfo, extras: VCardExtras = {}): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  const e = escapeVCard;

  const full = agent.fullName.trim();
  const parts = full.split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
  lines.push(`N:${e(last)};${e(first)};;;`, `FN:${e(full)}`);

  if (agent.company) lines.push(`ORG:${e(agent.company)}`);
  if (agent.title) lines.push(`TITLE:${e(agent.title)}`);
  if (agent.phone) lines.push(`TEL;TYPE=CELL:${e(agent.phone)}`);
  if (agent.email) lines.push(`EMAIL;TYPE=WORK:${e(agent.email)}`);
  if (agent.website) lines.push(`URL:${agent.website}`);
  if (extras.profileUrl) lines.push(`URL;TYPE=profile:${extras.profileUrl}`);
  if (agent.address) {
    lines.push(`ADR;TYPE=WORK:;;${e(agent.address)};;;;`, `LABEL;TYPE=WORK:${e(agent.address)}`);
  }
  for (const link of agent.socialLinks ?? []) {
    if (link.url) lines.push(`URL;TYPE=${e(link.platform)}:${link.url}`);
  }
  if (extras.photo) lines.push(`PHOTO;ENCODING=b;TYPE=${extras.photo.type}:${extras.photo.base64}`);

  lines.push("END:VCARD");
  return lines.map(foldVCardLine).join("\r\n") + "\r\n";
}

const PHOTO_TYPES: Record<string, NonNullable<VCardExtras["photo"]>["type"]> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/gif": "GIF",
  "image/webp": "WEBP",
};

/** Fetch the avatar for embedding; skipped quietly if it can't be read in time. */
async function fetchPhoto(src: string | null | undefined): Promise<VCardExtras["photo"]> {
  const url = imageUrl(src);
  if (!url || typeof fetch === "undefined") return undefined;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const type = PHOTO_TYPES[blob.type];
    if (!type || blob.size > 1_000_000) return undefined;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { type, base64: btoa(binary) };
  } catch {
    return undefined;
  }
}

export const downloadVCard = async (agent: AgentInfo, options: { profileUrl?: string } = {}) => {
  const photo = await fetchPhoto(agent.avatarUrl);
  const card = buildVCard(agent, { profileUrl: options.profileUrl, photo });
  const blob = new Blob([card], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${agent.fullName.trim().replace(/\s+/g, "_") || "contact"}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // iOS Safari reads the file after click() returns; revoking at once lost it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
