/**
 * Interface copy for the public profile. What the owner wrote about themselves
 * (name, role, about, services) is shown exactly as they typed it; these are
 * only the product's own words around it. The EN | FIL language toggle lives
 * on the marketing site, not on profiles.
 */
export const PROFILE_COPY = {
  saveContact: "Save contact",
  sendDetails: "Send my details",
  detailsPrivate: (first: string) => `Your details go only to ${first}.`,
  call: "Call",
  email: "Email",
  website: "Website",
  showQr: "Show QR code",
  about: "About",
  services: "Services",
  experience: "Experience",
  education: "Education",
  certification: "Certification",
  skills: "Skills",
  projects: "Projects",
  products: "Products",
  listings: "Properties",
  testimonials: "What clients say",
  gallery: "Gallery",
  contactHeading: "Leave your details",
  contactIntro: (first: string) => `${first} will get back to you. Nothing is shared with anyone else.`,
  yourName: "Your name",
  yourContact: "Email or mobile number",
  message: "Message",
  optional: "optional",
  send: "Send my details",
  sending: "Sending…",
  sent: (first: string) => `Sent. ${first} has your details.`,
  sendError: "That didn't send. Check your connection and try again.",
  view: "View",
  poweredBy: "Powered by",
  profileTab: "Profile",
  storefrontTab: "Services & products",
  loading: "Loading profile…",
  notFoundTitle: "Profile not found",
  notFoundBody: "This profile may have been removed, or the link is incorrect.",
  goHome: (name: string) => `Go to ${name}`,
  links: "Links",
  unsurveyed: "Unsurveyed lot · add it in the builder",
};

export type ProfileCopy = typeof PROFILE_COPY;
