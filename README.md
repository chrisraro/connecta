# Connecta

Connecta is a premium NFC digital business card platform. A user taps a
physical Connecta card (or lets someone scan its QR code) to instantly share
a branded profile, and every visit can capture a lead straight into the
user's dashboard.

The name is the product's promise in one word: a tap turns a stranger into
a connection. Tagline: "tap.connect.grow." (See `docs/rename-runbook.md`
for the full naming history.)

The app is Next.js (App Router) on Vercel, with Supabase for the database,
auth and file storage, and Resend for lead-notification email. It also
includes a small shop for ordering physical NFC cards. There is no payment
gateway: plan upgrades and card orders are arranged directly, and admins set
plans from the console.

## Setup

**[SETUP.md](SETUP.md)** is the full guide: Supabase dashboard settings,
Vercel environment variables, the first admin account, and a go-live
checklist. The short version for local development:

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Everything runs in one
Next.js process; there is no separate backend to start.

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

See [SETUP.md](SETUP.md). The three things most likely to go wrong:

1. **Custom SMTP is not optional.** Supabase's built-in sender only emails
   members of your Supabase organization, so without it nobody else can
   confirm a sign-up.
2. **`SUPABASE_SERVICE_ROLE_KEY` must be set in Vercel.** Inquiry forms depend
   on it.
3. **`NEXT_PUBLIC_APP_URL` is written onto every NFC card.** Set the real
   domain before programming any.

## Project structure

- `app/` - Next.js App Router pages and route handlers (landing page,
  dashboard, admin console and NFC factory, shop, public profiles, auth,
  `/api/leads`, `/api/health`)
- `supabase/migrations/` - the entire backend: schema, row-level security,
  and the database functions every write goes through
- `hooks/` - data access (TanStack Query over the Supabase client)
- `lib/supabase/` - Supabase clients and the generated database types
  (`npm run db:types` regenerates them)
- `components/` - shared UI and profile-builder components
- `lib/` - shared utilities (brand constants, plan limits, NFC helpers, etc.)
- `types/` - shared TypeScript types
