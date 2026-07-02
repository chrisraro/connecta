# TapFolio Development Setup & Integration Guide

This document provides a comprehensive guide to understanding the TapFolio codebase, its backend/frontend architecture, and its integrations with third-party services. Follow these steps to connect and configure the external services required for local development and production.

---

## 1. System Architecture & Tech Stack

TapFolio is a digital business card and CRM platform designed for modern professionals. It consists of the following components:

### Frontend
- **Framework:** Next.js 15 (App Router, using React 19)
- **Styling:** Tailwind CSS (v4 with PostCSS)
- **UI Components:** Shadcn/ui for dashboards, and custom mobile-first layouts for public profiles
- **Typography:** Uses Google Fonts (Inter, Space Grotesk, Noto Serif, Manrope) depending on the selected template.

### Backend & Database
- **Platform:** Convex (Real-time, Serverless database and functions)
  - Real-time client subscription allows immediate UI updates on the dashboard or public profiles.
  - Server actions are not used; the client communicates directly with Convex functions via `useQuery` and `useMutation` hooks.
  - HTTP Actions (`convex/http.ts`) handle external incoming webhooks.

### Third-Party Integrations
- **Authentication:** Clerk (fully integrated with Convex server-side JWT verification)
- **Payment Gateway:** PayRex (GCash, Maya, Credit Card, QR Ph; base currency PHP)
  - Replaces old Stripe/PayPal integrations.
  - Handles checkout sessions and webhook verification via HMAC-SHA256 signature matching.
- **Email Delivery:** Resend (used for order confirmations and new lead email notifications)
- **vCard generation:** `vcards-js` for generating downloadable `.vcf` contact files with profile data.

---

## 2. Database Schema (Convex)

Convex is configured with strict relational data schema checks (defined in [schema.ts](file:///c:/Users/raroc/OneDrive/Desktop/Personal%20Project/TapFolio/Tapfolio/convex/schema.ts)):

1. **`users`:** Holds user profiles, Clerk IDs, active plans (`free`, `pro`, `business`), subscriptions, and onboarding flags.
2. **`cards`:** Represents physical NFC business cards (status: `inventory`, `active`, `lost`), mapped to a user and a digital profile.
3. **`profiles`:** Stores the digital business card layout configuration (JSON recipe of templates, color palettes, and component orders) and agent details.
4. **`properties` / `projects`:** Portfolio contents linked to profiles (Mini-CMS).
5. **`leads`:** Form submissions from visitors scanning the cards (status: `new`, `contacted`, `closed`). Supports local offline queuing and sync.
6. **`notifications`:** Real-time system or new lead alerts.
7. **`auditLogs`:** Tracks admin mutations (suspend user, grant roles, settings changes).
8. **`admins`:** Records admin roles (`superadmin`, `moderator`) to gate dashboard operations.
9. **`products` / `productVariations` / `productCategories` / `carts` / `orders` / `discounts`:** E-commerce store engine.
10. **`settings`:** Global storefront settings (tax %, shipping thresholds, subscription prices).
11. **`teams` / `teamInvites` / `subscriptionInvoices`:** B2B SaaS organization and recurring subscription ledger.

---

## 3. Environment Variables Configuration

To run the application, you must configure environment variables in two places: locally in Next.js and in your Convex server dashboard.

### A. Next.js App Environment (`.env.local` in root folder)

Create a `.env.local` file in your workspace root (see [example](file:///c:/Users/raroc/OneDrive/Desktop/Personal%20Project/TapFolio/Tapfolio/.env.example)):

```bash
# Clerk Authentication configuration
# Go to Clerk Dashboard -> API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Next.js Application URL
# Use http://localhost:3000 for local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex Database Integration
# Automatically generated when you run `npx convex dev`
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOYMENT=...
```

### B. Convex Dashboard Environment Variables

Configure these settings inside the **Convex Dashboard Settings -> Environment Variables**:

| Variable | Description | Source |
|---|---|---|
| `RESEND_API_KEY` | Resend API Key for sending transaction emails | Resend Dashboard |
| `PAYREX_SECRET_KEY` | PayRex Secret Key (`pr_test_...`) for creating checkout sessions | PayRex Dashboard |
| `PAYREX_WEBHOOK_SECRET` | Secret key used to verify incoming webhook signatures | Generated on webhook creation |
| `NEXT_PUBLIC_APP_URL` | Base URL of your frontend app (e.g. `http://localhost:3000` or production URL) | Setup specific |

---

## 4. Setup Guide (Connecting Services)

### Step 1: Install Node.js & NPM
Before installing dependencies, ensure you have **Node.js (LTS version)** installed on your machine.
- If you use Windows Package Manager, open a Command Prompt or PowerShell window and run:
  ```powershell
  winget install OpenJS.NodeJS
  ```
- Alternatively, download and install Node.js from the official site: https://nodejs.org/

### Step 2: Install Project Dependencies
Once Node.js is installed, run `npm install` in the project root to fetch local packages:
```bash
npm install
```

### Step 3: Connect and Configure Convex
1. Start the Convex development server locally. This will guide you through logging into Convex, initializing your project, and downloading code generation files:
   ```bash
   npx convex dev
   ```
2. Verify that Convex generates client-side files like [api.d.ts](file:///c:/Users/raroc/OneDrive/Desktop/Personal%20Project/TapFolio/Tapfolio/convex/_generated/api.d.ts) inside `convex/_generated/`.

### Step 4: Register PayRex Webhooks
Since the PayRex Dashboard does not yet support a user interface for webhook configuration, you must register the webhook endpoint programmatically.
1. Run a `POST` request to `https://api.payrexhq.com/v1/webhooks` with basic authentication (`username = PAYREX_SECRET_KEY`, `password = empty`):
   ```bash
   # Example using cURL
   curl -X POST https://api.payrexhq.com/v1/webhooks \
     -u "pr_test_YOUR_SECRET_KEY_HERE:" \
     -d "url=https://<your-convex-deployment-name>.convex.site/webhooks/payrex" \
     -d "events[]=payment_intent.succeeded" \
     -d "events[]=checkout_session.payment.paid"
   ```
2. Save the webhook secret key returned in the response payload as `PAYREX_WEBHOOK_SECRET` inside your Convex environment variables dashboard.

### Step 5: Provision First Admin
1. Create a user account by logging into the frontend (`http://localhost:3000/auth`).
2. Retrieve your Clerk User ID (starts with `user_...`) from the Clerk Dashboard.
3. Grant this user the first superadmin role by running:
   ```bash
   npx tsx scripts/setup-first-admin.ts user_YOUR_CLERK_ID
   ```
4. Access the admin dashboard at `http://localhost:3000/admin/auth`.
