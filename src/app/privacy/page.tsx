import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { CONTACT, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Highland Farms Oregon privacy policy. Learn how we collect, use, and protect your personal information.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="pt-32 pb-20 lg:pb-28 bg-background">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-normal sm:text-4xl mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted font-sans mb-10">
            Last updated: March 3, 2026
          </p>

          <div className="prose prose-neutral max-w-none text-base text-charcoal/90 font-sans leading-relaxed space-y-8">

            {/* ── A2P Required Notice ── */}
            <section className="rounded-lg border border-forest/20 bg-forest/5 px-5 py-4">
              <h2 className="text-base font-medium font-sans mb-2 text-charcoal">
                Important Notice Regarding Text Messaging Data
              </h2>
              <p className="text-sm">
                Highland Farms Oregon LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) <strong>does not</strong> share
                customer opt-in information, including phone numbers and consent records, with any affiliates or third parties
                for marketing, promotional, or any other purposes unrelated to providing our direct services. All text messaging
                originator opt-in data is kept strictly confidential.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Introduction
              </h2>
              <p>
                Highland Farms Oregon LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                &ldquo;our&rdquo;) operates the website at{" "}
                <strong>{SITE.url}</strong>. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your personal information
                when you visit our website or use our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Information We Collect
              </h2>
              <h3 className="text-lg font-normal font-display mb-2">
                Personal Information
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Name, email address, phone number</li>
                <li>Event type and details</li>
                <li>Preferred date and guest count</li>
                <li>Any message content you include</li>
                <li>Payment information when you make a purchase or request a quote</li>
                <li>Opt-in records and timestamps for all communication channels (SMS, email, etc.)</li>
              </ul>

              <h3 className="text-lg font-normal font-display mb-2 mt-4">
                Non-Personal Information
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>IP address, browser type, device information</li>
                <li>Website usage patterns and analytics</li>
                <li>Cookies and similar technologies</li>
              </ul>

              <h3 className="text-lg font-normal font-display mb-2 mt-4">
                Customer Communication Records
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Records of inquiries and service requests</li>
                <li>Appointment details and preferences</li>
                <li>Service history and feedback</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                How We Use Your Information
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>To respond to your inquiries about weddings, events, farm tours, spa sessions, and accommodations</li>
                <li>To provide pricing, availability, and custom quotes</li>
                <li>Processing transactions and payments</li>
                <li>Communicating with you about your inquiries, appointments, and promotions</li>
                <li>To improve our website and services</li>
                <li>To analyze website traffic and understand how visitors use our site (with consent)</li>
                <li>Ensuring security and fraud prevention</li>
                <li>Maintaining records of your communication preferences and consent</li>
                <li>To comply with legal obligations</li>
              </ul>
              <p className="text-sm mt-3">
                We do not sell, rent, or share your personal information with
                third parties for their own marketing purposes.
              </p>
            </section>

            {/* ── SMS Messaging & Compliance (A2P required) ── */}
            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                SMS Messaging &amp; Compliance
              </h2>
              <p className="text-sm mb-4">
                By opting into our SMS messaging services, you agree to receive text messages related to our services,
                including appointment reminders, customer support, and important updates.
              </p>

              <h3 className="text-base font-medium font-sans mb-2">Opt-In &amp; Consent</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>You will only receive messages if you have explicitly opted in</li>
                <li>We maintain timestamped records of all opt-in actions</li>
                <li>We comply with the Telephone Consumer Protection Act (TCPA) and all applicable laws</li>
              </ul>

              <h3 className="text-base font-medium font-sans mb-2 mt-4">Opt-Out Instructions</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>You can cancel SMS notifications at any time by replying &ldquo;STOP&rdquo;</li>
                <li>You will receive a final confirmation message, and no further messages will be sent unless you re-opt in</li>
                <li>All opt-out requests are processed immediately</li>
              </ul>

              <h3 className="text-base font-medium font-sans mb-2 mt-4">Message Frequency &amp; Content</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Message frequency varies based on your interactions with our business</li>
                <li>Messages will be directly related to the services you have requested</li>
                <li>We do not send promotional content without specific consent</li>
              </ul>

              <h3 className="text-base font-medium font-sans mb-2 mt-4">Help &amp; Support</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Reply &ldquo;HELP&rdquo; for assistance or contact us at{" "}
                  <a href={`mailto:${CONTACT.email}`} className="text-forest underline underline-offset-2">{CONTACT.email}</a>
                </li>
                <li>Customer support is available during regular business hours</li>
              </ul>

              <h3 className="text-base font-medium font-sans mb-2 mt-4">Carrier Information</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Standard message and data rates may apply</li>
                <li>Carriers are not liable for delayed or undelivered messages</li>
                <li>Supported carriers include AT&amp;T, Verizon, T-Mobile, Sprint, and most regional carriers</li>
              </ul>

              <div className="mt-4 rounded-lg bg-cream/60 border border-cream-dark px-4 py-3">
                <h3 className="text-sm font-medium font-sans mb-2">SMS Data Protection Statement</h3>
                <p className="text-sm">
                  No mobile information will be shared with third parties/affiliates for marketing/promotional purposes.
                  Information sharing to subcontractors in support services, such as customer service, is permitted.
                  All other use case categories exclude text messaging originator opt-in data and consent; this
                  information will not be shared with any third parties.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Data Storage &amp; Security
              </h2>
              <p>
                Inquiry form data is stored securely using Supabase, a cloud-hosted database with encryption at rest
                and in transit. We retain inquiry data for up to 24 months after your last interaction, after which it
                is deleted. We implement reasonable administrative, technical, and physical safeguards to protect your
                information, but no method of electronic transmission or storage is 100% secure.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-3">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Secure access controls and authentication mechanisms</li>
                <li>Regular security assessments and updates</li>
                <li>Breach notification protocols in accordance with applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Cookies &amp; Tracking Technologies
              </h2>
              <p>
                Our website uses a cookie consent banner. Analytics cookies (Google Tag Manager / Google Analytics)
                are only loaded after you explicitly accept cookies. You may decline cookies at any time, and the site
                will function normally without them.
              </p>
              <p className="text-sm mt-2">
                Essential cookies (such as those needed for site functionality) do not require consent and are minimal
                on this site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Information Sharing &amp; Third-Party Services
              </h2>
              <p>We do not sell, rent, or trade personal information. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-3">
                <li>
                  <strong>Google Tag Manager / Google Analytics</strong> — website analytics (with consent)
                </li>
                <li>
                  <strong>Supabase</strong> — secure form data storage
                </li>
                <li>
                  <strong>BookedIQ / GoHighLevel</strong> — CRM and appointment management
                </li>
                <li>
                  <strong>Acuity Scheduling</strong> — farm tour and spa session booking
                </li>
                <li>
                  <strong>Hospitable</strong> — accommodation booking widgets
                </li>
                <li>
                  <strong>Vercel</strong> — website hosting
                </li>
                <li>
                  <strong>SMS aggregators and providers</strong> — solely for delivering messages you&rsquo;ve consented to receive
                </li>
              </ul>
              <p className="text-sm mt-3">
                Each of these services has its own privacy policy governing how they handle data. All service providers
                are contractually obligated to maintain confidentiality and security.
              </p>
              <p className="text-sm mt-2">
                All of the above categories exclude text messaging originator opt-in data and consent; this information
                will not be shared with any third parties, excluding aggregators and providers of the Text Message services.
              </p>
              <p className="text-sm mt-2">
                We may also share information if required by law, legal process, or to protect our rights, or in response
                to valid law enforcement requests. In the event of a merger, acquisition, or sale of assets, your data
                remains protected under the terms of this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Your Rights
              </h2>
              <h3 className="text-lg font-normal font-display mb-2">
                Oregon Consumer Privacy Act (OCPA) &amp; California Consumer Privacy Act (CCPA/CPRA)
              </h3>
              <p>
                If you are a resident of Oregon, California, or another state with consumer privacy laws, you have the
                right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Access</strong> — Request a copy of the personal information we hold about you</li>
                <li><strong>Delete</strong> — Request that we delete your personal information</li>
                <li><strong>Correct</strong> — Request correction of inaccurate personal information</li>
                <li><strong>Opt out of sale</strong> — We do not sell your personal information</li>
                <li><strong>Opt out of SMS</strong> — Reply &ldquo;STOP&rdquo; to any message or contact us directly</li>
                <li><strong>Opt out of marketing emails</strong> — Click &ldquo;unsubscribe&rdquo; in any email</li>
                <li><strong>Non-discrimination</strong> — We will not discriminate against you for exercising your privacy rights</li>
              </ul>
              <p className="text-sm mt-3">
                To exercise any of these rights, contact us at{" "}
                <a href={`mailto:${CONTACT.email}`} className="text-forest underline underline-offset-2">
                  {CONTACT.email}
                </a>
                . We will respond within 45 days.
              </p>

              <h3 className="text-lg font-normal font-display mb-2 mt-4">
                European Visitors (GDPR)
              </h3>
              <p>
                If you are located in the European Economic Area, you have additional rights under GDPR including the
                right to data portability and the right to lodge a complaint with a supervisory authority. Our lawful
                basis for processing is consent (for analytics and SMS) and legitimate interest (for responding to
                inquiries).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Children&apos;s Privacy
              </h2>
              <p>
                Our website is not directed to children under 13. We do not knowingly collect personal information from
                children under 13. If you believe we have inadvertently collected such information, please contact us
                and we will promptly delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Third-Party Links
              </h2>
              <p>
                Our website may contain links to third-party websites. We are not responsible for their privacy
                practices and encourage you to review their policies. This privacy policy applies only to information
                collected by Highland Farms Oregon LLC.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. The latest version will always be available on
                our website with the effective date. For significant changes, we will notify you by email or through
                a notice on our website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at:
              </p>
              <p className="text-sm">
                Highland Farms Oregon LLC
                <br />
                {CONTACT.fullAddress}
                <br />
                Email:{" "}
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-forest underline underline-offset-2"
                >
                  {CONTACT.email}
                </a>
                <br />
                Phone:{" "}
                <a
                  href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                  className="text-forest underline underline-offset-2"
                >
                  {CONTACT.phone}
                </a>
              </p>
              <p className="text-sm mt-3">
                By using our website and services, you consent to this Privacy Policy.
              </p>
            </section>
          </div>
        </Container>
      </section>
    </>
  );
}
