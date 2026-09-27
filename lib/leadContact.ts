/*
 * How to reply to a lead (B14, 2026-09-27). Most Naga leads leave a mobile
 * number, and they answer on SMS, Viber or WhatsApp rather than email.
 */

export type ContactKind = "phone" | "email" | "other";

export function contactKind(contact: string): ContactKind {
  const value = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
  if (/^[+()\d\s.-]{7,}$/.test(value) && value.replace(/\D/g, "").length >= 7) return "phone";
  return "other";
}

/** A Philippine number in +63 form (09xx..., 639xx... or +63 ...). Others keep their digits. */
export function phoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("63")) return `+${digits}`;
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  return `+${digits}`;
}

export interface ReplyLink {
  channel: "email" | "sms" | "whatsapp" | "viber" | "call";
  label: string;
  href: string;
}

export function leadReplyLinks({
  contact,
  subject,
  body,
}: {
  contact: string;
  subject: string;
  body: string;
}): ReplyLink[] {
  const kind = contactKind(contact);
  if (kind === "email") {
    const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return [{ channel: "email", label: "Email", href: `mailto:${contact.trim()}?${q}` }];
  }
  if (kind === "phone") {
    const e164 = phoneE164(contact);
    const text = encodeURIComponent(body);
    return [
      // "?&body=" is the form both iOS and Android Messages accept.
      { channel: "sms", label: "SMS", href: `sms:${e164}?&body=${text}` },
      { channel: "whatsapp", label: "WhatsApp", href: `https://wa.me/${e164.slice(1)}?text=${text}` },
      { channel: "viber", label: "Viber", href: `viber://chat?number=${encodeURIComponent(e164)}` },
      { channel: "call", label: "Call", href: `tel:${e164}` },
    ];
  }
  return [];
}
