"use server";

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

// Configure Groq
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

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
        // We use generateText instead of generateObject to avoid 'json_schema' mode issues with Groq
        const { text } = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            system: "You are an expert UI designer. You MUST output raw JSON only. No markdown, no explanations.",
            prompt: `
        Generate a profile configuration based on: "${prompt}".
        
        Themes: 'modern', 'luxury', 'minimal'.
        Components: 'Hero', 'Bio', 'Properties', 'Contact'.
        
        Output strictly in this JSON format:
        {
          "themeId": "modern" | "luxury" | "minimal",
          "colorPalette": { "primary": "hex", "background": "hex", "text": "hex" },
          "componentOrder": ["Hero", "Bio"...],
          "heroStyle": "default"
        }
      `,
        });

        // Clean up response if it contains markdown code blocks
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJson);

        // Validate with Zod
        const validating = profileSchema.safeParse(data);
        if (!validating.success) {
            throw new Error("Invalid JSON structure returned by AI");
        }

        return { success: true, data: validating.data };
    } catch (error: any) {
        console.error("AI Generation Error Full:", JSON.stringify(error, null, 2));
        return { success: false, error: error.message || "Failed to generate profile" };
    }
}
