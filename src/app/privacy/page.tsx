import type { Metadata } from "next";
import { StructuredData } from "@/components/layout/StructuredData";
import {
  LegalContactAddress,
  LegalLayout,
  LegalLink,
  LegalList,
  LegalStrong,
  LegalSub,
  type LegalSection,
} from "@/app/_legal/LegalLayout";
import { CONTACT, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Highland Farms Oregon privacy policy. Learn how we collect, use, and protect your personal information.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const mailto = `mailto:${CONTACT.email}`;

const summary = (
  <section aria-labelledby="privacy-summary-title" className="mb-5 max-w-[68ch]">
    <h2 id="privacy-summary-title" className="font-display text-[20px] font-semibold leading-tight text-ink lg:text-[23px]">
      The short version
    </h2>
    <ul className="m-0 mt-2 list-none p-0 text-[15px] leading-[1.65] text-ink-body lg:text-[16px]">
      <li>
        <LegalStrong>What we collect:</LegalStrong> your name, email and phone number, and the details you send us
        about your event or visit.
      </li>
      <li>
        <LegalStrong>Why:</LegalStrong> to answer your inquiry, quote and take your booking or order, and to keep the
        site secure. We do not sell your personal information.
      </li>
      <li>
        <LegalStrong>How to ask:</LegalStrong> to see, correct or delete your information, email{" "}
        <LegalLink href={mailto}>{CONTACT.email}</LegalLink>. We respond within 45 days.
      </li>
    </ul>
  </section>
);

const notice = (
  <aside
    aria-labelledby="privacy-notice-title"
    className="border border-frame bg-paper-shade px-4 py-4 text-[15px] leading-[1.65] text-ink-body lg:px-6 lg:py-5 lg:text-[16px]"
  >
    <h2 id="privacy-notice-title" className="font-display text-[20px] font-semibold leading-tight text-ink lg:text-[23px]">
      Important Notice Regarding Text Messaging Data
    </h2>
    <p className="mt-2">
      Highland Farms Oregon LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;){" "}
      <LegalStrong>does not</LegalStrong> share customer opt-in information, including phone numbers and consent
      records, with any affiliates or third parties for marketing, promotional, or any other purposes unrelated to
      providing our direct services. All text messaging originator opt-in data is kept strictly confidential.
    </p>
  </aside>
);

const lead = (
  <>
    {summary}
    {notice}
  </>
);

const sections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    children: (
      <p>
        Highland Farms Oregon LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website at{" "}
        <LegalStrong>{SITE.url}</LegalStrong>. This Privacy Policy explains how we collect, use, disclose, and
        safeguard your personal information when you visit our website or use our services.
      </p>
    ),
  },
  {
    id: "collect",
    title: "Information We Collect",
    children: (
      <>
        <LegalSub>Personal Information</LegalSub>
        <LegalList>
          <>Name, email address, phone number</>
          <>Event type and details</>
          <>Preferred date and guest count</>
          <>Any message content you include</>
          <>Payment information when you make a purchase or request a quote</>
          <>Opt-in records and timestamps for all communication channels (SMS, email, etc.)</>
        </LegalList>
        <LegalSub>Non-Personal Information</LegalSub>
        <LegalList>
          <>IP address, browser type, device information</>
          <>Website usage patterns and analytics</>
          <>Cookies and similar technologies</>
        </LegalList>
        <LegalSub>Customer Communication Records</LegalSub>
        <LegalList>
          <>Records of inquiries and service requests</>
          <>Appointment details and preferences</>
          <>Service history and feedback</>
        </LegalList>
      </>
    ),
  },
  {
    id: "use",
    title: "How We Use Your Information",
    children: (
      <>
        <LegalList>
          <>
            To respond to your inquiries about weddings, events, farm tours, spa sessions, and accommodations
          </>
          <>To provide pricing, availability, and custom quotes</>
          <>Processing transactions and payments</>
          <>Communicating with you about your inquiries, appointments, and promotions</>
          <>To improve our website and services</>
          <>To analyze website traffic and understand how visitors use our site</>
          <>Ensuring security and fraud prevention</>
          <>Maintaining records of your communication preferences and consent</>
          <>To comply with legal obligations</>
        </LegalList>
        <p>
          We do not sell, rent, or share your personal information with third parties for their own marketing
          purposes.
        </p>
        <p>
          We may use our own customer and booking information to measure our advertising, avoid showing ads to
          existing customers, and create audiences of people with similar interests. This use does not include
          text-message opt-in data or consent records.
        </p>
      </>
    ),
  },
  {
    id: "sms",
    title: "SMS Messaging & Compliance",
    children: (
      <>
        <p>
          By opting into our SMS messaging services, you agree to receive text messages related to our services,
          including appointment reminders, customer support, and important updates.
        </p>
        <LegalSub>Marketing Text Messages</LegalSub>
        <p>
          If you check the marketing text message box on our contact form, you consent to receive marketing text
          messages from Highland Farms Oregon LLC at the phone number you provided. Frequency may vary. Message and
          data rates may apply. Text HELP for assistance. Reply STOP to opt out. Consent is not a condition of
          purchase. Appointment messages (confirmations and reminders) are a separate, optional choice on the same
          form.
        </p>
        <LegalSub>Opt-In &amp; Consent</LegalSub>
        <LegalList>
          <>You will only receive messages if you have explicitly opted in</>
          <>We maintain timestamped records of all opt-in actions</>
          <>We comply with the Telephone Consumer Protection Act (TCPA) and all applicable laws</>
        </LegalList>
        <LegalSub>Opt-Out Instructions</LegalSub>
        <LegalList>
          <>You can cancel SMS notifications at any time by replying &ldquo;STOP&rdquo;</>
          <>
            You will receive a final confirmation message, and no further messages will be sent unless you re-opt in
          </>
          <>All opt-out requests are processed immediately</>
        </LegalList>
        <LegalSub>Message Frequency &amp; Content</LegalSub>
        <LegalList>
          <>Message frequency varies based on your interactions with our business</>
          <>Messages will be directly related to the services you have requested</>
          <>We do not send promotional content without specific consent</>
        </LegalList>
        <LegalSub>Help &amp; Support</LegalSub>
        <LegalList>
          <>
            Reply &ldquo;HELP&rdquo; for assistance or contact us at <LegalLink href={mailto}>{CONTACT.email}</LegalLink>
          </>
          <>Customer support is available during regular business hours</>
        </LegalList>
        <LegalSub>Carrier Information</LegalSub>
        <LegalList>
          <>Standard message and data rates may apply</>
          <>Carriers are not liable for delayed or undelivered messages</>
          <>Supported carriers include AT&amp;T, Verizon, T-Mobile, Sprint, and most regional carriers</>
        </LegalList>
        <div className="border border-frame bg-paper-light px-4 py-3">
          <h3 className="font-sans text-[15px] font-semibold text-ink">SMS Data Protection Statement</h3>
          <p className="mt-2 text-[15px]">
            No mobile information will be shared with third parties/affiliates for marketing/promotional purposes.
            Information sharing to subcontractors in support services, such as customer service, is permitted. All
            other use case categories exclude text messaging originator opt-in data and consent; this information will
            not be shared with any third parties, excluding aggregators and providers of the Text Message services.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "security",
    title: "Data Storage & Security",
    children: (
      <>
        <p>
          Inquiry form data is stored securely using Supabase, a cloud-hosted database with encryption at rest and in
          transit. We retain inquiry data for up to 24 months after your last interaction, after which it is deleted.
          We implement reasonable administrative, technical, and physical safeguards to protect your information, but
          no method of electronic transmission or storage is 100% secure.
        </p>
        <LegalList>
          <>Encryption of sensitive data in transit and at rest</>
          <>Secure access controls and authentication mechanisms</>
          <>Regular security assessments and updates</>
          <>Breach notification protocols in accordance with applicable laws</>
        </LegalList>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & Tracking Technologies",
    children: (
      <>
        <p>
          Our website uses analytics and advertising technologies to understand visits, measure campaign performance,
          and improve the site experience.
        </p>
        <p>
          We also use local storage to remember popup dismissal and first-party attribution details such as UTM
          parameters, landing page, and referrer.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Information Sharing & Third-Party Services",
    children: (
      <>
        <p>We do not sell, rent, or trade personal information. We may share information with:</p>
        <LegalList>
          <>
            <LegalStrong>Google Tag Manager / Google Analytics:</LegalStrong> website analytics and campaign
            measurement
          </>
          <>
            <LegalStrong>Meta Pixel / Conversions API / Custom Audiences:</LegalStrong> advertising measurement,
            conversion reporting, suppression of existing customers, and audience modeling
          </>
          <>
            <LegalStrong>Microsoft Clarity:</LegalStrong> session analytics when enabled
          </>
          <>
            <LegalStrong>Supabase:</LegalStrong> secure form data storage
          </>
          <>
            <LegalStrong>BookedIQ / GoHighLevel:</LegalStrong> CRM and appointment management
          </>
          <>
            <LegalStrong>Acuity Scheduling:</LegalStrong> farm tour and spa session booking
          </>
          <>
            <LegalStrong>Hospitable:</LegalStrong> accommodation booking widgets
          </>
          <>
            <LegalStrong>Vercel:</LegalStrong> website hosting
          </>
          <>
            <LegalStrong>Cloudflare Turnstile:</LegalStrong> spam protection on our forms
          </>
          <>
            <LegalStrong>Square:</LegalStrong> farm store payments (card details go directly to Square)
          </>
          <>
            <LegalStrong>Instagram (Meta):</LegalStrong> links to our Instagram profile and featured posts; following
            those links is subject to Instagram&rsquo;s own policies
          </>
          <>
            <LegalStrong>Google:</LegalStrong> reviewer profile photos shown with Google reviews are loaded from
            Google&rsquo;s servers, so Google may receive your IP address when they load
          </>
          <>
            <LegalStrong>SMS aggregators and providers:</LegalStrong> solely for delivering messages you&rsquo;ve
            consented to receive
          </>
        </LegalList>
        <p>
          Each of these services has its own privacy policy governing how they handle data.
        </p>
        <p>
          For Google and Meta advertising services, we may share identifiers such as email address, phone number,
          name, and general location after applying a one-way cryptographic hash, together with transaction or booking
          value. These platforms use the information to match our records to their users for measurement, customer
          suppression, and creation of similar audiences. We do not send payment-card numbers, message content, or
          text-message opt-in data for these purposes.
        </p>
        <p>
          All of the above categories exclude text messaging originator opt-in data and consent; this information will
          not be shared with any third parties, excluding aggregators and providers of the Text Message services.
        </p>
        <p>
          We may also share information if required by law, legal process, or to protect our rights, or in response to
          valid law enforcement requests. In the event of a merger, acquisition, or sale of assets, your data remains
          protected under the terms of this policy.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your Rights",
    children: (
      <>
        <LegalSub>Oregon Consumer Privacy Act (OCPA) &amp; California Consumer Privacy Act (CCPA/CPRA)</LegalSub>
        <p>
          If you are a resident of Oregon, California, or another state with consumer privacy laws, you have the right
          to:
        </p>
        <LegalList>
          <>
            <LegalStrong>Access:</LegalStrong> Request a copy of the personal information we hold about you
          </>
          <>
            <LegalStrong>Delete:</LegalStrong> Request that we delete your personal information
          </>
          <>
            <LegalStrong>Correct:</LegalStrong> Request correction of inaccurate personal information
          </>
          <>
            <LegalStrong>Opt out of sale:</LegalStrong> We do not sell your personal information
          </>
          <>
            <LegalStrong>Opt out of targeted advertising:</LegalStrong> Contact us to stop our use of your information
            for customer-list advertising audiences
          </>
          <>
            <LegalStrong>Opt out of SMS:</LegalStrong> Reply &ldquo;STOP&rdquo; to any message or contact us directly
          </>
          <>
            <LegalStrong>Opt out of marketing emails:</LegalStrong> Click &ldquo;unsubscribe&rdquo; in any email
          </>
          <>
            <LegalStrong>Non-discrimination:</LegalStrong> We will not discriminate against you for exercising your
            privacy rights
          </>
        </LegalList>
        <p>
          To exercise any of these rights, contact us at <LegalLink href={mailto}>{CONTACT.email}</LegalLink>. We will
          respond within 45 days.
        </p>
        <p>
          You can also manage ad personalization directly through{" "}
          <LegalLink href="https://www.facebook.com/adpreferences">Meta Ad Preferences</LegalLink> and{" "}
          <LegalLink href="https://adssettings.google.com/">Google Ad Settings</LegalLink>.
        </p>
        <LegalSub>European Visitors (GDPR)</LegalSub>
        <p>
          If you are located in the European Economic Area, you have additional rights under GDPR including the right
          to data portability and the right to lodge a complaint with a supervisory authority. Our lawful basis for
          processing is consent (for analytics and SMS) and legitimate interest (for responding to inquiries).
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children’s Privacy",
    children: (
      <p>
        Our website is not directed to children under 13. We do not knowingly collect personal information from
        children under 13. If you believe we have inadvertently collected such information, please contact us and we
        will promptly delete it.
      </p>
    ),
  },
  {
    id: "links",
    title: "Third-Party Links",
    children: (
      <p>
        Our website may contain links to third-party websites. We are not responsible for their privacy practices and
        encourage you to review their policies. This privacy policy applies only to information collected by Highland
        Farms Oregon LLC.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    children: (
      <p>
        We may update this Privacy Policy from time to time. The latest version will always be available on our
        website with the effective date. For significant changes, we will notify you by email or through a notice on
        our website.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    children: (
      <>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at:
        </p>
        <LegalContactAddress />
        <p>By using our website and services, you consent to this Privacy Policy.</p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <StructuredData pathname="/privacy" />
      <LegalLayout
        policy="privacy"
        title="Privacy Policy"
        updated="October 7, 2026"
        lead={lead}
        sections={sections}
        closing="Still have a question?"
      />
    </>
  );
}
