import type { Metadata } from "next";
import Link from "next/link";
import { CONNECTA } from "@/lib/brand";
import { LegalPage, Section } from "@/components/legal/LegalPage";

const LAST_UPDATED = "September 27, 2026";

export function generateMetadata(): Metadata {
  return {
    title: `Terms of Service | ${CONNECTA.name}`,
    description: `The terms for using ${CONNECTA.name}: accounts, plans, card orders and refunds, leads, and your responsibilities.`,
  };
}

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Accounts" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "your-content", label: "Your content" },
  { id: "public-profiles", label: "Public profiles" },
  { id: "cards", label: "Cards and links" },
  { id: "plans", label: "Plans and payment" },
  { id: "orders", label: "Card orders, returns and refunds" },
  { id: "leads", label: "Leads you collect" },
  { id: "termination", label: "Closing your account" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of liability" },
  { id: "governing-law", label: "Governing law and disputes" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsOfServicePage() {
  const email = CONNECTA.supportEmail;
  const mail = <a href={`mailto:${email}`}>{email}</a>;

  return (
    <LegalPage title="Terms of Service" lastUpdated={LAST_UPDATED} toc={TOC}>
      <Section id="overview" heading="Overview">
        <p>
          These Terms govern your use of {CONNECTA.name}, a service for creating digital business
          card profiles, linking them to NFC and QR cards, and receiving inquiries
          (&quot;leads&quot;) from the people you share them with. {CONNECTA.name} is operated by{" "}
          <strong>{CONNECTA.operator.legalName}</strong>, doing business as {CONNECTA.name},{" "}
          {CONNECTA.operator.address} (&quot;we,&quot; &quot;us&quot;).
        </p>
        <p>
          By creating an account, ordering a card or using the service, you agree to these Terms
          and to our <Link href="/privacy">Privacy Policy</Link>. If you use {CONNECTA.name} for a
          business, you confirm you are authorized to accept these Terms for it.
        </p>
      </Section>

      <Section id="accounts" heading="Accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You can sign up with an email and password, or with Google where that option is
            offered. You must be at least 18, or otherwise legally able to enter into a contract.
          </li>
          <li>Give accurate information and keep it up to date.</li>
          <li>
            Keep your sign-in details secure. You are responsible for activity on your account;
            tell us at {mail} if you think someone else has accessed it.
          </li>
        </ul>
      </Section>

      <Section id="acceptable-use" heading="Acceptable use">
        <p>You agree not to use {CONNECTA.name} to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            publish anything unlawful, fraudulent, defamatory or obscene, or that infringes
            someone else&apos;s intellectual property or privacy;
          </li>
          <li>impersonate a person, business or organization you do not represent;</li>
          <li>
            send spam through the contact form, or try to get around its rate limits or other
            protections;
          </li>
          <li>access another person&apos;s account, profile or leads without permission; or</li>
          <li>
            use leads for anything the person did not reasonably expect when they contacted you,
            or in breach of data privacy law.
          </li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules.</p>
      </Section>

      <Section id="your-content" heading="Your content">
        <p>
          You own what you put on your profile. You give us a non-exclusive, royalty-free licence
          to host, store, copy and display it only as needed to run the service: to show your
          profile, its link previews and your card. The licence ends when you delete the content
          or your account, except for copies we must keep as described in our Privacy Policy.
        </p>
        <p>
          You are responsible for having the right to publish everything you upload, including
          photos of other people and testimonials.
        </p>
      </Section>

      <Section id="public-profiles" heading="Public profiles">
        <p>
          A published profile can be seen by anyone with its link or card, and may appear in
          link previews and search results. Don&apos;t publish anything confidential.
        </p>
      </Section>

      <Section id="cards" heading="Cards and links">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Each card opens the {CONNECTA.name} profile it is linked to. You can change which
            profile it opens from your dashboard.
          </li>
          <li>
            A card works for as long as it is linked to an active account and the service is
            running. If you delete your account, your cards return to unassigned stock and stop
            opening your profile.
          </li>
          <li>
            Tell us if a card is lost so we can stop it opening your profile.
          </li>
        </ul>
      </Section>

      <Section id="plans" heading="Plans and payment">
        <p>
          {CONNECTA.name} has a free plan and paid plans. What each includes and what it costs are
          shown on our pricing page and in your billing page when you subscribe; those details
          form part of these Terms. Prices are in Philippine pesos.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Paid plans are prepaid for a period of 30 days (or longer where offered). There is no
            automatic recurring charge: we arrange payment and activation with you directly, and
            we do not collect or store card or e-wallet credentials.
          </li>
          <li>
            If a paid plan is not renewed, its features stay on for a 3-day grace period, then
            the account moves to the free plan and its limits apply. Your data is not deleted;
            anything over the free limits is hidden until you upgrade again.
          </li>
          <li>
            Renewing early adds to your current period, so you never lose days you have paid for.
          </li>
          <li>
            We may change plans or prices. Changes apply from your next period, and we will tell
            you before they do.
          </li>
        </ul>
      </Section>

      <Section id="orders" heading="Card orders, returns and refunds">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Card orders are confirmed by us after you place them. Delivery times are estimates.
            Give an accurate delivery address; we are not responsible for delays or loss caused by
            a wrong one.
          </li>
          <li>
            <strong>Defective or wrong cards:</strong> if your card doesn&apos;t work or isn&apos;t
            what you ordered, tell us within <strong>7 days</strong> of delivery at {mail}, with
            your order details and a photo. We will replace it or refund you, whichever you
            prefer.
          </li>
          <li>
            <strong>Change of mind:</strong> cards are printed and encoded for you, so we
            don&apos;t accept returns or give refunds for change of mind.
          </li>
          <li>
            Nothing here limits your rights under the Consumer Act of the Philippines (RA 7394)
            or other laws that cannot be waived.
          </li>
        </ul>
      </Section>

      <Section id="leads" heading="Leads you collect">
        <p>
          When someone sends you their details through your profile, you become the personal
          information controller for that data under the Data Privacy Act (RA 10173); we process
          it for you (see our <Link href="/privacy#lead-data">Privacy Policy</Link>). You must use
          it lawfully, keep it secure, and honor the person&apos;s requests to access, correct or
          delete it.
        </p>
      </Section>

      <Section id="termination" heading="Closing your account">
        <p>
          You can stop using {CONNECTA.name} at any time and delete your account from{" "}
          <strong>Settings → Delete account</strong>. This permanently erases your account,
          profiles and leads. Records we are required to keep, such as order and payment records,
          are retained as described in our Privacy Policy. Prepaid plan periods are not refunded
          when you close your account, unless the law requires it.
        </p>
        <p>
          We may suspend or close an account that breaks these Terms, is used for fraud or abuse,
          or where the law requires it. Where we can, we will tell you why and give you a chance
          to respond or export your data first.
        </p>
      </Section>

      <Section id="disclaimers" heading="Disclaimers">
        <p>
          We work to keep {CONNECTA.name} available and secure, but it is provided &quot;as
          is&quot; and &quot;as available.&quot; To the extent the law allows, we make no
          warranties beyond those in these Terms, and we don&apos;t guarantee the service will
          always be uninterrupted or error-free.
        </p>
      </Section>

      <Section id="liability" heading="Limitation of liability">
        <p>
          To the extent Philippine law allows, we are not liable for indirect, incidental or
          consequential losses, or for lost profits, revenue, data or goodwill, arising from your
          use of {CONNECTA.name}. Our total liability for any claim is limited to the amount you
          paid us in the 12 months before the claim.
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited by law, including for
          fraud, gross negligence or willful misconduct.
        </p>
      </Section>

      <Section id="governing-law" heading="Governing law and disputes">
        <p>
          These Terms are governed by the laws of the Republic of the Philippines. Please contact
          us first so we can try to resolve any problem informally. Any dispute that can&apos;t be
          resolved that way will be brought before the proper courts of{" "}
          {CONNECTA.operator.venue}, Philippines, unless the law gives you the right to another
          venue.
        </p>
      </Section>

      <Section id="changes" heading="Changes to these terms">
        <p>
          We may update these Terms as the service changes. We will update the date at the top
          and, for material changes, tell account holders by email or in the app before they take
          effect. Continuing to use {CONNECTA.name} after that means you accept the updated Terms.
        </p>
      </Section>

      <Section id="contact" heading="Contact">
        <p>
          {CONNECTA.operator.legalName}, doing business as {CONNECTA.name},{" "}
          {CONNECTA.operator.address}. Email: {mail}.
        </p>
      </Section>
    </LegalPage>
  );
}
