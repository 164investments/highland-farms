import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Highland Farms Oregon terms of service. Review our booking terms, property rules, cancellation policy, and liability information.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <>
      <section className="pt-32 pb-20 lg:pb-28 bg-background">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-normal sm:text-4xl mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-muted font-sans mb-10">
            Last updated: March 3, 2026
          </p>

          <div className="prose prose-neutral max-w-none text-base text-charcoal/90 font-sans leading-relaxed space-y-8">

            {/* ── SMS Messaging Terms & Compliance (A2P required) ── */}
            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                SMS Messaging Terms &amp; Compliance
              </h2>
              <p className="text-sm text-muted mb-4">Highland Farms Oregon LLC &mdash; Effective Date: January 1, 2026</p>

              <ol className="list-decimal pl-5 space-y-4 text-sm">
                <li>
                  <strong>Program Description:</strong> This messaging program sends appointment confirmation and reminder messages to customers who have booked an appointment with Highland Farms Oregon LLC through our website at https://highlandfarmsoregon.com/, or via our scheduling forms, and have explicitly opted in to receive SMS notifications. Opt-in is collected via web forms with a dedicated checkbox for SMS consent. Messages include scheduling confirmations, appointment reminders, rescheduling updates, and customer support communications.
                </li>
                <li>
                  <strong>Cancellation Instructions:</strong> You can cancel the SMS service at any time. Simply text &ldquo;STOP&rdquo; to the same number that sent you messages. Upon sending &ldquo;STOP,&rdquo; we will confirm your unsubscribe status via SMS. Following this confirmation, you will no longer receive SMS messages from us. To rejoin, sign up as you did initially, and we will resume sending SMS messages to you.
                </li>
                <li>
                  <strong>Support Information:</strong> If you experience issues with the messaging program, reply with the keyword &ldquo;HELP&rdquo; for more assistance, or reach out directly to{" "}
                  <a href={`mailto:${CONTACT.email}`} className="text-forest underline underline-offset-2">{CONTACT.email}</a>{" "}
                  or call{" "}
                  <a href={`tel:${CONTACT.phone.replace(/\D/g, "")}`} className="text-forest underline underline-offset-2">{CONTACT.phone}</a>{" "}
                  during business hours.
                </li>
                <li>
                  <strong>Carrier Liability:</strong> Carriers are not liable for delayed or undelivered messages.
                </li>
                <li>
                  <strong>Message &amp; Data Rates:</strong> Message and data rates may apply for messages sent to you from us and to us from you. Message frequency varies based on your service usage and appointment schedule. For questions about your text plan or data plan, contact your wireless provider.
                </li>
                <li>
                  <strong>Supported Carriers:</strong> Our SMS program works with all major U.S. wireless carriers, including AT&amp;T, T-Mobile, Verizon, Sprint, and most regional carriers.
                </li>
                <li>
                  <strong>Age Restriction:</strong> You must be 18 years or older to participate in our SMS program.
                </li>
                <li>
                  <strong>Privacy Policy:</strong> For privacy-related inquiries, please refer to our{" "}
                  <a href="/privacy" className="text-forest underline underline-offset-2">Privacy Policy</a>.
                </li>
              </ol>
              <p className="text-sm mt-4">
                We comply with all applicable laws and regulations, including the Telephone Consumer Protection Act (TCPA) and CTIA guidelines, regarding the use of SMS communications.
              </p>
            </section>

            {/* ── General Terms ── */}
            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                General Terms
              </h2>
              <p>
                This website (the &ldquo;Site&rdquo;) is owned and operated by Highland Farms Oregon LLC
                (&ldquo;COMPANY,&rdquo; &ldquo;we&rdquo; or &ldquo;us&rdquo;). By using the Site, you agree to be
                bound by these Terms of Service and to use the Site in accordance with these Terms of Service,
                our Privacy Policy, and any additional terms and conditions that may apply to specific sections
                of the Site or to products and services available through the Site or from Highland Farms Oregon LLC.
              </p>
              <p className="mt-3">
                Accessing the Site, in any manner, whether automated or otherwise, constitutes use of the Site and
                your agreement to be bound by these Terms of Service.
              </p>
              <p className="mt-3">
                We reserve the right to change these Terms of Service or to impose new conditions on the use of the
                Site from time to time, in which case we will post the revised Terms of Service on this website. By
                continuing to use the Site after we post any such changes, you accept the Terms of Service, as modified.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Services
              </h2>
              <p>
                Highland Farms Oregon LLC provides event venue services (weddings, celebrations, retreats), farm tours,
                Nordic spa sessions, and short-term accommodation rentals at our property in Brightwood, Oregon. Specific
                terms for each service are provided at the time of booking and may include additional agreements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Booking &amp; Reservations
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>All bookings are subject to availability and confirmation by Highland Farms.</li>
                <li>A deposit may be required to secure your reservation. Deposit amounts and payment terms are specified at the time of booking.</li>
                <li>By booking, you agree to the pricing, dates, and specific terms communicated during the reservation process.</li>
                <li>Farm tour and spa bookings are made through our scheduling partner (Acuity Scheduling) and are subject to their terms of service in addition to ours.</li>
                <li>Accommodation bookings may be made through our booking partner (Hospitable) and are subject to their terms in addition to ours.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Cancellation &amp; Refund Policy
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  <strong>Farm tours &amp; spa sessions:</strong> Cancellations must be made at least 24 hours before your scheduled appointment for a full refund. Cancellations within 24 hours are non-refundable.
                </li>
                <li>
                  <strong>Accommodations:</strong> Cancellation terms vary by property and booking date. Specific cancellation policies are provided at the time of booking.
                </li>
                <li>
                  <strong>Weddings &amp; events:</strong> Cancellation and refund terms are outlined in your individual event agreement. Deposits are generally non-refundable. Please discuss your specific terms with our events team.
                </li>
                <li>
                  <strong>Weather:</strong> Highland Farms reserves the right to cancel or reschedule outdoor activities due to severe weather. In such cases, a full refund or reschedule will be offered.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Property Rules &amp; Guest Conduct
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li><strong>No outside pets allowed.</strong> Service animals are permitted in accordance with ADA requirements.</li>
                <li>Guests must follow all safety instructions provided by Highland Farms staff, particularly around animals and farm equipment.</li>
                <li>Smoking is prohibited inside all structures. Designated smoking areas may be available upon request.</li>
                <li>Guests are responsible for the conduct of all members of their party, including children.</li>
                <li>Highland Farms reserves the right to remove any guest who engages in disruptive, dangerous, or disrespectful behavior without refund.</li>
                <li>Maximum occupancy limits must be respected for all accommodations and event spaces.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Assumption of Risk &amp; Liability
              </h2>
              <p>
                Highland Farms is a working farm with live animals, natural terrain, and outdoor environments. By visiting
                our property, you acknowledge and accept the inherent risks associated with:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Interaction with animals (Scottish Highland Cows, sheep, poultry, dogs, etc.)</li>
                <li>Walking on uneven, natural terrain including forest paths, gravel, and grass</li>
                <li>Use of spa facilities including saunas and cold plunge</li>
                <li>Outdoor weather conditions</li>
              </ul>
              <p className="text-sm mt-3">
                To the maximum extent permitted by law, Highland Farms Oregon LLC, its owners, employees, and agents
                shall not be liable for any personal injury, property damage, or loss arising from your use of our
                property or services, except in cases of gross negligence or willful misconduct.
              </p>
              <p className="text-sm mt-2">
                You agree at all times to indemnify and hold harmless Highland Farms Oregon LLC, its affiliates, and
                their respective officers, directors, agents, and employees from any claims, causes of action, damages,
                liabilities, costs, and expenses arising out of or related to your breach of any obligation, warranty,
                or representation under these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Intellectual Property Rights
              </h2>
              <p>
                All content on this website &mdash; including text, photographs, illustrations, logos, and design &mdash;
                is the property of Highland Farms Oregon LLC and is protected by copyright, trademark, and other
                intellectual property laws. The Site is provided solely for your personal non-commercial use.
              </p>
              <p className="text-sm mt-2">
                Unless explicitly authorized, you may not modify, copy, reproduce, republish, upload, post, transmit,
                translate, sell, create derivative works, exploit, or distribute in any manner or medium any material
                from the Site. You may download and/or print one copy of individual pages for personal, non-commercial
                use, provided you keep intact all copyright and proprietary notices.
              </p>
              <p className="text-sm mt-2">
                By posting or submitting any material to us via the Site, you represent that you own the material or
                have obtained necessary permissions, and you grant us a royalty-free, perpetual, irrevocable,
                non-exclusive, worldwide license to use, modify, transmit, and distribute such material.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Photography &amp; Media
              </h2>
              <p>
                By visiting Highland Farms, you consent to being photographed or recorded for promotional purposes
                unless you notify us in writing prior to your visit. Highland Farms may use photographs taken on the
                property for marketing, social media, and website content.
              </p>
              <p className="text-sm mt-2">
                If you wish to opt out of promotional photography, please inform our team at check-in or via email at{" "}
                <a href={`mailto:${CONTACT.email}`} className="text-forest underline underline-offset-2">
                  {CONTACT.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Website Use
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>You agree not to use this website for any unlawful purpose or in any way that could damage, disable, or impair the Site.</li>
                <li>You agree not to submit false information through our inquiry forms.</li>
                <li>We reserve the right to modify, suspend, or discontinue any part of the Site at any time without notice.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Governing Law
              </h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with the laws of the State of
                Oregon. Any dispute arising under these Terms shall be resolved exclusively through binding arbitration
                in Oregon.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Changes to These Terms
              </h2>
              <p>
                We may update these Terms from time to time. The latest version will always be available on our website
                with the effective date. Continued use of the Site after changes constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-normal font-display mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions about these Terms of Service, contact us:
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
                By using our website and services, you consent to these Terms of Service.
              </p>
            </section>
          </div>
        </Container>
      </section>
    </>
  );
}
