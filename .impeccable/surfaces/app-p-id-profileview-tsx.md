---
version: 1
slug: "app-p-id-profileview-tsx"
primary_target: "app/p/[id]/ProfileView.tsx"
related_targets: ["app/[slug]/page.tsx","app/t/[uuid]/page.tsx","components/templates/ProfileRenderer.tsx"]
---

# Public profile — surface brief

**Scope:** the public profile at `/[slug]`, `/p/[id]` and the `/t/[serial]` landing. Visitor mode: **Persuade**. The visitor decides to save the contact or send their details.
**Audience:** a stranger, usually a Naga home-buyer, client or contact, who just tapped a card face to face, on an Android phone in bright light on mobile data.
**Job:** know who this person is within 3 seconds, then save the contact or leave their details.
**Proof and content:** the owner's own photo, role, company, services, listings and socials. Demo persona "Nicole Bautista" is synthetic and must be labelled when shown.
**Constraints:** no language toggle on profiles (it lives on the marketing site); LCP under 2.5s on 4G; WCAG 2.2 AA; three owner-selectable templates must survive as variants inside the world; Free-plan "Powered by Connecta" line.
**Memorable moment:** the tie line drawing from the tap point to the person.
**Unresolved:** exact second language; final lettermark (from /brandkit); how templates map to plan-sheet variants.

## Direction contract

Amended 2026-09-24 at the founder's direction ("remove the distractions: the numbers like the coordinates, the pointers and the tapped gimmick"). This replaces the first contract, whose tie line, point-of-beginning stamp, bearings, distances, corner numbers and leader lines are all retired. This profile is the **default template**; industry-specific templates will follow.

THESIS: The person as a surveyed, trustworthy lot: a calm, credible sheet that puts the face, the name and the save action first. It refuses the category default of a round avatar over a stack of pill link buttons on dark glass, and it refuses decorative annotation.

OWN-WORLD: A drafting-grid sheet in three colourways: whiteprint (#EEF1F4 ground, #2B3F8F line, #12161F ink), blueprint, and graphite. The portrait prints in one ink inside an eight-corner, 45°-chamfered lot outline. The title block is square-cornered linework. Archivo carries the lettering, expanded for display; JetBrains Mono is used only for real data (prices, dates). There are no boxes around content: rules and lot boundaries only. Red is reserved for the brand mark's dot and status tags. Empty sections show as dashed lots in owner previews only.

STORY: The visitor sees who this is, reads the name, role and company, saves the contact in one tap or leaves their details, then browses the owner's lots (about, listings, services).

FIRST VIEWPORT: At 390×844, the page opens on the portrait in the lot outline, at full content width and a 5:6 aspect. The title block follows: the name at display scale, role and company, Call / Email / Website / QR cells, a full-width filled "Save contact" cell, then "Send my details" as the block's last cell.

FORM: Survey Plan, #4 of 7 on the grounded list, simplified per the founder's amendment. Seed key 14708d4d. Kept raises: one-ink portraits; no boxes; empty lots in owner previews; shingled listings.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
