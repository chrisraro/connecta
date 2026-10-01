/** Homepage copy. English only (Filipino removed 2026-10-01). */
export const LANDING_COPY = {
  nav: { how: "How it works", demo: "Demo", pricing: "Pricing", roadmap: "Roadmap", shop: "Shop", signIn: "Sign in", start: "Start free", dashboard: "Dashboard" },
  heroTitle: "One tap. They have your number. You have theirs.",
  heroSub: "An NFC card that opens your profile on any phone, with no app to install, and sends every enquiry straight back to you. Built for Naga first.",
  ctaFree: "Create your free profile",
  ctaDemo: "See it for your work",
  beats: [
    { title: "Tap your card on their phone.", body: "No app, no typing, no spelling out your number. Any NFC phone opens it; the QR on the back covers the rest." },
    { title: "Your profile opens on their phone.", body: "Your photo, your role, your listings or services, and a Save contact button. They keep you in one tap." },
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
  roadmap: {
    title: "What's coming",
    sub: "Planned, not available yet. We'll announce each one when it ships.",
    planned: "Planned",
    groups: [
      {
        name: "Design & Customization",
        items: [
          { name: "Digital profile & card templates", body: "A larger library of ready-made themes and layouts for your profile and card." },
        ],
      },
      {
        name: "Platform & Automations",
        items: [
          { name: "Marketing & CRM integrations", body: "Send your leads straight into your CRM, email and SMS workflows." },
          { name: "Event management suite", body: "An event dashboard with attendee check-in and guest tracking." },
        ],
      },
      {
        name: "NFC Hardware Expansion",
        items: [
          { name: "Review tap standees", body: "A counter standee that asks customers for a Google review with one tap." },
          { name: "Traffic & storefront standees", body: "One tap opens your website, menu or shop page." },
          { name: "Event access standees", body: "NFC checkpoints for attendee check-in and ticketing." },
        ],
      },
    ],
  },
  orderCard: "Order a card",
  finalTitle: "Your next client is one tap away.",
  finalSub: "Set up your profile free, then order your card when you are ready.",
  footerLine: "Built for Naga first.",
  privacy: "Privacy",
  terms: "Terms",
};

export type LandingCopy = typeof LANDING_COPY;
