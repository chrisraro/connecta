export interface AgentInfo {
    fullName: string;
    title: string;
    company: string;
    phone: string;
    email: string;
    address?: string;
    website?: string;
    about?: string;
    avatarUrl?: string; // URL to image
    socialLinks: { platform: string; url: string }[];
}

export interface Property {
    id: string;
    title: string;
    price: number;
    status: "for-sale" | "for-rent" | "sold";
    type?: "lot-only" | "house-lot" | "townhouse" | "condo" | "commercial";
    description?: string;
    images: string[];
    detailsUrl?: string; // Made optional as we might just show details in-app
    location?: string;
    lotArea?: number;
    floorArea?: number;
    floors?: number;
    bedrooms?: number;
    bathrooms?: number;
    dateSold?: string;
}

export interface ProfileData {
    agent: AgentInfo;
    properties: Property[];
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
