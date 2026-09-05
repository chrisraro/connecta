# Connecta Rename (Code Half) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the product from SigmaTap to Connecta across all code, styles and committed docs, and retire the two literal-freezes the previous renames had to carry.

**Architecture:** `lib/brand.ts` is the single source of truth for the product name; two guard tests in `lib/brand.test.ts` enforce that nothing bypasses it. The mechanical renames land first, then the guard tests are tightened as the acceptance gate — a repo-wide guard flipped early would produce one red test listing 60+ files, which is not a useful signal. The final state bans all three retired names with **zero allowlist entries**, which no previous rename achieved.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Vitest 4 (projects: `server` on edge-runtime, `client` on jsdom), `next/font/google`, sharp (brand asset generation).

## Global Constraints

- Product name is exactly `Connecta`. Constant is `CONNECTA`, builder is `buildConnecta()`.
- Tagline is exactly `tap.connect.grow.` — lowercase, period-separated, no spaces.
- Fallback domain is exactly `connecta.example` (RFC 2606 reserved TLD, must never resolve).
- Brand hue tokens are `--connecta-brand` / `--connecta-brand-hover`; the other five keep their nouns (`ink`, `ink-soft`, `paper`, `surface`, `line`). **No token is named `seal`** — that encoded a visual form that is being replaced.
- No new font dependency. The wordmark is live text in Fraunces, already loaded in `lib/fonts.ts` as `--font-display`.
- Token _values_ do not change in this project. Only names.
- `LEAD_VISITOR_ID_KEY` in `lib/storage-keys.ts` is already brand-free and must not be touched.
- Infrastructure (Vercel project, domain, `PRODUCTION_DOMAIN`, Convex/Clerk dashboard labels) is **out of scope** — spec section A7, blocked on a domain purchase.
- Run tests with `npm test`. Single file: `npx vitest run <path>`.

---

## Correction to the spec

Spec section A5 claims zero allowlist entries follow automatically from A4. Two things it did not account for, both handled in Task 7:

1. **`README.md` carries a rename-history paragraph** naming both retired brands (lines 10–13). `README.md` is at the repo root and _is_ scanned. `docs/` is already in `SKIP_DIRS`, so the fix is to **move the history paragraph into `docs/rename-runbook.md`**, which is not scanned. Rewriting history out of existence would violate this project's convention of keeping rename history accurate.
2. **`NEW_BRAND_STRING_EXCEPTIONS` needs comment rewording, not just retargeting.** Three files carry doc comments that say the brand name as a bare word. `/\bConnecta\b/` will match `Connecta's monogram` just as `/\bSigmaTap\b/` matched `SigmaTap's monogram`. Reword those comments to refer to "the product" rather than adding new allowlist entries.

---

## File Structure

| File                                                  | Responsibility                                                          | Task |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ---- |
| `lib/brand.ts`                                        | Brand constant + colour utilities. Single source of truth for the name. | 1    |
| `lib/brand.test.ts`                                   | Unit tests for the constant, plus the two repo-wide guards.             | 1, 7 |
| `lib/storage-keys.ts`                                 | localStorage key literals.                                              | 2    |
| `components/dashboard/QrClaimScanner.test.ts`         | Host-generation fixtures for the QR parser.                             | 3    |
| `app/globals.css`                                     | Brand hue tokens.                                                       | 4    |
| `components/brand/ConnectaMark.tsx`                   | Inline SVG delivery of the mark.                                        | 5    |
| `public/brand/connecta-mark.svg`, `connecta-icon.svg` | Source of truth for the mark geometry.                                  | 5    |
| `scripts/generate-brand-assets.mjs`                   | Regenerates raster icons from the icon SVG.                             | 5    |
| Remaining 50+ files                                   | Copy, metadata, manifests, docs.                                        | 6    |

---

### Task 1: Brand constant

**Files:**

- Modify: `lib/brand.ts`
- Test: `lib/brand.test.ts:29-66` (the constant/builder tests only — the guards are Task 7)

**Interfaces:**

- Consumes: nothing.
- Produces: `CONNECTA: { name: string; tagline: string; domain: string; supportEmail: string }` and `buildConnecta(env: Record<string, string | undefined>)`. Every later task and ~40 call sites import `CONNECTA`.

- [ ] **Step 1: Update the failing tests first**

In `lib/brand.test.ts`, change the import on line 4 and rewrite the six brand tests:

```ts
import { contrastRatio, meetsAA, CONNECTA, buildConnecta } from "./brand";
```

```ts
test("CONNECTA brand constant carries the product name", () => {
  expect(CONNECTA.name).toBe("Connecta");
});

test("CONNECTA brand constant carries the tagline", () => {
  expect(CONNECTA.tagline).toBe("tap.connect.grow.");
});

test("buildConnecta falls back to connecta.example when NEXT_PUBLIC_APP_URL is unset", () => {
  expect(buildConnecta({}).domain).toBe("connecta.example");
});

test("buildConnecta derives the domain from NEXT_PUBLIC_APP_URL when set", () => {
  expect(buildConnecta({ NEXT_PUBLIC_APP_URL: "https://app.example.com" }).domain).toBe(
    "app.example.com",
  );
});

test("buildConnecta derives the domain from a NEXT_PUBLIC_APP_URL that has no protocol", () => {
  expect(buildConnecta({ NEXT_PUBLIC_APP_URL: "app.example.com/" }).domain).toBe("app.example.com");
});

test("buildConnecta defaults supportEmail to support@<domain>", () => {
  expect(buildConnecta({ NEXT_PUBLIC_APP_URL: "https://app.example.com" }).supportEmail).toBe(
    "support@app.example.com",
  );
});

test("buildConnecta lets SUPPORT_EMAIL override the support inbox independently of the domain", () => {
  expect(
    buildConnecta({
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      SUPPORT_EMAIL: "help@realcompany.com",
    }).supportEmail,
  ).toBe("help@realcompany.com");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/brand.test.ts`
Expected: FAIL — `CONNECTA` and `buildConnecta` are not exported from `./brand`.

- [ ] **Step 3: Rewrite `lib/brand.ts`**

Replace the file header comment and the three renamed identifiers. The new header must **not name any retired brand** — that is what lets Task 7 delete this file's allowlist entries.

```ts
/**
 * Connecta brand constants and contrast utilities.
 *
 * The name is the product's promise in one word: a tap turns a stranger into
 * a connection. Every user-facing surface reads the name from CONNECTA below
 * rather than hardcoding it — lib/brand.test.ts fails the build the day a
 * bare string literal reappears in app/** or components/**.
 */

// No domain is owned yet — the product currently runs on a *.vercel.app
// deployment, with a .ph domain planned but not purchased. This literal is
// only a last-resort fallback for local/dev environments that never set
// NEXT_PUBLIC_APP_URL; it must never be treated as a live, reachable host.
const FALLBACK_DOMAIN = "connecta.example";
```

Then rename the builder and constant, keeping the body identical:

```ts
export function buildConnecta(env: Record<string, string | undefined>) {
  const domain = domainFromAppUrl(env.NEXT_PUBLIC_APP_URL) || FALLBACK_DOMAIN;
  const supportEmail = env.SUPPORT_EMAIL?.trim() || `support@${domain}`;
  return {
    name: "Connecta",
    tagline: "tap.connect.grow.",
    domain,
    supportEmail,
  };
}

export const CONNECTA = buildConnecta(typeof process !== "undefined" ? process.env : {});
```

Also update the `buildConnecta` doc comment above the function so it no longer says "SIGMATAP". `parseHex`, `relativeLuminance`, `contrastRatio`, `meetsAA` and `mixHex` are unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/brand.test.ts`
Expected: the seven tests above PASS. The two repo-wide guard tests still FAIL — that is expected until Task 7.

- [ ] **Step 5: Commit**

```bash
git add lib/brand.ts lib/brand.test.ts
git commit -m "refactor: rename the brand constant to CONNECTA"
```

---

### Task 2: Unfreeze the localStorage keys

**Files:**

- Modify: `lib/storage-keys.ts`
- Modify: `contexts/CartContext.tsx:41,44`, `app/shop/cart/page.tsx:172,174`, `app/shop/checkout/page.tsx:34,39,196`

**Interfaces:**

- Consumes: nothing.
- Produces: `GUEST_CART_ID_KEY`, `DISCOUNT_CODE_KEY`, `OFFLINE_LEADS_KEY` — constant names unchanged, **values** changed.

**Context for the implementer:** these three values were frozen through two previous renames because changing them would orphan data in a real user's browser. That is no longer true — a purge on 2026-08-31 removed every account but one, and there is no live population. Do not add a dual-read migration; there is nothing to migrate.

- [ ] **Step 1: Rewrite the key values and the file comment**

In `lib/storage-keys.ts`, replace the file comment and the three exports:

```ts
/**
 * localStorage keys shared across the guest-checkout flow. Kept in one file
 * so the four call sites (CartContext, shop/cart, shop/checkout,
 * offline-leads) can never drift from each other — a guest cart, an applied
 * discount code, or queued offline leads are all read back by key elsewhere
 * in the app, so the literal string must stay byte-identical everywhere it's
 * used.
 */
export const GUEST_CART_ID_KEY = "connecta_guest_cart_id";
export const DISCOUNT_CODE_KEY = "connecta_discount_code";
export const OFFLINE_LEADS_KEY = "connecta_offline_leads";
// Per-browser identity for createLead's visitor-scoped rate limit
// (convex/leads.ts). Deliberately carries no brand prefix.
export const LEAD_VISITOR_ID_KEY = "lead_visitor_id";
```

- [ ] **Step 2: Verify no call site holds its own literal**

Run: `npx tsc --noEmit`
Expected: PASS. Then confirm no stragglers:

```bash
grep -rn "tapfolio_" app components contexts lib --include=*.ts --include=*.tsx
```

Expected: no matches outside `lib/brand.test.ts` (whose allowlist Task 7 removes).

- [ ] **Step 3: Run the shop tests**

Run: `npm test`
Expected: shop and cart tests PASS. `lib/brand.test.ts` guards still FAIL — expected until Task 7.

- [ ] **Step 4: Commit**

```bash
git add lib/storage-keys.ts
git commit -m "refactor: rename guest-checkout storage keys to the connecta prefix"
```

---

### Task 3: Drop the retired-host fixtures

**Files:**

- Modify: `components/dashboard/QrClaimScanner.test.ts:3-25`

**Interfaces:**

- Consumes: `parseQrPayload` from `./QrClaimScanner` (unchanged).
- Produces: nothing.

**Context for the implementer:** `parseQrPayload` is **host-agnostic by design** — it matches the `/t/<uuid>` path shape from any host and never inspects the hostname. Removing these fixtures therefore removes no coverage of production behaviour. Do not change `QrClaimScanner.tsx`; there is no host allowlist in it.

- [ ] **Step 1: Rewrite the docstring and fixture list**

```ts
/**
 * The parser ignores the host entirely and keys on the /t/<uuid> path shape,
 * so a card written against any deployment host resolves. These fixtures
 * cover the current host plus a local dev origin.
 */
test("parses /t/ URLs regardless of host", () => {
  for (const host of ["https://connecta.vercel.app", "http://localhost:3000"]) {
    expect(parseQrPayload(`${host}/t/04:a3:5b:12`)).toEqual({
      kind: "uuid",
      uuid: "04:a3:5b:12",
    });
  }
});
```

Also update the two later assertions at lines 26 and 33 that use `https://sigmatap.vercel.app` to `https://connecta.vercel.app`.

- [ ] **Step 2: Run the test**

Run: `npx vitest run components/dashboard/QrClaimScanner.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/QrClaimScanner.test.ts
git commit -m "test: drop retired-host fixtures from the QR parser test"
```

---

### Task 4: Rename the brand tokens

**Files:**

- Modify: `app/globals.css:103-112` (declarations only — see below)

**Interfaces:**

- Consumes: nothing.
- Produces: CSS custom properties `--connecta-brand`, `--connecta-brand-hover`, `--connecta-ink`, `--connecta-ink-soft`, `--connecta-paper`, `--connecta-surface`, `--connecta-line`.

**Context for the implementer: these seven tokens are currently declared and referenced by nothing.** A repo-wide search for `--sigmatap-` returns only the seven declarations in `app/globals.css` plus one explanatory comment in `lib/brand.test.ts:180`. There are no consumers, so this task cannot break rendering and no visual regression check is needed.

They are **kept rather than deleted** because Project B (card skins) needs a brand hue — a Scarlet skin is exactly `--connecta-brand` — and deleting them now only to reintroduce them next project is churn. This task renames dead-but-documented tokens; it does not revive them.

- [ ] **Step 1: Rewrite the token block**

In `app/globals.css`, replace lines 103–112. The comment must not say the product name as a bare word — Task 7's guard would flag it.

```css
/* Brand identity — the lettermark struck into a disc. Committed color
     strategy: one saturated brand color carrying real surface area, warm
     neutrals tinted toward its own hue rather than toward generic warmth. */
--connecta-brand: oklch(0.44 0.132 27);
--connecta-brand-hover: oklch(0.39 0.138 27);
--connecta-ink: oklch(0.22 0.012 40);
--connecta-ink-soft: oklch(0.46 0.014 40);
--connecta-paper: oklch(0.985 0.003 60);
--connecta-surface: oklch(0.96 0.005 55);
--connecta-line: oklch(0.9 0.008 50);
```

Also reword the enforced-scales comment found earlier in the file:

```css
/* Enforced scales. Exactly three radii, exactly two elevations. */
```

- [ ] **Step 2: Verify nothing references the old names**

```bash
grep -rn -- "--sigmatap-" app components lib
```

Expected: one match only — the explanatory comment at `lib/brand.test.ts:180`, which Task 7 rewrites.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git add -u
git commit -m "refactor: rename brand tokens to the connecta prefix"
```

---

### Task 5: The mark

> **BLOCKED** until `connecta-mark.svg` and `connecta-icon.svg` are exported from Figma. Every other task can proceed without this one. Do not hand-author the geometry — a high-contrast serif C is not cleanly hand-authorable, unlike the sigma zigzag it replaces.

**Files:**

- Create: `public/brand/connecta-mark.svg`, `public/brand/connecta-icon.svg`
- Create: `components/brand/ConnectaMark.tsx`
- Delete: `components/brand/SigmaTapMark.tsx`, `public/brand/sigmatap-mark.svg`, `public/brand/sigmatap-icon.svg`, `marketing/brand/sigmatap-mark.svg`, `marketing/brand/sigmatap-icon.svg`
- Modify: `scripts/generate-brand-assets.mjs:23,33`
- Modify: every importer of `SigmaTapMark`

**Interfaces:**

- Consumes: `CONNECTA` from Task 1 (for the `title` prop's default usage in callers).
- Produces: `ConnectaMark({ className?: string; title?: string })` — a `<svg>` with `fill="currentColor"`, `role="img"` and `aria-label` when `title` is given, `aria-hidden="true"` when it is not.

- [ ] **Step 1: Place the exported SVGs**

Save the Figma exports to `public/brand/connecta-mark.svg` and `public/brand/connecta-icon.svg`. Both must use `viewBox="0 0 64 64"` and `fill="currentColor"` on the path so the component inherits colour from context.

- [ ] **Step 2: Create the component**

```tsx
/**
 * The product monogram, inlined from the source SVG
 * (public/brand/connecta-mark.svg) so it inherits `currentColor` from
 * context and never issues a network request, unlike an <img>/<Image>
 * reference to the public asset.
 *
 * Do not edit the path geometry here independently of
 * public/brand/connecta-mark.svg — that file is the source of truth; this
 * component is just its inline delivery mechanism.
 */
export function ConnectaMark({
  className,
  title,
}: {
  className?: string;
  /** Accessible name. Omit when the mark sits next to the visible product
   *  name — it's then decorative and hidden from the accessibility tree so
   *  screen readers don't announce the name twice. */
  title?: string;
}) {
  const decorative = !title;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* paste the path element from public/brand/connecta-mark.svg */}
    </svg>
  );
}
```

Note the doc comment says "the product monogram", not the brand name — Task 7's guard scans `components/**` for the bare word.

- [ ] **Step 3: Update the asset generator**

In `scripts/generate-brand-assets.mjs`, line 23 and line 33:

```js
const ICON_SVG_PATH = path.join(root, "public/brand/connecta-icon.svg");
```

```js
const SEAL_RED = "#8a2f22"; // matches --connecta-brand in app/globals.css
```

Also update the file header comment on lines 4 and 7 to name the new SVG files.

- [ ] **Step 4: Update every importer and delete the old files**

```bash
grep -rln "SigmaTapMark" app components lib marketing
```

Rename the import and the JSX tag in each. Then delete the five old asset/component files listed above.

- [ ] **Step 5: Regenerate rasters**

Run: `node scripts/generate-brand-assets.mjs`
Expected: regenerates `app/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/og-fallback.png`.

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: PASS, no unresolved import of `SigmaTapMark`.

- [ ] **Step 7: Commit**

```bash
git add -A public/brand components/brand marketing/brand scripts app/favicon.ico public/*.png
git add -u
git commit -m "feat: replace the sigma monogram with the Connecta lettermark"
```

---

### Task 6: Copy, metadata and docs sweep

**Files:**

- Modify: `package.json` (`name`), `public/manifest.json`, `app/layout.tsx` metadata, `README.md`, `DEVELOPMENT_SETUP.md`, `PRODUCT.md`, `PRODUCTION_UPGRADE_NOTES.md`, `marketing/README.md`, `marketing/brand/brand-sheet.html`, `marketing/*.mjs`, and the remaining app/component/convex files
- Rename: `.superpowers/sdd/sigmatap-rename.md` → `.superpowers/sdd/connecta-rename.md`

**Interfaces:**

- Consumes: `CONNECTA` from Task 1.
- Produces: nothing.

- [ ] **Step 1: Enumerate what is left**

```bash
grep -rli "sigmatap" app components lib convex marketing scripts public README.md DEVELOPMENT_SETUP.md PRODUCT.md PRODUCTION_UPGRADE_NOTES.md package.json
```

- [ ] **Step 2: Replace user-facing copy through the constant, not literals**

Any JSX rendering the name must use `{CONNECTA.name}`, never a bare string. This is the rule the second guard test enforces, and the reason the previous rename stayed cheap.

`package.json` `"name"` becomes `"connecta"`. `public/manifest.json` name/short_name become `Connecta`.

- [ ] **Step 3: Move the rename history out of README**

Delete the history paragraph at `README.md:10-13` and append it to `docs/rename-runbook.md` instead, extended with the fourth stage:

```markdown
## Name history

Tapfolio → Herald → SigmaTap → Connecta. The first change was forced by a
live, unrelated company operating as tapfolio.me. The second retired the
medieval-herald metaphor. The third is the current name; the tagline moved
from "Every tap counts." to "tap.connect.grow.".
```

`docs/` is in the guard's `SKIP_DIRS`, so history lives there without needing an allowlist entry. This is what makes Task 7's zero-exception state reachable.

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: build PASSES. `lib/brand.test.ts` guards still FAIL — Task 7 flips them.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: sweep remaining SigmaTap copy, metadata and docs to Connecta"
```

---

### Task 7: Tighten the guards to zero exceptions

**Files:**

- Modify: `lib/brand.test.ts` — `STALE_BRAND` at line 94, `INFRA_EXCEPTIONS` at line 116, the `--sigmatap-seal` mention in the comment at line 180, `CURRENT_BRAND_WORD` at line 185, `NEW_BRAND_STRING_EXCEPTIONS` at line 192 (file is 225 lines)

**Interfaces:**

- Consumes: everything from Tasks 1–6.
- Produces: the acceptance gate for this project.

**Context for the implementer:** this is the task that makes the rename permanent. After it, three retired brand names are banned repo-wide with no exceptions — a state neither previous rename reached, because both had to keep live literals frozen.

- [ ] **Step 1: Extend the stale-brand regex**

The fragments exist so this file does not match its own check. Keep that trick for the third name:

```ts
// Covers all three retired brand names — this product has been renamed three
// times (Tapfolio -> Herald -> SigmaTap -> Connecta) and none should
// resurface. Built from fragments so this file does not match its own check.
const STALE_BRAND = new RegExp(
  [["tap", "folio"].join(""), ["her", "ald"].join(""), ["sigma", "tap"].join("")].join("|"),
  "i",
);
```

- [ ] **Step 2: Empty both allowlists**

```ts
// Every previous rename had to freeze literals that could not change without
// breaking runtime behaviour: localStorage keys already written to real
// browsers, and deployment hosts printed on shipped NFC cards. A purge on
// 2026-08-31 removed every account but one and left a single test card, so
// no live population sits behind either. Both freezes were lifted with the
// Connecta rename and this allowlist is now empty. Keep it that way: a new
// entry here means a retired brand name is shipping to users again.
const INFRA_EXCEPTIONS: Record<string, string[]> = {};
```

```ts
const NEW_BRAND_STRING_EXCEPTIONS: Record<string, string[]> = {};
```

- [ ] **Step 3: Retarget the current-brand guard**

```ts
// `\bConnecta\b` is deliberately case-sensitive with word boundaries: it does
// NOT match `ConnectaMark` / `buildConnecta` (no boundary between "Connecta"
// and the adjoining word character) or `CONNECTA` / `connecta-mark.svg` /
// `--connecta-brand` (wrong case) — those are legitimate, not brand-string
// leaks. Doc comments must say "the product" rather than the bare name, so
// that no allowlist is needed at all.
const CURRENT_BRAND_WORD = /\bConnecta\b/;
```

Also update the two `expect(...)` failure messages that name `SigmaTap` / `SIGMATAP` so a future failure reads correctly.

- [ ] **Step 4: Run the guards — this is the gate**

Run: `npx vitest run lib/brand.test.ts`
Expected: PASS with zero offenders. If it fails, the message lists exactly which files still carry a retired name or a hardcoded literal. Fix those files — **do not add an allowlist entry**.

- [ ] **Step 5: Full suite and build**

Run: `npm test && npm run build`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/brand.test.ts
git commit -m "test: ban all three retired brand names with no allowlist"
```

---

## Definition of done

- `npx vitest run lib/brand.test.ts` passes with both allowlists empty.
- `grep -ril "sigmatap" app components lib convex marketing scripts public *.md *.json` returns nothing.
- `npm run build` passes and the dashboard plus a public profile page render with brand colour intact.
- Infrastructure (A7) remains untouched and still deferred.
