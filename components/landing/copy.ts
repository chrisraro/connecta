"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Homepage copy in English and Filipino. The EN | FIL toggle lives on the
 * marketing site only. The Filipino strings are a first pass and must be
 * reviewed by a native speaker before launch.
 */
export type Lang = "en" | "fil";

const EN = {
  nav: { how: "How it works", demo: "Demo", pricing: "Pricing", shop: "Shop", signIn: "Sign in", start: "Start free", dashboard: "Dashboard" },
  language: "Language",
  heroTitle: "One tap. They have your number. You have theirs.",
  heroSub: "An NFC card that opens your profile on any phone, with no app to install, and sends every enquiry straight back to you. Built for Naga first.",
  ctaFree: "Create your free profile",
  ctaDemo: "See it for your work",
  beats: [
    { title: "Tap your card on their phone.", body: "No app, no typing, no spelling out your number. Any NFC phone opens it; the QR on the back covers the rest." },
    { title: "Your profile opens. Instantly.", body: "Your photo, your role, your listings or services, and a Save contact button. They keep you in one tap." },
    { title: "They leave their details. You follow up.", body: "Their name and number land in your leads, even if they only had a minute. That is the business card that works back." },
  ],
  demoTag: "Demo profile, sample content",
  demoTitle: "Built for the work you do",
  industries: { realtor: "Real estate", shop: "Shop owner", pro: "Professional", student: "Student" },
  industryNotes: {
    realtor: "Listings with ₱ prices and photos, and a lead form for viewings.",
    shop: "Products and services with prices, and a way for customers to reach you.",
    pro: "Your services and experience, laid out cleanly for a client.",
    student: "Education and skills ready for a job fair or an internship.",
  },
  haveAccount: "Already have a profile?",
  newLead: "New lead",
  leadDemo: "Wants a viewing this Saturday",
  compareTitle: "Why a tap beats paper",
  paper: "Paper card",
  tapCard: (name: string) => `${name} card`,
  saveContact: "Save contact",
  compareRows: [
    ["Ends up in a drawer or lost", "Saved to their phone in one tap"],
    ["Reprint whenever something changes", "Update your profile any time, same card"],
    ["You hope they call", "They leave their details, you follow up"],
    ["One small rectangle of text", "Photos, listings, services and links"],
  ],
  skinsTitle: "Four cards. One free profile, forever.",
  skinsNote: "Every card includes your profile for free, with no monthly fee.",
  photoSlot: "Photo of the real card, coming soon",
  from: "from",
  prelaunch: "Prelaunch",
  standard: "Standard",
  pricingTitle: "Honest pricing, in pesos",
  pricingSub: "Buy the card once. Add lead tools or a team only if you need them.",
  monthly: "Monthly",
  yearly: "Yearly",
  perMonth: "/mo",
  perYear: "/yr",
  oneTime: "one-time",
  plans: {
    card: { name: "NFC card", tagline: "Your card and profile", items: ["Free profile, forever", "NFC tap and QR on every card", "Save contact in one tap", "Leads from your profile"] },
    lead: { name: "Lead tools", tagline: "For one person", items: ["Unlimited leads", "Follow-up reminders", "Export your leads", "Profile analytics"] },
    team: { name: "Teams", tagline: "Up to 5 people", items: ["Everything in Lead tools", "Shared team branding", "One team lead pool", "Up to 5 seats"] },
  },
  orderCard: "Order a card",
  finalTitle: "Your next client is one tap away.",
  finalSub: "Set up your profile free, then order your card when you are ready.",
  footerLine: "Built for Naga first.",
  privacy: "Privacy",
  terms: "Terms",
};

type Copy = typeof EN;

const FIL: Copy = {
  nav: { how: "Paano ito gumagana", demo: "Demo", pricing: "Presyo", shop: "Shop", signIn: "Mag-sign in", start: "Magsimula nang libre", dashboard: "Dashboard" },
  language: "Wika",
  heroTitle: "Isang tap. Nasa kanila ang number mo. Nasa iyo ang sa kanila.",
  heroSub: "NFC card na nagbubukas ng profile mo sa kahit anong phone, walang app na kailangan, at ibinabalik sa iyo ang bawat inquiry. Unang ginawa para sa Naga.",
  ctaFree: "Gumawa ng libreng profile",
  ctaDemo: "Tingnan para sa trabaho mo",
  beats: [
    { title: "I-tap ang card mo sa phone nila.", body: "Walang app, walang type, hindi mo na kailangang i-spell ang number mo. Bukas agad sa NFC phone; may QR din sa likod." },
    { title: "Bukas agad ang profile mo.", body: "Ang litrato mo, ang trabaho mo, ang listings o serbisyo mo, at may I-save ang contact. Isang tap lang, nasa kanila ka na." },
    { title: "Iiwan nila ang detalye nila. Ikaw ang babalik.", body: "Papasok sa leads mo ang pangalan at number nila, kahit isang minuto lang sila. Business card na bumabalik sa iyo." },
  ],
  demoTag: "Demo na profile, halimbawang nilalaman",
  demoTitle: "Para sa trabahong ginagawa mo",
  industries: { realtor: "Real estate", shop: "May-ari ng tindahan", pro: "Propesyonal", student: "Estudyante" },
  industryNotes: {
    realtor: "Listings na may presyo sa ₱ at litrato, at form para sa viewing.",
    shop: "Produkto at serbisyo na may presyo, at paraan para maabot ka ng customer.",
    pro: "Ang serbisyo at karanasan mo, maayos na nakalatag para sa kliyente.",
    student: "Edukasyon at kasanayan, handa para sa job fair o internship.",
  },
  haveAccount: "May profile ka na?",
  newLead: "Bagong lead",
  leadDemo: "Gustong mag-viewing sa Sabado",
  compareTitle: "Bakit mas mabuti ang tap kaysa papel",
  paper: "Papel na card",
  tapCard: (name) => `${name} card`,
  saveContact: "I-save ang contact",
  compareRows: [
    ["Napupunta sa drawer o nawawala", "Naka-save sa phone nila sa isang tap"],
    ["Magpa-print ulit kapag may nagbago", "I-update ang profile kahit kailan, parehong card"],
    ["Umaasa kang tatawag sila", "Iiwan nila ang detalye, ikaw ang babalik"],
    ["Maliit na parihaba ng teksto", "Litrato, listings, serbisyo at links"],
  ],
  skinsTitle: "Apat na card. Isang libreng profile, habambuhay.",
  skinsNote: "Kasama sa bawat card ang profile mo nang libre, walang buwanang bayad.",
  photoSlot: "Litrato ng totoong card, parating na",
  from: "mula",
  prelaunch: "Prelaunch",
  standard: "Regular",
  pricingTitle: "Tapat na presyo, sa piso",
  pricingSub: "Bilhin ang card nang isang beses. Magdagdag ng lead tools o team kung kailangan lang.",
  monthly: "Buwanan",
  yearly: "Taunan",
  perMonth: "/buwan",
  perYear: "/taon",
  oneTime: "isang beses",
  plans: {
    card: { name: "NFC card", tagline: "Ang card at profile mo", items: ["Libreng profile, habambuhay", "NFC tap at QR sa bawat card", "I-save ang contact sa isang tap", "Leads mula sa profile mo"] },
    lead: { name: "Lead tools", tagline: "Para sa isang tao", items: ["Walang limitasyong leads", "Paalala sa follow-up", "I-export ang leads mo", "Analytics ng profile"] },
    team: { name: "Teams", tagline: "Hanggang 5 tao", items: ["Lahat ng nasa Lead tools", "Iisang branding ng team", "Iisang lead pool ng team", "Hanggang 5 seats"] },
  },
  orderCard: "Mag-order ng card",
  finalTitle: "Isang tap na lang ang susunod mong kliyente.",
  finalSub: "I-set up ang profile mo nang libre, saka mag-order ng card kapag handa ka na.",
  footerLine: "Unang ginawa para sa Naga.",
  privacy: "Privacy",
  terms: "Mga tuntunin",
};

export const LANDING_COPY: Record<Lang, Copy> = { en: EN, fil: FIL };
export type LandingCopy = Copy;

const KEY = "connecta_lang";
const EVENT = "connecta-lang-change";

function readLang(): Lang {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "en" || saved === "fil") return saved;
  } catch {
    // Storage blocked; fall through to the browser language.
  }
  const nav = navigator.language.toLowerCase();
  return nav.startsWith("fil") || nav.startsWith("tl") ? "fil" : "en";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The visitor's language: English on the server, then the saved or browser choice. */
export function useLandingLang() {
  const lang = useSyncExternalStore<Lang>(subscribe, readLang, () => "en");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Not persisted; the event still switches this page.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { lang, setLang, t: LANDING_COPY[lang] };
}
