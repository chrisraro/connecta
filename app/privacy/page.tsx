import type { Metadata } from "next";
import Link from "next/link";
import { CONNECTA } from "@/lib/brand";
import { LegalPage, Section, Callout } from "@/components/legal/LegalPage";

const LAST_UPDATED = "September 27, 2026";

export function generateMetadata(): Metadata {
  return {
    title: `Privacy Policy | ${CONNECTA.name}`,
    description: `How ${CONNECTA.name} collects, uses, shares and protects personal data, and your rights under the Philippine Data Privacy Act of 2012 (RA 10173).`,
  };
}

const TOC = [
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "google", label: "Signing in with Google" },
  { id: "lead-data", label: "Data from people who contact you" },
  { id: "how-we-use-it", label: "How we use it, and why" },
  { id: "sharing", label: "Who we share it with" },
  { id: "international-transfer", label: "Processing outside the Philippines" },
  { id: "retention", label: "How long we keep it" },
  { id: "security", label: "How we protect it" },
  { id: "public-profiles", label: "Public profiles" },
  { id: "your-rights", label: "Your rights" },
  { id: "breaches", label: "Data breaches" },
  { id: "children", label: "Children" },
  { id: "cookies", label: "Cookies and browser storage" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact and complaints" },
];

export default function PrivacyPolicyPage() {
  const email = CONNECTA.supportEmail;
  const mail = <a href={`mailto:${email}`}>{email}</a>;

  return (
    <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED} toc={TOC}>
      <Section id="who-we-are" heading="Who we are">
        <p>
          {CONNECTA.name} is a service for creating digital business card profiles, linking them to
          NFC and QR cards, and receiving inquiries from the people you share them with. It is
          operated by <strong>{CONNECTA.operator.legalName}</strong>, doing business as{" "}
          {CONNECTA.name}, {CONNECTA.operator.address} (&quot;we,&quot; &quot;us&quot;).
        </p>
        <p>
          This policy explains what personal data we collect, why, who we share it with, how long
          we keep it and the rights you have under the{" "}
          <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, its Implementing
          Rules and Regulations, and the issuances of the National Privacy Commission.
        </p>
        <p>
          For the personal data of our account holders, we are the personal information
          controller. Our Data Protection Officer is {CONNECTA.operator.legalName}, reachable at{" "}
          {mail}.
        </p>
      </Section>

      <Section id="what-we-collect" heading="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account data:</strong> your email address and name. If you sign up with a
            password, it is stored only as a one-way hash by our authentication provider; we never
            see it. If you sign in with Google, see the next section.
          </li>
          <li>
            <strong>Profile data</strong> you choose to add: name, job title, company, phone
            numbers, email addresses, website and social links, a short bio, photos, services,
            and, if you add them, an address, education, work history, testimonials and a gallery.
          </li>
          <li>
            <strong>Card data:</strong> each card&apos;s identifier and activation code, which
            profile it opens, and a count of how often it has been tapped.
          </li>
          <li>
            <strong>Leads:</strong> the name, contact details and message someone sends you
            through your profile (see &quot;Data from people who contact you&quot;).
          </li>
          <li>
            <strong>Order and billing details</strong> when you buy a card or a paid plan: your
            name, contact details and delivery address, which we record when we arrange the order
            with you. We do not collect or store card or e-wallet credentials.
          </li>
          <li>
            <strong>Team data:</strong> the email addresses of teammates you invite.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser details and request logs kept by
            our hosting and database providers to run the service and protect it from abuse. The
            public contact form uses the sender&apos;s IP address to limit how often it can be
            sent.
          </li>
        </ul>
      </Section>

      <Section id="google" heading="Signing in with Google">
        <p>
          If you choose &quot;Continue with Google,&quot; Google shares the following with us, and
          only this: your <strong>name</strong>, <strong>email address</strong>,{" "}
          <strong>profile picture</strong> and your Google account identifier (the{" "}
          <code>openid</code>, <code>email</code> and <code>profile</code> permissions). We do not
          request access to your Gmail, contacts, calendar, Drive or any other Google data.
        </p>
        <p>
          We use this information only to create your {CONNECTA.name} account, sign you in, and
          pre-fill your name and photo, which you can change. We do not sell it, use it for
          advertising, or use it to train artificial intelligence models, and we share it only
          with the service providers listed below that run {CONNECTA.name}.
        </p>
        <Callout>
          {CONNECTA.name}&apos;s use and transfer of information received from Google APIs will
          adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </Callout>
        <p>
          You can remove {CONNECTA.name}&apos;s access at any time from your Google Account&apos;s
          &quot;Third-party apps &amp; services&quot; page. Deleting your {CONNECTA.name} account
          (see &quot;Your rights&quot;) deletes the data we received from Google.
        </p>
      </Section>

      <Section id="lead-data" heading="Data from people who contact you">
        <p>
          When someone taps your card or opens your profile and sends you their details, we store
          their name, contact details and message as a &quot;lead&quot; in your account and may
          email you a notification. The form asks for their consent first, and we record when they
          gave it and to which wording.
        </p>
        <p>
          For that data, <strong>you, the profile owner, are the personal information
          controller</strong>: you decide to collect it and what to do with it.{" "}
          {CONNECTA.name} is your <strong>personal information processor</strong>: we store it on
          your behalf and give you tools to view, follow up, export and delete it, and we do not
          use it for any purpose of our own.
        </p>
        <p>
          If you capture a lead yourself while offline, it is kept temporarily in your browser,
          under your account only, until it syncs to your account.
        </p>
        <p>
          If you sent your details to a {CONNECTA.name} user and want them corrected or deleted,
          contact that user. If you can&apos;t reach them, email us at {mail} and we will help.
        </p>
      </Section>

      <Section id="how-we-use-it" heading="How we use it, and why">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            To create your account, host your public profile, link your cards to it and deliver
            your leads. <em>Basis: to provide the service you signed up for (contract).</em>
          </li>
          <li>
            To send the emails the service depends on: lead notifications, sign-up confirmation,
            password resets and order updates. <em>Basis: contract.</em>
          </li>
          <li>
            To process card orders and paid plans, and keep the records tax and accounting law
            require. <em>Basis: contract and legal obligation.</em>
          </li>
          <li>
            To keep the service secure: rate-limiting the contact form, preventing abuse, and
            keeping an audit log of administrative actions on accounts and cards.{" "}
            <em>Basis: our legitimate interest in a secure service.</em>
          </li>
          <li>
            To collect the details of people who contact you through your profile.{" "}
            <em>Basis: their consent, given when they choose to send the form.</em>
          </li>
        </ul>
        <p>
          We do not sell personal data, show advertising, or use your profile or lead data to
          train artificial intelligence models.
        </p>
      </Section>

      <Section id="sharing" heading="Who we share it with">
        <p>
          We share personal data only with the providers that run {CONNECTA.name}, each limited to
          its own function:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> — sign-in, database and file storage. Everything described
            above is stored here.
          </li>
          <li>
            <strong>Vercel</strong> — hosts and serves the website and app.
          </li>
          <li>
            <strong>Resend</strong> — sends our transactional emails.
          </li>
          <li>
            <strong>Google</strong> — only if you choose to sign in with Google.
          </li>
          <li>
            <strong>DiceBear</strong> — draws a default avatar when a profile has no photo. It
            receives the name shown on that profile, only to pick the avatar&apos;s look, and
            never your email or contact details. Adding a photo stops this.
          </li>
        </ul>
        <p>
          We may also disclose personal data when the law requires it, for example to comply with
          a court order, or to protect the rights and safety of our users.
        </p>
      </Section>

      <Section id="international-transfer" heading="Processing outside the Philippines">
        <p>
          Our providers operate servers outside the Philippines, so your data may be stored and
          processed abroad. Under Section 21 of RA 10173 we remain accountable for it wherever it
          is processed, and we use providers bound by contractual data protection commitments.
        </p>
      </Section>

      <Section id="retention" heading="How long we keep it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account and profile data:</strong> until you delete your account.
          </li>
          <li>
            <strong>Leads:</strong> until you delete them, or your account is deleted.
          </li>
          <li>
            <strong>Offline leads in your browser:</strong> until they sync, or until you delete
            your account on that device.
          </li>
          <li>
            <strong>Order and payment records</strong> (kept outside the app): for as long as
            Philippine tax and accounting law requires, even after your account is deleted.
          </li>
          <li>
            <strong>Audit log entries about your account:</strong> deleted with your account.
          </li>
        </ul>
        <p>
          Copies in our providers&apos; routine backups are overwritten on their normal backup
          cycle.
        </p>
      </Section>

      <Section id="security" heading="How we protect it">
        <ul className="list-disc space-y-2 pl-5">
          <li>All traffic is encrypted in transit (HTTPS).</li>
          <li>
            Database access rules let each account read and change only its own data, except
            published profiles, which are public by design.
          </li>
          <li>Passwords are stored only as one-way hashes by our authentication provider.</li>
          <li>
            A password reset needs a short-lived, signed link, and signs you out of every other
            device.
          </li>
          <li>The public contact form is rate-limited against spam and abuse.</li>
        </ul>
        <p>
          No system is perfectly secure. We do not claim security certifications we have not
          obtained.
        </p>
      </Section>

      <Section id="public-profiles" heading="Public profiles">
        <p>
          A published profile is public to anyone with its link or card. That is its purpose, and
          link previews in chat apps and social media will show it. Search engines may index it.
          Don&apos;t put anything on your profile that you don&apos;t want to be public.
        </p>
      </Section>

      <Section id="your-rights" heading="Your rights">
        <p>Under RA 10173 you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>be informed about how your personal data is processed (this policy);</li>
          <li>access the personal data we hold about you;</li>
          <li>object to processing, and withdraw consent where processing relies on it;</li>
          <li>have inaccurate data corrected;</li>
          <li>have your data erased or blocked, subject to legal retention duties;</li>
          <li>receive a copy of your data in a portable electronic format;</li>
          <li>claim damages for harm caused by unlawful processing; and</li>
          <li>file a complaint with the National Privacy Commission.</li>
        </ul>
        <p>
          <strong>To delete your account</strong>, go to <strong>Settings → Delete account</strong>
          . This permanently erases your account, profiles and leads. Cards you own return to
          unassigned stock, so they stop opening your profile. For any other request, email {mail}{" "}
          from the address on your account. We will confirm it is you before acting, and respond
          within the period the law requires.
        </p>
      </Section>

      <Section id="breaches" heading="Data breaches">
        <p>
          If a breach of personal data is likely to put you at real risk of serious harm, we will
          notify the National Privacy Commission and the people affected within 72 hours of
          becoming aware of it, as NPC rules require.
        </p>
      </Section>

      <Section id="children" heading="Children">
        <p>
          {CONNECTA.name} is for professional use and is not meant for anyone under 18. We do not
          knowingly collect a child&apos;s personal data. If you believe a child has given us
          personal data, email {mail} and we will delete it.
        </p>
      </Section>

      <Section id="cookies" heading="Cookies and browser storage">
        <p>
          We use no advertising or analytics cookies. We only use what the service needs to work:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Sign-in cookies</strong> that keep you signed in, and a short-lived cookie
            that lets you set a new password after a reset.
          </li>
          <li>
            <strong>Browser storage</strong> for your light or dark theme, a guest shopping
            selection, and leads captured offline (kept per account until they sync).
          </li>
        </ul>
        <p>
          These are strictly necessary for the features you use, so we don&apos;t ask for separate
          consent. If we ever add analytics or marketing cookies, we will update this section and
          ask first.
        </p>
      </Section>

      <Section id="changes" heading="Changes to this policy">
        <p>
          When the product changes, this policy will too. We will update the date at the top and,
          for material changes, tell account holders by email or in the app before they take
          effect.
        </p>
      </Section>

      <Section id="contact" heading="Contact and complaints">
        <p>
          <strong>Data Protection Officer:</strong> {CONNECTA.operator.legalName},{" "}
          {CONNECTA.operator.address}. Email: {mail}.
        </p>
        <p>
          If you believe your data has been mishandled, contact us first so we can fix it. You may
          also file a complaint with the <strong>National Privacy Commission</strong> at{" "}
          <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">
            privacy.gov.ph
          </a>
          .
        </p>
        <p className="text-sm">
          See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
