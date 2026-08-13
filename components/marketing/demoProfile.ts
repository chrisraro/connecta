import { ProfileData } from "@/types/profile";
import { TEMPLATE_THEMES, TemplateId } from "@/components/templates/theme";

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
      avatarUrl: "/marketing/demo-avatar.svg",
      about:
        "Interior designer crafting warm, livable spaces across Metro Manila — from condo makeovers to boutique hospitality projects. Fifteen years turning empty rooms into homes clients actually want to live in.",
      services: [
        "Interior Design",
        "Space Planning",
        "Styling & Staging",
        "Renovation Consulting",
      ],
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
    resolvedImages: {},
  };
}
