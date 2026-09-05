import type { Metadata } from "next";
import Link from "next/link";
import { CONNECTA } from "@/lib/brand";
import { LegalPage, Section, Callout, Placeholder } from "@/components/legal/LegalPage";

const LAST_UPDATED = "July 31, 2026";

export function generateMetadata(): Metadata {
  return {
    title: `Terms of Service | ${CONNECTA.name}`,
    description: `The terms governing use of ${CONNECTA.name}'s NFC digital business card service — draft pending legal review.`,
  };
}

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Accounts" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "your-content", label: "Your content" },
  { id: "public-profiles", label: "Public profiles" },
  { id: "plans-and-limits", label: "Plans & limits" },
  { id: "billing", label: "Billing & subscriptions" },
  { id: "physical-cards", label: "Physical card orders" },
  { id: "leads", label: "Leads you collect" },
  { id: "termination", label: "Termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of liability" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={LAST_UPDATED} toc={TOC}>
      <Section id="overview" heading="Overview">
        <p>
          {`These Terms of Service ("Terms") govern your use of ${CONNECTA.name} ("we," "us"), a service for creating digital business card profiles, ordering NFC business cards linked to those profiles, and collecting inquiries ("leads") from people who view your profile or tap your card. By creating an account, purchasing a card, or using the service, you agree to these Terms.`}
        </p>
        <p>
          {CONNECTA.name} is operated by <Placeholder>[COMPANY LEGAL NAME]</Placeholder>,{" "}
          <Placeholder>[REGISTERED ADDRESS]</Placeholder>. See also our{" "}
          <Link href="/privacy">Privacy Policy</Link>, which describes what personal data we collect
          and how.
        </p>
      </Section>

      <Section id="accounts" heading="Accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You must sign in through our authentication provider (Clerk) to create profiles, view
            leads, or manage orders tied to an account.
          </li>
          <li>
            You are responsible for the accuracy of information you provide and for keeping your
            login credentials secure.
          </li>
          <li>
            You must be legally capable of entering a contract to create an account; {CONNECTA.name}{" "}
            is not directed at children (see our{" "}
            <Link href="/privacy#children">Privacy Policy</Link>).
          </li>
        </ul>
      </Section>

      <Section id="acceptable-use" heading="Acceptable use">
        <p>You agree not to use {CONNECTA.name} to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Publish content that is unlawful, fraudulent, defamatory, or infringes someone
            else&apos;s intellectual property or privacy rights.
          </li>
          <li>
            Impersonate a person, business, or organization you are not authorized to represent.
          </li>
          <li>
            Use the public lead-capture form to submit spam, or attempt to circumvent its rate
            limiting or abuse protections.
          </li>
          <li>
            Attempt to gain unauthorized access to another user&apos;s account, profile, or leads.
          </li>
          <li>
            Use leads collected through your profile for any purpose beyond what the inquirer
            reasonably expected when they submitted the form, or in violation of applicable
            data-privacy law.
          </li>
        </ul>
        <p>We may suspend or terminate accounts that violate this section.</p>
      </Section>

      <Section id="your-content" heading="Your content">
        <p>
          You own the content you upload to your profile (photos, biography, testimonials, project
          descriptions, and similar). By uploading content, you grant {CONNECTA.name} a worldwide,
          non-exclusive, royalty-free licence to host, store, reproduce, and publicly display that
          content solely as necessary to operate the service — that is, to render your public
          profile page and its link-preview (OpenGraph) metadata. This licence ends when you delete
          the content or your account, except where a copy must be retained for a legitimate purpose
          described in our Privacy Policy (e.g. order records, audit logs).
        </p>
        <p>
          You are responsible for having the rights to any content you upload, including photos of
          other people and any testimonials you publish on their behalf.
        </p>
      </Section>

      <Section id="public-profiles" heading="Public profiles">
        <p>
          A published {CONNECTA.name} profile is publicly accessible to anyone with its link, and is
          intentionally rendered with link-preview metadata so it displays correctly when shared. Do
          not put confidential information on a public profile.
        </p>
      </Section>

      <Section id="plans-and-limits" heading="Plans & limits">
        <p>{CONNECTA.name} offers three plans, each with enforced limits:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Free</strong> — 1 profile, 1 active NFC card, 2 templates, up to 100 viewable
            leads, {CONNECTA.name} branding shown on your profile.
          </li>
          <li>
            <strong>Pro</strong> — unlimited profiles and cards, all templates, branding removed,
            lead export, full analytics.
          </li>
          <li>
            <strong>Business</strong> — everything in Pro, plus a shared team workspace with 5
            seats, a team-wide lead pool, and white-label profiles.
          </li>
        </ul>
        <p>
          Plan limits and pricing are enforced server-side and may be updated from time to time; the
          current limits and pricing are shown on the pricing page and in your billing dashboard.
        </p>
      </Section>

      <Section id="billing" heading="Billing & subscriptions">
        <p>
          Paid plans (Pro and Business) are billed as <strong>prepaid 30-day periods</strong>. There
          is no automatic recurring charge: your card or e-wallet is not billed again automatically
          when a period ends. To keep a paid plan active, you renew manually before or shortly after
          it expires, via a hosted PayRex checkout (GCash, Maya, card, or QR Ph).
        </p>
        <p>
          If your plan expires without renewal, you get a <strong>3-day grace period</strong> during
          which your paid features keep working. If you have not renewed by the end of the grace
          period, your account is automatically downgraded to the Free plan and Free-plan limits
          apply (for example, only your most recent 100 leads remain viewable — no data is deleted,
          it is simply capped from view until you upgrade again).
        </p>
        <p>
          Renewing extends your access from whichever is later — the current time or your existing
          expiry — so renewing early never costs you days you already paid for.
        </p>
        <p>
          All prices are in Philippine Pesos (PHP). Payment processing is handled by PayRex;{" "}
          {CONNECTA.name} does not store your card or e-wallet credentials.
        </p>
      </Section>

      <Section id="physical-cards" heading="Physical card orders">
        <p>
          You may purchase a physical NFC card linked to your digital profile. The following applies
          to physical orders:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Orders can be placed as a guest (with an email for order updates) or while signed in.
          </li>
          <li>
            You are responsible for providing an accurate shipping address. We are not responsible
            for delays or non-delivery caused by an incorrect address.
          </li>
          <li>
            Order status moves through stages (pending, processing, shipped, delivered) that you can
            see in your order history.{" "}
            <Callout>
              <strong>Honest gap:</strong> {CONNECTA.name} does not currently integrate with a
              courier&apos;s tracking system — there is no live tracking number or carrier hand-off
              event. &quot;Shipped&quot; reflects a status update made on our side, not a real-time
              courier feed.
            </Callout>
          </li>
          <li>
            <strong>Returns and refunds</strong> are handled manually on a case-by-case basis by
            contacting <a href={`mailto:${CONNECTA.supportEmail}`}>{CONNECTA.supportEmail}</a> —
            there is currently no self-service return or refund flow. Specific timeframes and
            conditions for returns/refunds have not been formally published yet:{" "}
            <Placeholder>[RETURN/REFUND WINDOW AND CONDITIONS]</Placeholder>.
          </li>
        </ul>
      </Section>

      <Section id="leads" heading="Leads you collect">
        <p>
          When someone submits an inquiry through your public profile, you become the personal
          information controller for that person&apos;s data (see our{" "}
          <Link href="/privacy#lead-data">Privacy Policy</Link> for what that means under RA 10173).
          You are responsible for handling that data lawfully — including responding to legitimate
          requests from the inquirer to access, correct, or delete the data they gave you.
        </p>
      </Section>

      <Section id="termination" heading="Termination">
        <p>
          You may stop using {CONNECTA.name} at any time. A signed-in user can request deletion of
          their account and associated personal data (see our{" "}
          <Link href="/privacy#your-rights">Privacy Policy</Link>) — physical cards you own are
          returned to unassigned inventory rather than destroyed, and certain records (order history
          required for accounting, and audit logs) are retained as described there.
        </p>
        <p>
          We may suspend or terminate your account if you violate these Terms, engage in fraudulent
          or abusive behavior, or if required by law.
        </p>
      </Section>

      <Section id="disclaimers" heading="Disclaimers">
        <p>
          {CONNECTA.name} is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest
          extent permitted by law, we disclaim all warranties, express or implied, including
          merchantability, fitness for a particular purpose, and non-infringement. We do not
          guarantee the service will be uninterrupted, error-free, or secure against all possible
          attacks; see our <Link href="/privacy#security">Privacy Policy</Link> for the security
          measures actually in place.
        </p>
      </Section>

      <Section id="liability" heading="Limitation of liability">
        <p>
          To the fullest extent permitted under Philippine law, {CONNECTA.name} and its officers,
          employees, and affiliates will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill,
          arising from your use of the service. Where liability cannot be excluded, our total
          liability to you for any claim arising from these Terms or the service is limited to the
          amount you paid to {CONNECTA.name} in the 12 months preceding the claim.
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited under Philippine law,
          including liability for gross negligence, willful misconduct, or death or personal injury
          caused by our negligence.
        </p>
      </Section>

      <Section id="governing-law" heading="Governing law">
        <p>
          These Terms are governed by the laws of the <strong>Republic of the Philippines</strong>,
          without regard to conflict-of-law principles. Any dispute arising from these Terms or the
          service will be subject to the exclusive jurisdiction of the proper courts of{" "}
          <Placeholder>[VENUE CITY]</Placeholder>, Philippines, unless applicable law requires
          otherwise.
        </p>
      </Section>

      <Section id="changes" heading="Changes to these terms">
        <p>
          We may update these Terms as the product changes. Material changes will update the
          &quot;Last updated&quot; date at the top of this page. Continued use of {CONNECTA.name}{" "}
          after an update constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section id="contact" heading="Contact">
        <p>
          Questions about these Terms: email{" "}
          <a href={`mailto:${CONNECTA.supportEmail}`}>{CONNECTA.supportEmail}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
