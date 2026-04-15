// ─── Core Profile Info ────────────────────────────────────────────────────────
export interface ProfileInfo {
    fullName: string;
    /** Job title, role, or tagline — e.g. "Senior Broker", "Brand Designer" */
    title: string;
    /** Company or organization name (optional) */
    company?: string;
    phone: string;
    email: string;
    address?: string;
    website?: string;
    about?: string;
    avatarUrl?: string;
    /** Services offered — e.g. ["Logo Design", "Brand Identity"] */
    services?: string[];
    socialLinks: { platform: string; url: string }[];
}

/** @deprecated Use ProfileInfo instead */
export type AgentInfo = ProfileInfo;

// ─── Real Estate Property ────────────────────────────────────────────────────
export interface Property {
    id: string;
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
    "photography": "Photography",
    "video": "Video",
    "branding": "Branding",
    "case-study": "Case Study",
    "development": "Development",
    "ui-ux": "UI/UX Design",
    "real-estate": "Real Estate",
    "other": "Other",
};

export interface ProjectItem {
    id: string;
    title: string;
    description?: string;
    category: ProjectCategory;
    tags: string[];
    images: string[];
    externalUrl?: string;
    caseStudyUrl?: string;
    featured?: boolean;
}

// ─── Profile Data (passed to all template components) ────────────────────────
export interface ProfileData {
    agent: ProfileInfo;
    properties: Property[];
    projects: ProjectItem[];
    theme: {
        primaryColor: string;
        backgroundColor: string;
        textColor: string;
    };
}

// Props compliant with all template components
export interface TemplateProps {
    data: ProfileData;
}
