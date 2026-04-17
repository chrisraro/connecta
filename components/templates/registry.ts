// Template Registry - Maps template IDs to components and metadata
import { ComponentType } from "react";
import { TemplateProps } from "@/types/profile";

// Template metadata type
export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // Gradient or color representation
  fonts: {
    display: string;
    body: string;
  };
  defaultColors: {
    primary: string;
    background: string;
    text: string;
  };
  features: string[];
  bestFor: string[];
}

// Template registry
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "editorial",
    name: "Editorial",
    description: "Quiet luxury with editorial magazine aesthetics. Perfect for creatives and consultants.",
    thumbnail: "linear-gradient(135deg, #fbf9f4 0%, #f5f3ee 50%, #705838 100%)",
    fonts: {
      display: "Noto Serif",
      body: "Manrope",
    },
    defaultColors: {
      primary: "#705838",
      background: "#fbf9f4",
      text: "#1b1c19",
    },
    features: ["Asymmetric layouts", "No borders", "Tonal layering", "Glassmorphism"],
    bestFor: ["Consultants", "Writers", "Designers", "Photographers"],
  },
  {
    id: "kinetic",
    name: "Kinetic",
    description: "High-energy neon-brutalist design for tech professionals and innovators.",
    thumbnail: "linear-gradient(135deg, #0e0e0e 0%, #1a1a1a 50%, #ba9eff 100%)",
    fonts: {
      display: "Space Grotesk",
      body: "Manrope",
    },
    defaultColors: {
      primary: "#ba9eff",
      background: "#0e0e0e",
      text: "#ffffff",
    },
    features: ["Electric accents", "Dark mode", "Sharp corners", "Glowing effects"],
    bestFor: ["Developers", "Startups", "Tech leads", "Digital creators"],
  },
  {
    id: "architectural",
    name: "Architectural",
    description: "Curated authority with structured, professional aesthetics. Ideal for executives.",
    thumbnail: "linear-gradient(135deg, #f7f9fb 0%, #f2f4f6 50%, #00193c 100%)",
    fonts: {
      display: "Manrope",
      body: "Inter",
    },
    defaultColors: {
      primary: "#00193c",
      background: "#f7f9fb",
      text: "#191c1e",
    },
    features: ["Structured layout", "Professional tones", "Glass layers", "Type weight extremes"],
    bestFor: ["Executives", "Real estate", "Lawyers", "Finance professionals"],
  },
];

// Dynamic import function for templates
export async function loadTemplate(id: string): Promise<ComponentType<TemplateProps>> {
  switch (id) {
    case "editorial":
      return (await import("./Editorial")).default;
    case "kinetic":
      return (await import("./Kinetic")).default;
    case "architectural":
      return (await import("./Architectural")).default;
    default:
      // Fallback to Editorial
      return (await import("./Editorial")).default;
  }
}

// Get template metadata by ID
export function getTemplateMeta(id: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// Get default template
export function getDefaultTemplate(): TemplateMeta {
  return TEMPLATES[0];
}
