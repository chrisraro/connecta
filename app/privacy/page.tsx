import type { Metadata } from "next";
import Link from "next/link";
import { CONNECTA } from "@/lib/brand";
import { LegalPage, Section, Callout, Placeholder } from "@/components/legal/LegalPage";

const LAST_UPDATED = "July 31, 2026";

export function generateMetadata(): Metadata {
  return {
    title: `Privacy Policy | ${CONNECTA.name}`,
    description: `How ${CONNECTA.name} collects, uses, and protects personal data under the Philippine Data Privacy Act (RA 10173) — draft pending legal review.`,
  };
}

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "lead-data", label: "Data from people who tap your card" },
  { id: "how-we-use-it", label: "How we use it" },
  { id: "sub-processors", label: "Who we share it with" },
  { id: "international-transfer", label: "International transfer" },
  { id: "retention", label: "Retention" },
  { id: "security", label: "Security measures" },
  { id: "public-profiles", label: "Public profiles" },
  { id: "your-rights", label: "Your rights under RA 10173" },
  { id: "children", label: "Children's data" },
  { id: "cookies", label: "Cookies" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact & complaints" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED} toc={TOC}>
      <Section id="overview" heading="Overview">
        <p>
          {`${CONNECTA.name} ("we," "us")`} operates a service for creating and sharing NFC-enabled
          digital business card profiles. This policy explains what personal data the product
          actually collects, why, who it is shared with, and the rights individuals have under the
          Philippine{" "}
          <strong>Data Privacy Act of 2012 (Republic Act No. 10173, &quot;RA 10173&quot;)</strong>{" "}
          and its Implementing Rules and Regulations.
        </p>
        <p>
          This policy is written to match the codebase as audited, not a generic template. Where a
          fact is missing — a legal entity name, a registered address, a Data Protection Officer —
          it is marked with a bracketed placeholder such as{" "}
          <Placeholder>[COMPANY LEGAL NAME]</Placeholder> rather than invented, so nobody mistakes a
          placeholder for a verified fact.
        </p>
        <p>
          Data controller: <Placeholder>[COMPANY LEGAL NAME]</Placeholder>,{" "}
          <Placeholder>[REGISTERED ADDRESS]</Placeholder>, National Privacy Commission registration
          number <Placeholder>[NPC REGISTRATION NUMBER, IF APPLICABLE]</Placeholder>.
        </p>
      </Section>

      <Section id="what-we-collect" heading="What we collect">
        <p>We collect the following categories of personal data:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account data</strong> (via Clerk authentication): email address, name, and
            profile avatar.
          </li>
          <li>
            <strong>Onboarding &amp; profile data</strong> you enter to build your card: full name,
            job title, company, phone number, website, a short biography, avatar image, services
            offered, and social links, plus (for full profiles) additional phone numbers, additional
            emails, a physical address, education history, work experience, testimonials, and a
            photo gallery.
          </li>
          <li>
            <strong>Order data</strong> if you buy a physical card: a guest email if you check out
            without an account, and shipping/billing address details (name, address lines, city,
            province, postal code, country, phone).
          </li>
          <li>
            <strong>Card data</strong>: a unique card identifier, activation code, and a tap counter
            used to show you how often your card has been tapped.
          </li>
          <li>
            <strong>Team data</strong>: if you invite teammates on a Business plan, we store the
            invitee&apos;s email address.
          </li>
        </ul>
      </Section>

      <Section id="lead-data" heading="Data from people who tap your card">
        <p>
          <strong>
            This is the most sensitive category of data {CONNECTA.name} handles, and it belongs to
            people who have never signed up for {CONNECTA.name}.
          </strong>{" "}
          When someone taps your card or visits your public profile and fills out the contact form,
          we capture their name, contact details, and any message they write, and store it as a
          &quot;lead&quot; attached to your account.
        </p>
        <p>
          Under RA 10173, <strong>you — the profile owner</strong> — are the{" "}
          <strong>personal information controller</strong> for that inquirer&apos;s data: you decide
          to collect it (by publishing a contact form), you decide what to do with it (follow up,
          ignore it, delete it), and you are responsible for handling it lawfully.
          {CONNECTA.name} acts as your <strong>personal information processor</strong>: we store the
          data on your behalf and give you tools to view and manage it, but we do not decide why it
          is collected or how it is used.
        </p>
        <p>
          If you collect leads through your {CONNECTA.name} profile, you are responsible for having
          a lawful basis to do so (typically the inquirer&apos;s consent, implied by them
          voluntarily submitting the form) and for not misusing the data you receive.
        </p>
      </Section>

      <Section id="how-we-use-it" heading="How we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create, host, and render your public profile.</li>
          <li>To authenticate you and keep your account secure (via Clerk).</li>
          <li>To process and fulfil physical card orders, including payment and shipping.</li>
          <li>
            To send transactional email — lead notifications and order confirmations — via our email
            provider.
          </li>
          <li>
            To enforce plan limits (e.g. the number of leads visible on the free tier) and prevent
            abuse of the public lead-capture form.
          </li>
          <li>
            To maintain an internal audit log of certain account and admin actions for security and
            accountability purposes.
          </li>
        </ul>
        <p>
          We do not sell personal data, and we do not use profile or lead data to train third-party
          AI models.
        </p>
      </Section>

      <Section id="sub-processors" heading="Who we share it with">
        <p>
          {CONNECTA.name} runs on a small number of named infrastructure providers. Each processes
          personal data only to provide its specific function, under its own contract with us:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Clerk</strong> (clerk.com) — authentication; stores your email, name, and avatar
            and manages login sessions.
          </li>
          <li>
            <strong>Convex</strong> (convex.dev) — our database and file storage host; every record
            described above is stored here.
          </li>
          <li>
            <strong>PayRex</strong> (payrexhq.com) — payment processing for card purchases and plan
            subscriptions (GCash, Maya, card, and QR Ph). PayRex, not {CONNECTA.name}, handles your
            card/payment credentials directly.
          </li>
          <li>
            <strong>Resend</strong> — delivery of transactional email (lead notifications, order
            confirmations).
          </li>
          <li>
            <strong>Vercel</strong> — application hosting.
          </li>
          <li>
            <strong>DiceBear</strong> — generates a placeholder avatar image when you have not
            uploaded one. No personal data is sent to DiceBear beyond a non-reversible seed value.
          </li>
        </ul>
      </Section>

      <Section id="international-transfer" heading="International transfer">
        <p>
          The sub-processors above are US-based companies, meaning personal data collected in the
          Philippines is processed on servers outside the Philippines. RA 10173 permits this where
          the receiving party is bound to provide a comparable level of protection, typically
          through contractual safeguards (each provider&apos;s own data processing agreement). We
          have not independently audited each provider&apos;s certifications; this section will be
          updated once that review is complete:{" "}
          <Placeholder>[SUB-PROCESSOR DPA / CROSS-BORDER TRANSFER REVIEW STATUS]</Placeholder>.
        </p>
      </Section>

      <Section id="retention" heading="Retention">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account and profile data</strong> is retained for as long as your account
            exists.
          </li>
          <li>
            <strong>Lead data</strong> is retained for as long as your account exists, or until you
            delete individual leads yourself.
          </li>
          <li>
            <strong>Order records</strong> are retained to satisfy tax, accounting, and
            consumer-protection obligations even after account deletion (see below).
          </li>
          <li>
            <strong>Audit logs</strong> are retained independently of account deletion — see
            &quot;Account deletion&quot; below for why.
          </li>
        </ul>
        <p>
          A precise retention schedule (e.g. &quot;N days after last activity&quot;) has not yet
          been formally adopted: <Placeholder>[FORMAL RETENTION SCHEDULE]</Placeholder>.
        </p>
      </Section>

      <Section id="security" heading="Security measures">
        <p>We describe only measures verified in the current codebase:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>All traffic is served over HTTPS.</li>
          <li>The public lead-capture form is rate-limited to reduce automated abuse and spam.</li>
          <li>
            Payment webhooks from PayRex are verified using an HMAC signature before any payment or
            order state is trusted.
          </li>
          <li>
            Authentication, session management, and credential storage are handled entirely by
            Clerk; {CONNECTA.name} never sees or stores your password.
          </li>
        </ul>
        <Callout>
          We do <strong>not</strong> claim encryption-at-rest, SOC 2, ISO 27001, or any other
          certification for our own infrastructure unless and until it has been independently
          verified — those claims will be added here only when true. Placeholder for any future
          certification: <Placeholder>[CERTIFICATIONS, IF/WHEN OBTAINED]</Placeholder>.
        </Callout>
      </Section>

      <Section id="public-profiles" heading="Public profiles are public">
        <p>
          A published {CONNECTA.name} profile (at a URL like{" "}
          <code className="rounded-[var(--r-sm)] bg-muted px-1 py-0.5 text-[0.9em]">
            /your-slug
          </code>
          ) is deliberately public to anyone with the link — that is the point of a digital business
          card. It is server-rendered with OpenGraph metadata specifically so that link previews (in
          messaging apps, social media, etc.) work correctly. Do not put anything in your profile
          that you do not want to be publicly visible and indexable.
        </p>
      </Section>

      <Section id="your-rights" heading="Your rights under RA 10173">
        <p>As a data subject under RA 10173, you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Be informed</strong> that your personal data will be, is being, or has been
            processed (this policy is part of that).
          </li>
          <li>
            <strong>Access</strong> your personal data that we hold.
          </li>
          <li>
            <strong>Correct</strong> inaccurate or outdated personal data.
          </li>
          <li>
            <strong>Object</strong> to the processing of your personal data.
          </li>
          <li>
            <strong>Erasure or blocking</strong> of your personal data from our system, subject to
            legal retention exceptions (e.g. order records, audit logs).
          </li>
          <li>
            <strong>Data portability</strong> — receive a copy of your data in an electronic,
            portable format.
          </li>
          <li>
            <strong>Damages</strong> for harm caused by inaccurate, unlawfully obtained, or
            unauthorized use of your personal data.
          </li>
          <li>
            <strong>Lodge a complaint</strong> with the{" "}
            <strong>National Privacy Commission (NPC)</strong> if you believe your rights have been
            violated.
          </li>
        </ul>
        <p>
          <strong>How to exercise these rights today:</strong> email{" "}
          <a href={`mailto:${CONNECTA.supportEmail}`}>{CONNECTA.supportEmail}</a> from the address
          associated with your account. We will verify your identity before acting on the request.
        </p>
        <Callout>
          <p>
            <strong>Honest gap:</strong> as of this writing there is no self-service data-export
            button, and account deletion from the UI is not yet wired up. A signed-in user can
            already have their account and associated personal data erased on request via a backend
            deletion capability (physical cards you own are returned to unassigned inventory rather
            than destroyed, and audit-log entries are retained as a security record) — email support
            to trigger it, and expect a self-service &quot;Delete my account&quot; button in the
            dashboard settings as a near-term follow-up.
          </p>
        </Callout>
      </Section>

      <Section id="children" heading="Children's data">
        <p>
          {CONNECTA.name} is intended for business and professional use and is not directed at
          children. We do not knowingly collect personal data from children under 18. If you believe
          a child has provided us personal data (for example, as an inquirer submitting a lead
          form), contact us at{" "}
          <a href={`mailto:${CONNECTA.supportEmail}`}>{CONNECTA.supportEmail}</a> and we will
          investigate and remove it as appropriate.
        </p>
      </Section>

      <Section id="cookies" heading="Cookies">
        <p>
          {CONNECTA.name} does not currently run advertising or analytics cookies, and there is no
          cookie-consent banner on the site. Clerk, our authentication provider, sets cookies that
          are <strong>strictly necessary</strong> to keep you signed in — these are functional, not
          tracking, cookies, and under Philippine and general practice do not typically require
          separate consent. If that changes (e.g. analytics or marketing cookies are added in the
          future), this section and a consent mechanism will be added before those cookies are
          deployed.
        </p>
      </Section>

      <Section id="changes" heading="Changes to this policy">
        <p>
          We may update this policy as the product changes. Material changes will update the
          &quot;Last updated&quot; date at the top of this page. Continued use of {CONNECTA.name}{" "}
          after an update constitutes acceptance of the revised policy.
        </p>
      </Section>

      <Section id="contact" heading="Contact & complaints">
        <p>
          Questions, requests to exercise your rights, or complaints about how your data is handled:
          email <a href={`mailto:${CONNECTA.supportEmail}`}>{CONNECTA.supportEmail}</a>.
        </p>
        <p>
          Data Protection Officer: <Placeholder>[DPO NAME AND CONTACT]</Placeholder>.
        </p>
        <p>
          You may also file a complaint directly with the National Privacy Commission of the
          Philippines at{" "}
          <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer">
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
