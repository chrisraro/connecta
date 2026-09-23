import { ProfileData } from "@/types/profile";
import { TEMPLATE_THEMES, TemplateId } from "@/components/templates/theme";

/**
 * Stock photos for the synthetic demo personas, all from Unsplash (free for
 * commercial use under the Unsplash License, no attribution required). The
 * people and places shown are not customers; every demo surface labels itself
 * as sample content.
 *   designer — unsplash.com/photos/RIt88XBR3G0
 *   broker   — unsplash.com/photos/QGr6H7pri-Q
 *   house1   — unsplash.com/photos/d0fXvDIP7xU
 *   house2   — unsplash.com/photos/qkJCW-BFylA
 *   house3   — unsplash.com/photos/1SXaajjGzrw
 */
const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const DEMO_PHOTOS = {
  designer: unsplash("photo-1581065178047-8ee15951ede6", 900),
  broker: unsplash("photo-1604904612715-47bf9d9bc670", 900),
  house1: unsplash("photo-1784091473955-f66695d19b58", 1000),
  house2: unsplash("photo-1759860002233-ef26089ed4ab", 1000),
  house3: unsplash("photo-1650712939442-e5c27652258c", 1000),
};

/**
 * A single, credible demo persona used everywhere the marketing surface
 * needs to show a *real* profile instead of a placeholder (the landing
 * hero's phone preview, and the `/marketing-preview/[templateId]` route used
 * only by `marketing/generate-mockups.mjs`).
 *
 * Static — no Convex fetch, no PII. Rendering the same persona through all
 * three `TemplateId`s is exactly what the "Templates" marquee already
 * claims further down the landing page: one person, three costumes.
 */
export function buildDemoProfile(templateId: TemplateId): ProfileData {
  const theme = TEMPLATE_THEMES[templateId] ?? TEMPLATE_THEMES.editorial;

  return {
    ownerId: "demo-owner",
    name: "Nicole Bautista — demo profile",
    profileType: "individual",
    agent: {
      fullName: "Nicole Bautista",
      title: "Interior Designer & Creative Director",
      company: "Nicole Bautista Design Co.",
      phone: "+63 917 555 0142",
      email: "hello@nicolebautistadesign.ph",
      website: "nicolebautistadesign.ph",
      avatarUrl: DEMO_PHOTOS.designer,
      about:
        "Interior designer crafting warm, livable spaces across Metro Manila — from condo makeovers to boutique hospitality projects. Fifteen years turning empty rooms into homes clients actually want to live in.",
      services: ["Interior Design", "Space Planning", "Styling & Staging", "Renovation Consulting"],
      experience: [
        {
          title: "Founder & Creative Director",
          company: "Nicole Bautista Design Co.",
          period: "2016 — Present",
          description:
            "Independent studio serving residential and boutique hospitality clients across Metro Manila and Tagaytay.",
        },
        {
          title: "Junior Designer",
          company: "Casa Ilustrado Interiors",
          period: "2011 — 2016",
          description: "Residential and retail fit-outs across Makati and BGC.",
        },
      ],
      socialLinks: [
        { platform: "LinkedIn", url: "https://linkedin.com/in/example" },
        { platform: "Instagram", url: "https://instagram.com/example" },
        { platform: "Website", url: "https://nicolebautistadesign.ph" },
      ],
    },
    properties: [],
    projects: [],
    componentOrder: ["Hero", "About", "Services", "Experience", "Contact"],
    theme: {
      primaryColor: theme.colors.accent,
      backgroundColor: theme.colors.background,
      textColor: theme.colors.ink,
      secondaryColor: theme.colors.surface,
      accentColor: theme.colors.accent,
    },
    // A real client image is never resolved from Convex storage here — this
    // marks the avatar path as "already resolved" so ProfileImage skips its
    // per-image `getImageUrl` query entirely (see components/templates/
    // ProfileImage.tsx) instead of firing a real Convex lookup for a path
    // that was never a storage id.
  };
}

/**
 * The beachhead persona: a synthetic Naga City real estate broker with three
 * listings, used to review the listings section of the public profile. The
 * barangays are real Naga places; the broker, prices and listings are not.
 */
export function buildDemoBrokerProfile(templateId: TemplateId): ProfileData {
  const base = buildDemoProfile(templateId);
  return {
    ...base,
    name: "Andrea Villanueva — demo profile",
    agent: {
      fullName: "Andrea Villanueva",
      title: "Licensed Real Estate Broker",
      company: "Villanueva Realty · Naga City",
      phone: "+63 917 555 0188",
      email: "andrea@villanuevarealty.example",
      avatarUrl: DEMO_PHOTOS.broker,
      about:
        "I help families buy, sell and rent homes across Naga City and Metro Naga: house-and-lot, lot-only and rentals. Tell me what you're looking for and I'll send you what fits.",
      services: ["House & lot sales", "Lot-only sales", "Rentals", "Property valuation"],
      experience: [
        {
          title: "Licensed Real Estate Broker",
          company: "Villanueva Realty",
          period: "2018 — Present",
          description: "Residential sales and rentals across Naga City, Pili and Canaman.",
        },
      ],
      socialLinks: [
        { platform: "Facebook", url: "https://facebook.com/example" },
        { platform: "Instagram", url: "https://instagram.com/example" },
      ],
    },
    propertyListings: [
      {
        title: "3-bedroom house and lot",
        price: "₱4,850,000",
        location: "Concepcion Pequeña, Naga City",
        status: "For sale",
        image: DEMO_PHOTOS.house1,
        description: "Corner lot, covered parking, walking distance to the national highway.",
      },
      {
        title: "Two-storey family home",
        price: "₱7,200,000",
        location: "Pacol, Naga City",
        status: "For sale",
        image: DEMO_PHOTOS.house2,
        description: "Four bedrooms, a garden and a two-car garage in a quiet subdivision.",
      },
      {
        title: "Bungalow for rent",
        price: "₱18,000 / month",
        location: "Triangulo, Naga City",
        status: "For rent",
        image: DEMO_PHOTOS.house3,
        description: "Two bedrooms, near schools and the city centre. One-year lease.",
      },
    ],
    componentOrder: ["Hero", "About", "Properties", "Services", "Experience", "Contact"],
  };
}
