# Product

<!-- impeccable:product-schema 1 -->

_Rewritten 2026-09-24 for the brand, design-system and screens rebuild. Facts marked **(confirmed)** came from the founder in the 2026-09-24 interview; **(research)** facts come from the 2026-09-24 market research (sources in the strategy brief); **(open)** items are undecided and must not be treated as settled._

## Platform

web

## Users

Primary launch market: **Naga City, Camarines Sur (Bicol), Philippines** (confirmed). Beachhead segments, in priority order (confirmed):

1. **Real estate agents and brokers.** Main target. They hand out cards constantly, live on leads, and are organised locally through PAREB and REBAP chapters (research). Real estate is Naga's top-contributing industry (research).
2. **MSME and shop owners.** Cafés, clinics, stores and services that need one professional presence for the owner and staff. Reached through the Metro Naga Chamber of Commerce and Industry (MNCCI) (research).
3. **Professionals.** Insurance and financial advisors, BPO team leads, doctors, lawyers and sales reps. Naga has roughly 8,000 direct BPO workers (research).
4. **Students and fresh graduates.** Mainly Ateneo de Naga University and University of Nueva Caceres. Price-sensitive; the free-plan and word-of-mouth funnel (confirmed segment; research on enrollment).

Secondary audience: Connecta's own admin and ops staff, who run card registration (NFC factory), the shop, user plans and the audit trail.

The person on the receiving end of a tap is almost always on a phone, usually meeting the card owner face to face, and has never heard of Connecta.

## Product Purpose

Connecta turns a physical NFC + QR card into a live, professional mobile profile that captures the other person as a lead. The owner then manages profile, cards, leads and team from a dashboard. Success means the Naga beachhead chooses Connecta over paper cards and cheap one-time NFC cards, and keeps paying because the leads turn into business.

## Positioning

All four edges are wanted, in this order (confirmed 2026-09-24):

- **Lead: Leads that close.** Every tap is a captured, followable lead, even offline. Neither global nor PH competitors were found advertising offline capture or agent-specific lead features (research, unverified as an absolute gap).
- **Proof: Looks premium instantly.** Art-directed cards and profiles make a provincial professional look big-city credible on first tap.
- **Trust layer: Local and peso-native.** Built for Naga first, with transparent ₱ pricing, GCash/Maya, local delivery and hands-on setup. No competitor was found targeting Bicol or Naga, and several PH sellers hide their prices behind inquiry forms (research).
- **Expansion: Teams and companies.** Brokerages, agencies and MSMEs outfit a whole team with shared branding and a team lead pool (Business plan).

## Operating Context

- **The tap moment:** a face-to-face meeting (house viewing, open house, chamber event, job fair, mall kiosk), often on mobile data with weak signal.
- **Local competition:** the PH norm is a one-time card with a free dashboard. Prices run ₱175–₱350 for entry cards (Axess, Jincos) up to ₱2,500–₱15,000 for premium ones (TapToConnect). No PH competitor charging a recurring ₱ subscription was found. Global players (Popl, HiHello, Blinq, V1CE, Mobilo, Ovou) sell in USD, and most rely on subscriptions (research).
- **Channels:** Facebook is the primary channel (research). Payments run on GCash and Maya (research). Couriers in Naga are LBC and J&T (research).
- **Events:** MNCCI, Rotary chapters, the Naga City Digital Innovation Hub, KahitSan coworking, SM City Naga and Robinsons Place Naga, DICT job fairs, and Kaogma (Pili). Peñafrancia (September) is the city's peak, but it is devotional, so any reference must be oblique and never commercial (research).
- **Fulfilment:** founder-led and personal. The shop is an inquiry basket, and each order is arranged by email or message (confirmed in code).

## Capabilities and Constraints

- **Cards:** NFC + QR cards in four art-directed skins stored as the `card_skin` enum (charcoal, scarlet, crimson, gradient). Skins may be redesigned, but the enum is a schema constraint. The tap route `/t/<serial>` is fixed because tag URLs cannot be rewritten remotely.
- **Profiles:** the Survey Plan profile (`components/survey/`) is the **default template** (confirmed 2026-09-24). The stored template ids editorial, kinetic and architectural currently select its whiteprint, blueprint and graphite colourways. **More templates will be designed per beachhead industry** (real estate, MSMEs, professionals, students); which industries come first, and how they are named and gated by plan, is **(open)**. 14 section types share one renderer. The Contact form feeds the lead API. Save contact downloads a vCard.
- **Leads:** captured through `/api/leads` (IP rate limit, service role, `submit_lead`), with owner notification and email. An in-person offline lead queue lives in localStorage.
- **Price model (confirmed 2026-09-24):** a **one-time card purchase includes a free profile forever**. The subscription is sold only for **lead tools** (follow-up, export, analytics, unlimited leads) and **teams**. This replaces the current code's plans (Free: 1 profile, 1 active card, 100 viewable leads, Connecta branding; Pro ₱299/mo; Business ₱999/mo with 5 seats), which must be re-cut to match. Prices (confirmed 2026-09-24; standard / prelaunch promo):
  - **NFC card (one-time, free profile forever):** starts at ₱888 / ₱799 prelaunch. Whether price varies by skin is **(open)**.
  - **Lead tools (individual):** ₱79/mo / ₱49/mo prelaunch; ₱799/yr / ₱499/yr prelaunch.
  - **Teams:** ₱299/mo / ₱249/mo prelaunch; ₱3,199/yr / ₱2,699/yr prelaunch. Teams is **per team, up to 5 seats** (confirmed). When the prelaunch window ends is **(open)**.
  Which limits move from Free to paid is **(open)**.
- **Payments:** no gateway is live. Plan changes are set by an admin. Adding online payments (GCash/Maya) is **(open)**.
- **Stack:** Next.js 16 + Supabase (Auth, Postgres with RLS, Storage) + Resend, deployed on a `*.vercel.app` URL. A `.ph` domain is planned but not purchased.
- **Language (confirmed 2026-09-24):** a **full bilingual toggle** on the marketing site. The current code is English only. Research found every competitor marketing in English only. The second language is **Filipino** (confirmed 2026-09-24). The toggle is **EN | FIL**. Bikol-Naga is not in scope. The **EN | FIL toggle lives on the marketing site** (confirmed 2026-09-24); public profiles carry no language toggle and show the owner's content as typed, with English interface copy. Filipino marketing copy will need review by a native speaker **(open)** before launch. Every layout must survive longer Filipino strings.
- **Surface order (confirmed 2026-09-24):** the new identity is proven first on the **public profile** (the tap moment). Then comes the marketing site, which must include:
  - **(a)** a dedicated, pitch-perfect **product demo** section or page;
  - **(b)** an animated section, scroll-driven or autoplaying, that dramatises why an NFC tap beats the old way of connecting: cards tapping and revealing the profile or portfolio.
  - The tap moment is dramatised **only on the homepage** (confirmed 2026-09-24). The public profile itself carries no tap stamp, tie line or survey annotation.

## Brand Commitments

- The name **Connecta** stays (confirmed).
- Everything else is open for rebuild (confirmed): logo and lettermark, tagline (the current "tap.connect.grow." is not locked), colour, typography, voice, card skins and screen designs.
- Naga and Bicol cues may inform the identity, but never through cliché. Mayon Volcano belongs to Albay, not Naga, so it is out. Peñafrancia must not be used commercially (research).

## Evidence on Hand

- **Synthetic content:** a demo persona, "Nicole Bautista" (`components/marketing/demoProfile.ts`), and screen mockups in `marketing/mockups/` (old identity). Any demo content must be labelled synthetic.
- **Hardware:** one physical test tag exists (serial 43:45:08:03). There are no product photos of cards or the tap gesture yet.
- **What doesn't exist:** there are **no customers, testimonials, case studies, partner logos, usage numbers or press**. The test accounts were purged on 2026-08-31. Never fabricate any of these.
- **Research:** the 2026-09-24 market research (5 P's, competitors, Naga market) is summarised in the strategy brief.

## Product Principles

1. **The tap is the product.** Everything serves the ten seconds after someone taps: it loads fast on weak mobile data, reads instantly, and captures the lead.
2. **Earn trust locally before scaling.** Transparent ₱ pricing, real people behind the orders, and honest claims.
3. **A lead isn't the finish line.** Success is measured when a lead is followed up and closed, not when it is collected.
4. **Premium without pretence.** Look credible to a Manila client, and still feel made in Naga.
5. **Operate screens stay dense and calm.** Dashboard and admin favour speed and clarity over marketing flourish.

## Accessibility & Inclusion

WCAG 2.2 AA baseline. Public profiles are viewed by arbitrary visitors on low-end Android phones, often outdoors in bright light and on slow connections. Profile contrast is already enforced through `resolveTheme()`.
