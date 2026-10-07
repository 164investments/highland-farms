import type { Metadata } from "next";
import { StructuredData } from "@/components/layout/StructuredData";
import { BookingModalRoot, BookingTextLink } from "@/components/shared/BookingButton";
import { FieldArrow } from "@/components/ui/FieldGuide";
import {
  LegalContactAddress,
  LegalJump,
  LegalLayout,
  LegalLink,
  LegalList,
  LegalMeta,
  LegalSteps,
  LegalStrong,
  type LegalSection,
} from "@/app/_legal/LegalLayout";
import { BOOKING_LINKS, CONTACT, bookingUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Highland Farms Oregon terms of service. Review our booking terms, property rules, cancellation policy, and liability information.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

/** The strict tours and spa policy: identical wherever it appears (here, the short version and section 5). */
const CONFIRM_BEFORE_BOOKING = "Please confirm your date, time, and guest count before booking.";
const WEATHER_EXCEPTION =
  "The only exception is if we cancel for severe weather or for the safety of our animals or guests, in which case we will refund or rebook you.";

const telHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;

const bookLink = "inline-flex min-h-11 items-center gap-1.5 font-medium text-pine";

/**
 * "Ready to book?" after the policy, for a reader who came from a booking's policy line.
 * BookingTextLink keeps booking_start and opens the Acuity modal (rule 5 labels).
 */
function ReadyToBook({ placement, className }: { placement: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 text-[14px] text-ink-body", className)}>
      <p className="m-0 hidden leading-snug lg:block">Ready to book?</p>
      <BookingTextLink
        href={bookingUrl(BOOKING_LINKS.farmTourForTwo, `${placement}-tour`)}
        label="See tour dates"
        title="Private farm tour"
        className={bookLink}
      >
        <span className="border-b border-pine-line pb-0.5">See tour dates</span>
        <FieldArrow size={14} />
      </BookingTextLink>
      <BookingTextLink
        href={bookingUrl(BOOKING_LINKS.nordicSpa, `${placement}-spa`)}
        label="See open sessions"
        title="Nordic spa"
        className={bookLink}
      >
        <span className="border-b border-pine-line pb-0.5">See open sessions</span>
        <FieldArrow size={14} />
      </BookingTextLink>
    </div>
  );
}

const sections: LegalSection[] = [
  {
    id: "booking",
    title: "Booking & Reservations",
    children: (
      <LegalList>
        <>
          <LegalStrong>All bookings are subject to availability</LegalStrong> and confirmation by Highland Farms.
        </>
        <>
          <LegalStrong>Farm tours and spa sessions are paid in full when you book.</LegalStrong> For weddings, events and accommodations, any
          deposit and payment terms are specified at the time of booking.
        </>
        <>
          <LegalStrong>By booking, you agree to the pricing, dates, and specific terms</LegalStrong> communicated during
          the reservation process.
        </>
        <>
          <LegalStrong>Farm tour and spa bookings are made through our scheduling partner (Acuity Scheduling)</LegalStrong>{" "}
          and are subject to their terms of service in addition to ours.
        </>
        <>
          <LegalStrong>Accommodation bookings may be made through our booking partner (Hospitable)</LegalStrong> and are
          subject to their terms in addition to ours.
        </>
      </LegalList>
    ),
  },
  {
    id: "cancellation",
    title: "Cancellation & Refund Policy",
    emphasis: true,
    children: (
      <>
        <LegalList>
          <>
            <LegalStrong>Farm tours &amp; spa sessions:</LegalStrong> Strict cancellation policy. All bookings are
            final. We do not offer refunds, reschedules, credits, or transfers for cancellations, date changes, or
            no-shows. {CONFIRM_BEFORE_BOOKING} {WEATHER_EXCEPTION}
          </>
          <>
            <LegalStrong>Accommodations:</LegalStrong> Cancellation terms vary by property and booking date. Specific
            cancellation policies are provided at the time of booking.
          </>
          <>
            <LegalStrong>Weddings &amp; events:</LegalStrong> Cancellation and refund terms are outlined in your
            individual event agreement. Deposits are generally non-refundable. Please discuss your specific terms with
            our events team.
          </>
        </LegalList>
      </>
    ),
  },
  {
    id: "general",
    title: "General Terms",
    children: (
      <>
        <p>
          This website (the &ldquo;Site&rdquo;) is owned and operated by Highland Farms Oregon LLC
          (&ldquo;COMPANY,&rdquo; &ldquo;we&rdquo; or &ldquo;us&rdquo;). By using the Site, you agree to be bound by
          these Terms of Service and to use the Site in accordance with these Terms of Service, our Privacy Policy,
          and any additional terms and conditions that may apply to specific sections of the Site or to products and
          services available through the Site or from Highland Farms Oregon LLC.
        </p>
        <p>
          Accessing the Site, in any manner, whether automated or otherwise, constitutes use of the Site and your
          agreement to be bound by these Terms of Service.
        </p>
        <p>
          We reserve the right to change these Terms of Service or to impose new conditions on the use of the Site
          from time to time, in which case we will post the revised Terms of Service on this website. By continuing to
          use the Site after we post any such changes, you accept the Terms of Service, as modified.
        </p>
      </>
    ),
  },
  {
    id: "services",
    title: "Services",
    children: (
      <p>
        Highland Farms Oregon LLC provides event venue services (weddings, celebrations, retreats), farm tours, Nordic
        spa sessions, and short-term accommodation rentals at our property in Brightwood, Oregon. Specific terms for
        each service are provided at the time of booking and may include additional agreements.
      </p>
    ),
  },
  {
    id: "rules",
    title: "Property Rules & Guest Conduct",
    children: (
      <LegalList>
        <>
          <LegalStrong>No outside pets allowed.</LegalStrong> Service animals are permitted in accordance with ADA
          requirements.
        </>
        <>
          Guests must follow all safety instructions provided by Highland Farms staff, particularly around animals and
          farm equipment.
        </>
        <>Smoking is prohibited inside all structures. Designated smoking areas may be available upon request.</>
        <>Guests are responsible for the conduct of all members of their party, including children.</>
        <>
          Highland Farms reserves the right to remove any guest who engages in disruptive, dangerous, or disrespectful
          behavior without refund.
        </>
        <>Maximum occupancy limits must be respected for all accommodations and event spaces.</>
      </LegalList>
    ),
  },
  {
    id: "risk",
    title: "Assumption of Risk & Liability",
    children: (
      <>
        <p>
          Highland Farms is a working farm with live animals, natural terrain, and outdoor environments. By visiting
          our property, you acknowledge and accept the inherent risks associated with:
        </p>
        <LegalList>
          <>Interaction with animals (Scottish Highland Cows, sheep, poultry, dogs, etc.)</>
          <>Walking on uneven, natural terrain including forest paths, gravel, and grass</>
          <>Use of spa facilities including saunas and cold plunge</>
          <>Outdoor weather conditions</>
        </LegalList>
        <p>
          To the maximum extent permitted by law, Highland Farms Oregon LLC, its owners, employees, and agents shall
          not be liable for any personal injury, property damage, or loss arising from your use of our property or
          services, except in cases of gross negligence or willful misconduct.
        </p>
        <p>
          You agree at all times to indemnify and hold harmless Highland Farms Oregon LLC, its affiliates, and their
          respective officers, directors, agents, and employees from any claims, causes of action, damages,
          liabilities, costs, and expenses arising out of or related to your breach of any obligation, warranty, or
          representation under these Terms of Service.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual Property Rights",
    children: (
      <>
        <p>
          All content on this website, including text, photographs, illustrations, logos, and design, is the property
          of Highland Farms Oregon LLC and is protected by copyright, trademark, and other intellectual property laws.
          The Site is provided solely for your personal non-commercial use.
        </p>
        <p>
          Unless explicitly authorized, you may not modify, copy, reproduce, republish, upload, post, transmit,
          translate, sell, create derivative works, exploit, or distribute in any manner or medium any material from
          the Site. You may download and/or print one copy of individual pages for personal, non-commercial use,
          provided you keep intact all copyright and proprietary notices.
        </p>
        <p>
          By posting or submitting any material to us via the Site, you represent that you own the material or have
          obtained necessary permissions, and you grant us a royalty-free, perpetual, irrevocable, non-exclusive,
          worldwide license to use, modify, transmit, and distribute such material.
        </p>
      </>
    ),
  },
  {
    id: "photo",
    title: "Photography & Media",
    children: (
      <>
        <p>
          By visiting Highland Farms, you consent to being photographed or recorded for promotional purposes unless
          you notify us in writing prior to your visit. Highland Farms may use photographs taken on the property for
          marketing, social media, and website content.
        </p>
        <p>
          If you wish to opt out of promotional photography, please inform our team at check-in or via email at{" "}
          <LegalLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink>.
        </p>
      </>
    ),
  },
  {
    id: "site",
    title: "Website Use",
    children: (
      <LegalList>
        <>
          You agree not to use this website for any unlawful purpose or in any way that could damage, disable, or
          impair the Site.
        </>
        <>You agree not to submit false information through our inquiry forms.</>
        <>We reserve the right to modify, suspend, or discontinue any part of the Site at any time without notice.</>
      </LegalList>
    ),
  },
  {
    id: "law",
    title: "Governing Law",
    children: (
      <p>
        These Terms of Service shall be governed by and construed in accordance with the laws of the State of Oregon.
        Any dispute arising under these Terms shall be resolved exclusively through binding arbitration in Oregon.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    children: (
      <p>
        We may update these Terms from time to time. The latest version will always be available on our website with
        the effective date. Continued use of the Site after changes constitutes acceptance of the revised terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    children: (
      <>
        <p>If you have questions about these Terms of Service, contact us:</p>
        <LegalContactAddress />
        <p>By using our website and services, you consent to these Terms of Service.</p>
      </>
    ),
  },
  {
    id: "sms",
    title: "SMS Messaging Terms & Compliance",
    children: (
      <>
        <LegalMeta>Highland Farms Oregon LLC · Effective Date: January 1, 2026</LegalMeta>
        <p>
          <LegalStrong>Marketing text messages:</LegalStrong> If you check the marketing text message box on our
          contact form, you consent to receive marketing text messages from Highland Farms Oregon LLC at the phone
          number you provided. Frequency may vary. Message and data rates may apply. Text HELP for assistance. Reply
          STOP to opt out. Consent is not a condition of purchase. Appointment messages (confirmations and reminders)
          are a separate, optional choice on the same form.
        </p>
        <LegalSteps>
          <>
            <LegalStrong>Program Description:</LegalStrong> This messaging program sends appointment confirmation and
            reminder messages to customers who have booked an appointment with Highland Farms Oregon LLC through our
            website at https://highlandfarmsoregon.com/, or via our scheduling forms, and have explicitly opted in to
            receive SMS notifications. Opt-in is collected via web forms with a dedicated checkbox for SMS consent.
            Messages include scheduling confirmations, appointment reminders, rescheduling updates, and customer
            support communications.
          </>
          <>
            <LegalStrong>Cancellation Instructions:</LegalStrong> You can cancel the SMS service at any time. Simply
            text &ldquo;STOP&rdquo; to the same number that sent you messages. Upon sending &ldquo;STOP,&rdquo; we
            will confirm your unsubscribe status via SMS. Following this confirmation, you will no longer receive SMS
            messages from us. To rejoin, sign up as you did initially, and we will resume sending SMS messages to you.
          </>
          <>
            <LegalStrong>Support Information:</LegalStrong> If you experience issues with the messaging program, reply
            with the keyword &ldquo;HELP&rdquo; for more assistance, or reach out directly to{" "}
            <LegalLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</LegalLink> or call{" "}
            <span className="whitespace-nowrap">
              <LegalLink href={telHref}>{CONTACT.phone}</LegalLink>
            </span>{" "}
            during business hours.
          </>
          <>
            <LegalStrong>Carrier Liability:</LegalStrong> Carriers are not liable for delayed or undelivered messages.
          </>
          <>
            <LegalStrong>Message &amp; Data Rates:</LegalStrong> Message and data rates may apply for messages sent to
            you from us and to us from you. Message frequency varies based on your service usage and appointment
            schedule. For questions about your text plan or data plan, contact your wireless provider.
          </>
          <>
            <LegalStrong>Supported Carriers:</LegalStrong> Our SMS program works with all major U.S. wireless
            carriers, including AT&amp;T, T-Mobile, Verizon, and most regional carriers.
          </>
          <>
            <LegalStrong>Age Restriction:</LegalStrong> You must be 18 years or older to participate in our SMS
            program.
          </>
          <>
            <LegalStrong>Privacy Policy:</LegalStrong> For privacy-related inquiries, please refer to our{" "}
            <LegalLink href="/privacy">Privacy Policy</LegalLink>.
          </>
        </LegalSteps>
        <p>
          We comply with all applicable laws and regulations, including the Telephone Consumer Protection Act (TCPA)
          and CTIA guidelines, regarding the use of SMS communications.
        </p>
      </>
    ),
  },
];

const shortVersion = (
  <aside
    aria-label="The short version for tours and the spa"
    className="mt-5 max-w-[68ch] border border-frame bg-paper-shade px-4 py-4 lg:px-6 lg:py-5"
  >
    <p className="m-0 font-display text-[20px] font-semibold leading-tight text-ink lg:text-[23px]">
      The short version for tours and the spa
    </p>
    <p className="m-0 mt-2 text-[15px] leading-[1.6] text-ink-body">
      All bookings are final. Tours and the spa run rain or shine. {WEATHER_EXCEPTION}
    </p>
    <p className="m-0 mt-2 text-[15px] leading-[1.6] text-ink-body">{CONFIRM_BEFORE_BOOKING}</p>
    {/* Straight after the commitment line, so the next step sits inside the phone's first screen. */}
    <ReadyToBook placement="terms-short" className="mt-1.5" />
    <a
      href="#cancellation"
      className="mt-1 hidden min-h-11 items-center gap-2 text-[14px] font-medium text-pine lg:inline-flex"
    >
      <span className="border-b border-pine-line pb-0.5">Read the full cancellation policy</span>
    </a>
    <p className="m-0 text-[14px] text-ink-body">
      Questions before you book? Call{" "}
      {/* Link and period in one unbreakable box: the "." used to wrap alone under the number on phones. */}
      <span className="inline-flex min-h-11 items-center whitespace-nowrap">
        <a href={telHref} className="font-medium text-pine underline decoration-pine-line underline-offset-4">
          {CONTACT.phone}
        </a>
        .
      </span>
    </p>
  </aside>
);

export default function TermsOfServicePage() {
  return (
    <>
      <StructuredData pathname="/terms" />
      <BookingModalRoot />
      <LegalLayout
        policy="terms"
        title="Terms of Service"
        updated="October 7, 2026"
        sections={sections}
        closing="Still have a question about a booking?"
        headerExtra={
          <>
            <div className="hidden lg:block">
              <LegalJump
                items={[
                  { href: "#cancellation", label: "Cancellations" },
                  { href: "#rules", label: "Rules" },
                  { href: "#photo", label: "Photography" },
                ]}
              />
            </div>
            {shortVersion}
          </>
        }
      />
    </>
  );
}
