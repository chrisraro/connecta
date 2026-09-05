# Connecta

Connecta is a premium NFC digital business card platform. A user taps a
physical Connecta card (or lets someone scan its QR code) to instantly share
a branded profile, and every visit can capture a lead straight into the
user's dashboard.

The name is the product's promise in one word: a tap turns a stranger into
a connection. Tagline: "tap.connect.grow." (See `docs/rename-runbook.md`
for the full naming history.)

The app is a Next.js (App Router) frontend backed by Convex, with Clerk for
auth, Resend for transactional email, and PayRex for Philippine payment
processing (GCash, Maya, cards, QR Ph). It also includes a small e‑commerce
shop for ordering physical NFC cards.

## Prerequisites

- Node.js 20+
- A [Convex](https://www.convex.dev/) account (free tier is fine for dev)
- A [Clerk](https://clerk.com/) application (for authentication)
- A [Resend](https://resend.com/) account (for lead-notification and
  order-confirmation emails) — optional for local dev, required for real
  email delivery
- A [PayRex](https://payrexhq.com/) account (for billing/checkout) — optional
  for local dev, required to accept real payments

## Environment setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

**These two runtimes are separate and do not share environment variables.**
Next.js (this repo's `app/`, deployed to Vercel) reads `.env.local` / the
Vercel project's env settings. Convex (`convex/*.ts` — actions and mutations,
run in Convex's own sandboxed backend) reads only what you push with
`npx convex env set`. Setting a Convex-runtime variable in Vercel does
nothing for that code, and vice versa — see the "Convex runtime" column
below for which command actually sets each one.

| Variable                            | Where it comes from                                  | Required for                                                                                                       | Set with                                                                                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys                           | Sign-in/sign-up                                                                                                    | Next.js/Vercel env                                                                                                                                                                                                                                  |
| `CLERK_SECRET_KEY`                  | Clerk Dashboard → API Keys                           | Sign-in/sign-up                                                                                                    | Next.js/Vercel env                                                                                                                                                                                                                                  |
| `NEXT_PUBLIC_APP_URL`               | Your app's base URL (`http://localhost:3000` in dev) | Payment redirect/callback URLs, `metadataBase`, `lib/brand.ts`'s domain                                            | **Both**: Next.js/Vercel env **and** `npx convex env set` (`convex/payrex.ts` and `convex/billing.ts` read it directly via `process.env.NEXT_PUBLIC_APP_URL` when building PayRex checkout redirect URLs — it is not implicitly shared from Vercel) |
| `SUPPORT_EMAIL`                     | Your real support inbox                              | Order-confirmation email footer (`convex/email.ts`) — optional, falls back to `support@<NEXT_PUBLIC_APP_URL host>` | **`npx convex env set`** (read inside `convex/email.ts`, not by Next.js)                                                                                                                                                                            |
| `NEXT_PUBLIC_CONVEX_URL`            | Set automatically by `npx convex dev`                | Talking to your Convex deployment                                                                                  | Next.js/Vercel env                                                                                                                                                                                                                                  |
| `CONVEX_DEPLOYMENT`                 | Set automatically by `npx convex dev`                | Convex CLI/deploy targeting                                                                                        | Next.js/Vercel env                                                                                                                                                                                                                                  |
| `RESEND_API_KEY`                    | Resend Dashboard → API Keys                          | Lead notification & order confirmation emails                                                                      | **`npx convex env set`**                                                                                                                                                                                                                            |
| `PAYREX_SECRET_KEY`                 | PayRex Dashboard → API Keys                          | Creating checkout sessions (`convex/billing.ts`, `convex/payrex.ts`)                                               | **`npx convex env set`**                                                                                                                                                                                                                            |
| `PAYREX_WEBHOOK_SECRET`             | PayRex Dashboard → Webhooks                          | Verifying webhook signatures (`convex/http.ts`)                                                                    | **`npx convex env set`**                                                                                                                                                                                                                            |

Without `RESEND_API_KEY` set, email sends are skipped (a warning is logged)
rather than failing. Without the `PAYREX_*` vars, billing/checkout actions
throw a clear "not configured" error instead of silently failing.

**Known gap:** even with `RESEND_API_KEY` set, `convex/email.ts` currently
sends from Resend's sandbox address (`onboarding@resend.dev`), which only
delivers to the Resend account owner — not to real customers. A verified
sending domain needs to be configured in Resend before email notifications
will reach anyone else. See the `TODO(ops)` comments in `convex/email.ts`.

## Install & run

```bash
npm install
npx convex dev    # provisions/starts your Convex dev deployment, keep this running
npm run dev       # in a second terminal, starts the Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm run test         # runs the full Vitest suite once
npm run test:watch   # watch mode
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Deploying

Two separate places need env vars — see the table above for which var goes
where. In short: `RESEND_API_KEY` and the `PAYREX_*` secrets are Convex-runtime
vars pushed with `npx convex env set ... --prod`; everything else
(`NEXT_PUBLIC_*`, `CLERK_SECRET_KEY`) is a Next.js/Vercel var configured in
the Vercel project settings — **except `NEXT_PUBLIC_APP_URL`, which despite
its `NEXT_PUBLIC_` prefix must be set in both places** (see the table above).
Putting the Convex ones in Vercel instead is a deploy that silently ships
with email and checkout both as no-ops.

1. **Convex**: run `npx convex deploy` to push your schema/functions to a
   production Convex deployment, and note the production `NEXT_PUBLIC_CONVEX_URL`
   / `CONVEX_DEPLOYMENT` it prints. Then push the Convex-runtime secrets to
   that same production deployment:
   ```bash
   npx convex env set RESEND_API_KEY <value> --prod
   npx convex env set PAYREX_SECRET_KEY <value> --prod
   npx convex env set PAYREX_WEBHOOK_SECRET <value> --prod
   npx convex env set NEXT_PUBLIC_APP_URL <value> --prod
   npx convex env set SUPPORT_EMAIL <value> --prod   # optional
   ```
   `NEXT_PUBLIC_APP_URL` needs to be set **twice** — once here for Convex
   (checkout redirect URLs) and again in the Vercel project settings (step 5)
   for Next.js. They are separate runtimes with separate env stores; setting
   it in only one place leaves the other half of the app pointed at nothing.
   If this deploy is the first one to ship vanity-slug profile URLs, also
   run the one-time (idempotent, safe to re-run) backfill so profiles created
   before the feature existed get a slug. It is paginated — keep calling it,
   passing the returned `cursor` back in, until it reports `"isDone": true`:
   ```bash
   npx convex run profiles:internalBackfillSlugs '{}' --prod
   # -> { "scanned": 200, "backfilled": 200, "isDone": false, "cursor": "..." }
   npx convex run profiles:internalBackfillSlugs '{"cursor":"<cursor>"}' --prod
   # repeat until "isDone": true
   ```
2. **Clerk**: switch to a production Clerk instance and update the
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` Next.js/Vercel env
   vars accordingly.
3. **Resend**: verify a real sending domain in the Resend dashboard, then
   update the `from:` addresses in `convex/email.ts` to use it (see the
   `TODO(ops)` comments there).
4. **PayRex**: use your live `PAYREX_SECRET_KEY` and register the production
   webhook endpoint — `https://<your-convex-deployment>.convex.site/webhooks/payrex`
   (see `convex/http.ts`) — to get a live `PAYREX_WEBHOOK_SECRET`.
5. Deploy the Next.js app (e.g. to [Vercel](https://vercel.com)) with the
   Next.js/Vercel env vars from the table above configured — `NEXT_PUBLIC_APP_URL`
   set to your production URL, plus the Clerk and Convex-URL vars. Do **not**
   put `RESEND_API_KEY` / `PAYREX_*` here; they belong to Convex, set in step 1.

## Project structure

- `app/` — Next.js App Router pages (landing page, dashboard, admin, shop,
  public profile pages, auth)
- `convex/` — backend: schema, queries/mutations/actions, billing, email,
  PayRex webhook handling
- `components/` — shared UI and profile-builder components
- `lib/` — shared utilities (brand constants, plan limits, sanitization, etc.)
- `types/` — shared TypeScript types
