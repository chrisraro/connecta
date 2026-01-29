# Project Context: "Tap & Save" - NFC Real Estate Platform

## 1. Executive Summary
**Tap & Save Prototype** is a hybrid SaaS platform designed for Real Estate Agents and Brokerages. It bridges physical networking with digital lead capture.
* **The Hardware:** Users purchase NFC-enabled business cards via a WordPress/WooCommerce storefront.
* **The Software:** A Next.js + Convex application handles card activation, dashboard management, analytics, and an AI-powered "Generative UI" profile builder.

## 2. Tech Stack (Strict Constraints)

### Core Application (This Repository)
* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript (Strict mode enabled)
* **Backend / Database:** Convex (Real-time, Serverless)
* **Authentication:** Clerk (integrated with Convex)
* **Styling:** Tailwind CSS
* **UI Components:**
    * **Admin Dashboard:** `shadcn/ui`
    * **Public Profiles:** Custom, high-fidelity components (Mobile-first)

### AI & Intelligence
* **SDK:** Vercel AI SDK (Core)
* **Model:** `google/gemini-3-flash`
* **Strategy:** "Generative UI" (AI generates JSON configuration, not raw HTML)

### External Integrations
* **E-Commerce Source:** WordPress + WooCommerce (External URL)
* **Data Sync:** Webhooks (WooCommerce `order.completed` -> Convex HTTP Action)
* **Contact Export:** `vcards-js` (For generating .vcf files)

---

## 3. System Architecture & Data Flow

### A. The Purchase Loop (External -> Internal)
1.  **User Action:** Buys "5-Pack NFC Cards" on the WordPress site.
2.  **Trigger:** WooCommerce fires a webhook to `https://app.tapandsave.com/convex/site/webhook/woocommerce`.
3.  **Convex Action:**
    * Validates the payload.
    * Creates a `User` record (if new).
    * Generates 5 `Card` records with status `inactive` and unique `activationCodes`.
    * Sends a "Welcome/Claim" email to the user.

### B. The Activation Loop
1.  **User Action:** Logs into Next.js Dashboard via Clerk.
2.  **User Action:** Enters the unique code printed on their physical card.
3.  **Convex Mutation:** Updates `Card` status to `active` and links it to the User's `Profile`.

### C. The "Tap" Experience (The Public View)
1.  **Physical Action:** Client taps phone on NFC Card.
2.  **Routing:** Browser opens `https://tapandsave.com/p/[cardUuid]`.
3.  **Server Logic:**
    * Fetch `Card` by UUID.
    * **Analytics:** Increment `tapCount` in Convex.
    * **Render:** Load the `Profile` layout based on the stored AI JSON configuration.

---

## 4. Database Schema (Convex)

The database must adhere to this relational structure.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users (Agents & Brokers)
  users: defineTable({
    email: v.string(),
    clerkId: v.string(),
    role: v.union(v.literal("agent"), v.literal("admin")),
    subscriptionStatus: v.string(), // "active", "past_due"
    credits: v.number(), // Token balance for AI generation
  }).index("by_clerkId", ["clerkId"]),

  // 2. Physical Inventory (Cards)
  cards: defineTable({
    ownerId: v.id("users"),
    uuid: v.string(), // The unique ID burned into the NFC tag
    activationCode: v.string(), // Printed on card for verification
    status: v.union(v.literal("inventory"), v.literal("active"), v.literal("lost")),
    linkedProfileId: v.optional(v.id("profiles")),
    tapCount: v.number(),
  }).index("by_uuid", ["uuid"])
    .index("by_owner", ["ownerId"]),

  // 3. Digital Profiles (The Generative UI Data)
  profiles: defineTable({
    ownerId: v.id("users"),
    name: v.string(), // e.g., "Luxury Portfolio 2026"
    
    // Core Agent Data
    agentInfo: v.object({
        fullName: v.string(),
        title: v.string(), // e.g. "Senior Broker"
        company: v.string(),
        phone: v.string(),
        email: v.string(),
        website: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        socialLinks: v.array(v.object({ platform: v.string(), url: v.string() })),
    }),

    // The AI Configuration (JSON Recipe)
    layoutConfig: v.object({
        themeId: v.string(), // "gold-standard", "modern-minimal"
        colorPalette: v.object({ primary: v.string(), background: v.string() }),
        componentOrder: v.array(v.string()), // ["Hero", "Properties", "LeadForm"]
        heroStyle: v.string(),
    }),

    // Linked Property Listings
    featuredProperties: v.array(v.id("properties")),
  }).index("by_owner", ["ownerId"]),

  // 4. Properties (Mini-CMS)
  properties: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    price: v.number(),
    status: v.union(v.literal("for-sale"), v.literal("for-rent"), v.literal("sold")),
    imageUrl: v.string(),
    detailsUrl: v.string(),
  }).index("by_owner", ["ownerId"]),

  // 5. Leads (Analytics)
  leads: defineTable({
    cardId: v.id("cards"),
    profileId: v.id("profiles"),
    visitorName: v.optional(v.string()),
    visitorPhone: v.optional(v.string()), // Captured via "Share Info" form
    capturedAt: v.number(),
  }),
});

## 5. Feature Specifications
Feature: AI Layout Designer
Goal: Allow non-technical agents to build beautiful portfolios.

Input: "I sell luxury condos in BGC. I want a dark, gold-themed look."

Process:

Next.js Server Action calls google/gemini-3-flash.

Gemini outputs a JSON object (validated by zod).

Frontend updates the profiles.layoutConfig field in Convex.

Constraint: AI never writes React code. It only selects options from our pre-built component library.

Feature: "Save to Contact" (vCard)
Component: <SaveContactButton />

Logic:

On click, fetch agentInfo from the profile props.

Construct a VCF string (Version 3.0).

Trigger a browser download (agent-name.vcf).

Requirement: Must include Base64 encoded photo if available.

##6. Coding Standards & Rules
Convex-First:

Do NOT create Next.js API Routes for data fetching. Use useQuery and useMutation hooks directly in Client Components.

Use convex/http.ts only for external webhooks (e.g., WooCommerce).

Type Safety:

Never use any. Define interfaces for all AI outputs and Component props.

Use zod to validate all AI responses before saving to the DB.

Performance:

The "Public Profile" page (/p/[id]) must score 95+ on Mobile Lighthouse.

Use next/image for all property and agent photos.

File Structure:

/convex: Backend functions and schema.

/components/profile-builder: The AI interaction UI.

/components/templates: The reliable "lego blocks" the AI selects (e.g., LuxuryHero.tsx, GridListings.tsx).