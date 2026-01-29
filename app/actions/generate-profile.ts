"use server";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

// Schema definition matching our Convex 'layoutConfig'
const profileSchema = z.object({
    themeId: z.enum(["modern", "luxury", "minimal"]),
    colorPalette: z.object({
        primary: z.string().describe("Hex code for primary accent color"),
        background: z.string().describe("Hex code for background color"),
        text: z.string().default("#000000").describe("Hex code for text color"),
    }),
    componentOrder: z.array(z.string()).describe("List of component IDs to render in order (e.g., 'Hero', 'Bio', 'Properties')"),
    heroStyle: z.string().describe("Specific style variant for the hero section"),
});

export async function generateProfile(prompt: string) {
    try {
        const { object } = await generateObject({
            model: google("gemini-1.5-flash"),
            schema: profileSchema,
            prompt: `
        You are an expert UI designer for real estate agents. 
        Generate a profile configuration based on this user request: "${prompt}".
        
        Available Components:
        - Hero: The main introduction section.
        - Bio: Agent biography.
        - Properties: Grid of listings.
        - Contact: Lead capture form.
        
        Themes:
        - 'modern': Bold, high contrast, clean lines.
        - 'luxury': Gold/Black/White, serif fonts, sophisticated.
        - 'minimal': Whitespace, simple, subtle.
        
        Ensure the color palette matches the requested theme/vibe.
      `,
        });

        return { success: true, data: object };
    } catch (error) {
        console.error("AI Generation Error:", error);
        return { success: false, error: "Failed to generate profile" };
    }
}
