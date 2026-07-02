# Product

_Inferred from codebase during a full-project audit (2026-07-02). Not user-confirmed — treat as a working hypothesis and correct as needed._

## Register

product

## Users

Two audiences: (1) creators/professionals/businesses who build and share a digital profile — a "tap" card / link-in-bio page (NFC card + QR + shareable profile URL) — to capture leads and showcase links, often as part of a team/organization; (2) Tapfolio's own admin/ops staff who run the back office (shop orders/inventory for physical NFC cards, plans/billing, user & team management, analytics, audit log).

## Product Purpose

Tapfolio lets users build a shareable digital profile/business-card page (`/p`, `/t`), attach it to a physical NFC/QR card ordered through an in-app shop, capture leads from visitors, and manage everything through a dashboard (builder, cards, leads, team, billing, settings) on a subscription plan. An admin back office handles shop fulfillment, plan/discount management, user oversight, and platform analytics/audit trail. Payments run through PayRex with Stripe/PayPal webhook support.

## Brand Personality

Professional, modern, trustworthy — a digital-identity/networking tool that should feel as polished and credible as the business cards it replaces.

## Anti-references

Generic AI-SaaS template feel (cream/sand backgrounds, gradient-text hero, identical card grids, uppercase eyebrow labels above every section) — the product should feel considered and specific to digital identity/networking, not a templated dashboard.

## Design Principles

1. Mobile-first: the public profile page (`/p`, `/t`) is viewed overwhelmingly on phones after a tap/scan — design and test there first.
2. Trust and clarity in payment/subscription flows — users are trusting the platform with billing and lead data.
3. Low-friction sharing — the profile page is the product's first impression for someone who just tapped a card; it must load fast and read clearly with zero explanation needed.
4. Admin surfaces (shop, analytics, audit) prioritize density and efficiency over marketing polish — different register within the same product.

## Accessibility & Inclusion

No stated requirements found; default to WCAG 2.1 AA as a baseline given the product handles commerce (shop/checkout) and public-facing profile pages viewed by arbitrary visitors.
