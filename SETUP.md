# Setup and deployment

Everything needed to take this repository to a working deployment: the
Supabase dashboard settings, the Vercel environment, the first admin, and a
checklist to prove it works. Do the sections in order.

The app is Next.js on Vercel with Supabase for the database, auth and file
storage. There is no other backend, no payment gateway, and no Google Cloud
project: **no GCP credentials are needed** (see
[Optional: Google sign-in](#optional-google-sign-in) if you want to add it).

---

## 1. Supabase project

Project ref: `szfkysqinjowmgdzonje` (in `package.json` → `db:types`).

### 1.1 Keep it awake

Free-tier projects **pause after about a week without traffic**. A paused
project's hostname stops resolving at all, so every page fails. Before a demo:
Dashboard → project → **Restore project** if it shows as paused, and give it a
few minutes. For anything customer-facing, move to a paid plan, which does not
pause.

### 1.2 Database schema

Every migration in `supabase/migrations/` is applied to the project. For a
new project, apply them in filename order (`supabase db push`, or paste each
into the SQL editor). Tables, security rules, functions and the
`profile-images` storage bucket all come from these files; there is nothing to
click-configure under Database or Storage.

### 1.3 Authentication → Sign In / Providers → Email

| Setting                 | Value            | Why                                                                                                                                                                                                                                 |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enable email provider   | **On**           | The only sign-in method.                                                                                                                                                                                                            |
| **Confirm email**       | **On, required** | The first admin is granted when `connectaphnfc@gmail.com` is _confirmed_ (migration 13). With confirmation off, Supabase marks every address confirmed at signup, so **anyone could register that address and receive superadmin.** |
| Minimum password length | 8 or more        | Your choice.                                                                                                                                                                                                                        |

### 1.4 Authentication → Emails → SMTP Settings: required for a demo

Supabase's built-in sender **only delivers to members of your Supabase
organization** ([docs](https://supabase.com/docs/guides/auth/auth-smtp)).
Because confirmation is on, anyone else who signs up never gets the link and
can never sign in. That includes demo guests, and it includes
`connectaphnfc@gmail.com` unless you invite it to the org.

Set up a custom SMTP server. Either works:

- **Quickest, for a demo: Gmail.** On the Google account that will send
  (e.g. `connectaphnfc@gmail.com`), turn on 2-Step Verification, then create
  an **App password** (Google Account → Security → App passwords).

  | Field        | Value                         |
  | ------------ | ----------------------------- |
  | Host         | `smtp.gmail.com`              |
  | Port         | `465`                         |
  | Username     | the full Gmail address        |
  | Password     | the 16-character app password |
  | Sender email | the same Gmail address        |
  | Sender name  | `Connecta`                    |

  Gmail caps sending at roughly 500 messages a day. Fine for a demo, not for
  launch.

- **For production: Resend.** Verify your domain in Resend first. Without a
  verified domain, Resend only delivers to its own account owner. Then use
  host `smtp.resend.com`, port `465`, username `resend`, and your Resend API
  key as the password.

Once custom SMTP is on, Supabase starts at **30 emails per hour**. Raise it
under Authentication → Rate Limits if a demo will have many sign-ups at once.

### 1.5 Authentication → URL Configuration

| Setting       | Value                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Site URL      | your production URL, e.g. `https://connecta.example.com`                              |
| Redirect URLs | `https://connecta.example.com/auth/callback**`                                        |
|               | `http://localhost:3000/auth/callback**`                                               |
|               | `https://*-<your-vercel-team>.vercel.app/auth/callback**` (preview deploys, optional) |

The confirmation link sends people to `/auth/callback`, which exchanges the
code for a session. A URL missing from this list is rejected, and the link
falls back to the Site URL without signing anyone in.

### 1.6 Keys

Project Settings → **API Keys**. You need two values for Vercel:

- the **publishable** key (`sb_publishable_…`), or the legacy `anon` key
- the **secret** key (`sb_secret_…`), or the legacy `service_role` key

The secret key bypasses every security rule in the database. It belongs in
exactly one place, the Vercel variable below, and never anywhere with
`NEXT_PUBLIC_` in front of it.

---

## 2. Vercel

Project → Settings → **Environment Variables**. The same list is documented
in `.env.example`, which you copy to `.env.local` for local development.

| Variable                               | Value                                      | Environments        | Notes                                                                                                                  |
| -------------------------------------- | ------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://szfkysqinjowmgdzonje.supabase.co` | All                 |                                                                                                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key from 1.6                   | All                 | Safe in the browser.                                                                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`            | secret key from 1.6                        | Production, Preview | Mark **Sensitive**. **Without it, every inquiry form returns an error** and account deletion cannot remove the login.  |
| `NEXT_PUBLIC_APP_URL`                  | production URL, no trailing slash          | Production          | Also the host **burned into NFC tags** by the factory. See the warning below.                                          |
| `RESEND_API_KEY`                       | Resend API key                             | Production, Preview | Emails profile owners about new leads. Without it, leads still save and still notify in-app.                           |
| `RESEND_FROM_EMAIL`                    | e.g. `Connecta <hello@yourdomain.com>`     | Production          | Only once a domain is verified in Resend. Until then the default sender delivers **only to the Resend account owner**. |
| `SUPPORT_EMAIL`                        | your support inbox                         | Production          | Optional. Defaults to `support@<app domain>`.                                                                          |

> **`NEXT_PUBLIC_APP_URL` is permanent for every card you write.** The NFC
> factory encodes `<NEXT_PUBLIC_APP_URL>/t/<serial>` onto each physical tag,
> and a written tag cannot be changed without rewriting it by hand. Set the
> real production domain _before_ programming cards, and keep that domain
> pointed at this app for as long as cards are in circulation. The factory
> refuses to write when the variable is unset and warns when it is
> `localhost`.

`NEXT_PUBLIC_*` values are inlined **at build time**, so **redeploy after
changing any of them**. Saving the variable alone changes nothing.

Build settings need no changes: framework preset Next.js, `npm run build`,
Node 20 or later.

---

## 3. First admin

`connectaphnfc@gmail.com` is pre-registered to become **superadmin** the first
time that address is confirmed. The grant fires once.

1. Make sure 1.3 and 1.4 are done.
2. Sign up at `/auth?mode=signup` with `connectaphnfc@gmail.com`.
3. Click the confirmation link in that inbox.
4. Sign in. You land on `/admin`.

If the confirmation email never arrives (SMTP not set up yet), an operator can
confirm the account by hand: Supabase → Authentication → Users → the user →
**Confirm email**. That fires the same grant.

Further admins are granted from the console: Admin → Users → Manage →
Grant moderator / Grant superadmin.

---

## 4. Running the business without a payment gateway

There is no checkout. Plans and card orders are arranged directly:

- **Plans:** Admin → Users → Manage → _Pro · 30 days_, _Business · 1 year_,
  and so on. Renewing extends from the current expiry. The first Business
  grant creates the customer's team. _Downgrade to Free_ keeps the team for
  later. Every change is recorded in Admin → Audit.
- **Card orders:** the shop's cart ends in _Send Purchase Inquiry_, an email
  to you with the exact list.
- **Expiry:** a plan past its expiry plus 3 days of grace is treated as Free
  everywhere, immediately, with no job needed. The admin Users list marks such
  accounts "lapsed · on Free".

---

## 5. Go-live checklist

Run through this on the deployed URL.

- [ ] `https://<domain>/api/health` returns `200` with `"database": true` and
      `SUPABASE_SERVICE_ROLE_KEY: true` under `config`.
- [ ] Sign up with a **non-team** address and receive the confirmation email.
      This proves 1.4.
- [ ] Sign in as `connectaphnfc@gmail.com` and land on `/admin`.
- [ ] **Factory:** Admin → Factory, on Chrome for Android. Scan a blank tag,
      then see the print dialog with a 6-character activation code.
- [ ] **Tap test:** tap that tag with a phone that is signed out. You should
      reach sign-up with the card attached. After signing up, the card appears
      under Dashboard → Cards.
- [ ] **Cutover tag `43:45:08:03`:** it was programmed before the migration.
      Register it again (Factory → manual entry, serial `43:45:08:03`), then
      tap it.
- [ ] Build a profile, link the card, and tap again. The tap should open the
      public profile.
- [ ] Submit the profile's contact form while signed out. The lead appears in
      Dashboard → Leads, and the owner gets an email (subject to the Resend
      note above).
- [ ] Admin → Users → give the test account _Business · 30 days_. Dashboard →
      Team now shows the team.

---

## Optional: Google sign-in

Not built. The sign-in form is email and password only. Adding Google would
take:

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID**
   (Web application), with the authorized redirect URI
   `https://szfkysqinjowmgdzonje.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → **Google**, pasting that client ID
   and secret.
3. A "Continue with Google" button calling
   `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: <origin>/auth/callback } })`.
   `/auth/callback` already handles the code exchange.

Google verifies the address itself, so a Google sign-in with
`connectaphnfc@gmail.com` also triggers the admin grant.
