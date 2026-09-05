export type ProfileType = "individual" | "company" | "business";

// ─── Core Profile Info ────────────────────────────────────────────────────────
export interface ProfileInfo {
  fullName: string;
  /** Job title, role, or tagline — e.g. "Senior Broker", "Brand Designer" */
  title: string;
  /** Company or organization name (optional) */
  company?: string;
  phone: string;
  email: string;
  additionalPhones?: string[];
  additionalEmails?: string[];
  address?: string;
  website?: string;
  about?: string;
  avatarUrl?: string;
  /** Services offered — e.g. ["Logo Design", "Brand Identity"] */
  services?: string[];
  socialLinks: { platform: string; url: string }[];
  /** Certification/highlight credential */
  certification?: {
    title: string;
    description: string;
  };
  /** Education background */
  education?: {
    degree: string;
    school: string;
    year?: string;
  }[];
  /** Tech stack/skills organized by category */
  techStack?: {
    category: string;
    skills: string[];
  }[];
  /** Work experience history */
  experience?: {
    title: string;
    company: string;
    period: string;
    description?: string;
  }[];
  /** Testimonials/recommendations */
  testimonials?: {
    quote: string;
    author: string;
    role?: string;
  }[];
  /** Gallery images */
  gallery?: string[];
}

/** @deprecated Use ProfileInfo instead */
export type AgentInfo = ProfileInfo;

// ─── Real Estate Property ────────────────────────────────────────────────────
export interface Property {
  id: string;
  ownerId: string;
  title: string;
  price: number;
  status: "for-sale" | "for-rent" | "sold";
  type?: "lot-only" | "house-lot" | "townhouse" | "condo" | "commercial";
  description?: string;
  images: string[];
  detailsUrl?: string;
  location?: string;
  lotArea?: number;
  floorArea?: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  dateSold?: string;
}

// ─── Portfolio Project ────────────────────────────────────────────────────────
export type ProjectCategory =
  | "graphic-design"
  | "web-design"
  | "photography"
  | "video"
  | "branding"
  | "case-study"
  | "development"
  | "ui-ux"
  | "real-estate"
  | "other";

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  "graphic-design": "Graphic Design",
  "web-design": "Web Design",
  photography: "Photography",
  video: "Video",
  branding: "Branding",
  "case-study": "Case Study",
  development: "Development",
  "ui-ux": "UI/UX Design",
  "real-estate": "Real Estate",
  other: "Other",
};

export interface ProjectItem {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  category: ProjectCategory;
  tags: string[];
  images: string[];
  externalUrl?: string;
  caseStudyUrl?: string;
  featured?: boolean;
}

// ─── Dynamic Content ──────────────────────────────────────────────────────────
export interface ProductItem {
  title: string;
  description: string;
  price?: number;
  image?: string;
  link?: string;
}

export interface ServiceItem {
  title: string;
  description: string;
  price?: number;
  image?: string;
}

export interface PropertyListingItem {
  title: string;
  description?: string;
  price?: string;
  location?: string;
  image?: string;
  status?: string;
  link?: string;
}

export interface InlineProject {
  title: string;
  description?: string;
  category?: string;
  image?: string;
  link?: string;
}

export interface DigitalCardConfig {
  backgroundColor: string;
  textColor: string;
  layout: "classic" | "split" | "centered";
  showQrCode: boolean;
  theme: "light" | "dark" | "glass" | "carbon";
  cardBackgroundType: "solid" | "gradient";
  cardGradientStart?: string;
  cardGradientEnd?: string;
  positions?: {
    header?: { x: number; y: number; width?: number; scale?: number };
    qr?: { x: number; y: number; width?: number; scale?: number };
    bio?: { x: number; y: number; width?: number; scale?: number };
    contacts?: { x: number; y: number; width?: number; scale?: number };
  };
}

// ─── Profile Data (passed to all template components) ────────────────────────
export interface ProfileData {
  ownerId: string;
  name: string;
  profileType: ProfileType;
  agent: ProfileInfo;
  properties: Property[];
  projects: ProjectItem[];
  products?: ProductItem[];
  services?: ServiceItem[];
  propertyListings?: PropertyListingItem[];
  inlineProjects?: InlineProject[];
  componentOrder?: string[];
  resolvedImages?: Record<string, string>;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  digitalCard?: DigitalCardConfig;
  showStorefront?: boolean;
}
