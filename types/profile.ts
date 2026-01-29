export interface AgentInfo {
    fullName: string;
    title: string;
    company: string;
    phone: string;
    email: string;
    website?: string;
    avatarUrl?: string; // URL to image
    socialLinks: { platform: string; url: string }[];
}

export interface Property {
    id: string;
    title: string;
    price: number;
    status: "for-sale" | "for-rent" | "sold";
    imageUrl: string;
    detailsUrl: string;
    location?: string;
    beds?: number;
    baths?: number;
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
