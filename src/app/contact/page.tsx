import type { Metadata } from "next";
import Image from "next/image";
import { StructuredData } from "@/components/layout/StructuredData";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import { FieldReview } from "@/components/field/Reviews";
import { ContactForm } from "@/components/forms/ContactForm";
import {
  FieldArrow,
  FieldLink,
  FieldNumeral,
  PendingSlot,
  fieldCtaClass,
  fieldEyebrowClass,
} from "@/components/ui/FieldGuide";
import { FooterHide } from "@/components/layout/Footer";
import { giftCertificatesHref } from "@/lib/booking/flag";
import { CONTACT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CONTACT_FORM_QUOTE } from "./quotes";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Highland Farms for weddings, farm tours, Nordic spa sessions, and farm stays in Brightwood, Oregon. About an hour from Portland. Call (971) 236-2551.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us · Highland Farms Oregon",
    description:
      "Contact Highland Farms for weddings, farm tours, Nordic spa sessions, and farm stays in Brightwood, Oregon.",
    images: [
      {
        url: "/images/farm/contact-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Highland Farms in Brightwood, Oregon",
      },
    ],
  },
};

const telHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;
const inlineLink = "font-medium text-pine underline decoration-pine-line underline-offset-4";
/** The phone link with its trailing period, unbreakable, so the "." never sits alone on a line. */
const phoneThenStop = (
  <span className="whitespace-nowrap">
    <a href={telHref} className={inlineLink}>
      {CONTACT.phone}
    </a>
    .
  </span>
);

const mapsQuery = encodeURIComponent(CONTACT.fullAddress);
interface Door {
  title: string;
  href: string;
  external?: boolean;
}

function doors(): Door[] {
  const gift = giftCertificatesHref();
  return [
    { title: "Farm tours", href: "/farm-tours" },
    { title: "Nordic spa", href: "/nordic-spa" },
    { title: "Stays", href: "/stay" },
    { title: "Parties and retreats", href: "/celebrations" },
    { title: "Gift certificates", href: gift, external: gift.startsWith("http") },
    { title: "Farm shop", href: "/shop" },
  ];
}

const steps = [
  { title: "The drive.", body: "About an hour from Portland, or about 25 minutes from Government Camp." },
  {
    title: "Parking.",
    body: "Pull through the gate and park on the right, in the gravel. Look for the parking sign.",
  },
  {
    title: "Meeting point.",
    body: "For a tour, wait at the carved Highland cow out front. Your guide meets you there.",
  },
] as const;

const rowLink = "flex min-h-[56px] items-center justify-between gap-3 border-b border-rule py-2.5";
/* Address over its label on phones (both rows alike), side by side from lg. Labels match the footer's. */
const emailLink = "flex min-h-11 flex-col justify-center py-1 text-[13.5px] lg:flex-row lg:items-center lg:justify-start lg:gap-x-2";
const mapLink = "inline-flex min-h-11 items-center text-[14px] font-medium text-pine";

export default function ContactPage() {
  return (
    <>
      <StructuredData pathname="/contact" />
      <FooterHide parts={["doors"]} />
      <div className="surface-paper bg-paper pt-[var(--header-h)] font-sans text-ink">
        <section aria-labelledby="contact-title" className="px-5 pb-10 pt-4 lg:px-16 lg:pb-20 lg:pt-12">
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-16">
            {/* First screen: promise, proof, a couple with a calf, one primary.
                The photo is from a styled session (wedding-portfolio.ts: status "styled"):
                its caption and alt name no couple and claim no real wedding (CONSISTENCY #3). */}
            <div className="lg:col-start-1 lg:row-start-1">
              <p className={cn(fieldEyebrowClass, "m-0 text-[17px] lg:text-[20px]")}>Contact Highland Farms</p>
              <h1
                id="contact-title"
                className="field-heading m-0 mt-1 font-display text-[34px] leading-[1.03] lg:text-[54px]"
              >
                Reach the right person at Highland Farms.
              </h1>
              <p className="m-0 mt-2.5 text-[14.5px] leading-[1.55] text-ink-body lg:mt-4 lg:text-[17px]">
                Tours, the spa and stays book online any time. Already booked or running late? Call {phoneThenStop}
              </p>

              <div className="mt-4 border-t border-rule pt-4 lg:mt-7 lg:pt-6">
                <figure className="m-0 grid grid-cols-[118px_1fr] items-center gap-x-4 lg:grid-cols-[180px_1fr] lg:gap-x-6">
                  <div className="h-[150px] border border-frame bg-paper-light p-[5px] lg:h-[230px] lg:p-2">
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        src="/images/weddings/hannah-max/06.jpg"
                        alt="Two people in wedding clothes hold hands among enormous mossy tree trunks"
                        fill
                        priority
                        sizes="(min-width: 1024px) 180px, 118px"
                        className="object-cover object-[40%_76%]"
                      />
                    </div>
                  </div>
                  <figcaption>
                    <span className="block font-display text-[22px] font-semibold leading-tight lg:text-[28px]">
                      Planning a wedding?
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-[1.45] text-ink-body lg:text-[15px]">
                      Our events team checks your date.
                    </span>
                    <span className="mt-2 block font-display text-[14px] italic leading-snug text-ink-note lg:text-[16px]">
                      Hand in hand, under the big trees.
                    </span>
                  </figcaption>
                </figure>
                <FieldLink
                  href="#inquiry"
                  data-hero-cta=""
                  className={cn(fieldCtaClass, "mt-3.5 w-full lg:hidden")}
                >
                  Check your date
                  <FieldArrow />
                </FieldLink>
                <WeddingCallLink
                  content="contact-hero"
                  title="Contact: wedding call"
                  className="mt-2 flex min-h-11 items-center gap-3 lg:mt-5"
                >
                  <span className="shrink-0 border border-frame bg-paper-light p-[2px]">
                    <Image
                      src="/images/team/connor-mcwilliams.jpg"
                      alt=""
                      width={192}
                      height={192}
                      sizes="36px"
                      className="block h-9 w-9 object-cover"
                    />
                  </span>
                  <span className="border-b border-rule pb-0.5 text-[14.5px] text-ink-body lg:text-[15px]">
                    Book a free 45-minute call with Connor
                  </span>
                </WeddingCallLink>
              </div>
            </div>

            {/* The built inquiry form, general mode: no event type is preset, so a tour or stay question is never
                filed (and counted in ads) as a wedding lead. Parties have their own page and form (/celebrations),
                so the router sends them there. */}
            <div
              id="inquiry"
              className="mt-8 scroll-mt-[var(--header-h)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0"
            >
              <div className="border border-frame bg-paper px-4 py-7 lg:p-10">
                <ContactForm
                  heading="Check your date"
                  headingLevel="h2"
                  subtitle="Now booking 2027 weddings. Tell us your month and guest count, and we'll check the farm calendar for you. No commitment."
                  placement="contact"
                  softPathsForAll
                />
              </div>
              <FieldReview
                spec={CONTACT_FORM_QUOTE}
                role="Wedding"
                size="sm"
                rule
                className="mt-6 lg:mt-8"
              />
            </div>

            {/* Everything else: one row per reason. */}
            <nav aria-label="Other ways to reach the farm" className="mt-10 lg:col-start-1 lg:row-start-2 lg:mt-12">
              <p className={cn(fieldEyebrowClass, "m-0 text-[17px] lg:text-[20px]")}>Everything else</p>
              <ul role="list" className="m-0 mt-2 list-none border-t border-rule p-0">
                {doors().map((door) => (
                  <li key={door.title}>
                    <FieldLink href={door.href} external={door.external} className={rowLink}>
                      <span className="font-display text-[21px] font-semibold leading-tight">{door.title}</span>
                      <FieldArrow size={16} className="text-fern" />
                    </FieldLink>
                  </li>
                ))}
                <li className="border-b border-rule py-2.5">
                  <span className="block font-display text-[21px] font-semibold leading-tight">Email</span>
                  <a href={`mailto:${CONTACT.email}`} className={emailLink}>
                    <span className="font-medium text-ink underline decoration-rule underline-offset-4">
                      {CONTACT.email}
                    </span>
                    <span className="text-ink-note">Weddings</span>
                  </a>
                  <a href={`mailto:${CONTACT.emailAlt}`} className={emailLink}>
                    <span className="font-medium text-ink underline decoration-rule underline-offset-4">
                      {CONTACT.emailAlt}
                    </span>
                    <span className="text-ink-note">Everything else</span>
                  </a>
                </li>
              </ul>
              <PendingSlot
                note="PENDING CONNOR: events over 20 guests. Once confirmed, the Parties and retreats row can add “up to 125”."
                className="mt-2"
              />
            </nav>
          </div>
        </section>

        {/* Finding the farm: a sequence in time (Roman numerals). */}
        <section
          aria-labelledby="contact-find-title"
          className="border-t-[3px] border-double border-frame px-5 pb-12 pt-9 lg:px-16 lg:pb-24 lg:pt-20"
        >
          <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
            <div>
              <p className={cn(fieldEyebrowClass, "m-0 text-[17px] lg:text-[20px]")}>Finding the farm</p>
              <h2
                id="contact-find-title"
                className="m-0 mt-1 font-display text-[26px] font-medium leading-[1.2] lg:text-[36px]"
              >
                {CONTACT.address},
                <br />
                {CONTACT.city}, {CONTACT.state} {CONTACT.zip}
              </h2>
              <div className="mt-1 flex gap-6">
                <FieldLink
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  external
                  className={mapLink}
                >
                  <span className="border-b border-pine-line pb-0.5">Google Maps</span>
                </FieldLink>
                <FieldLink href={`https://maps.apple.com/?q=${mapsQuery}`} external className={mapLink}>
                  <span className="border-b border-pine-line pb-0.5">Apple Maps</span>
                </FieldLink>
              </div>
            </div>
            <ol role="list" className="m-0 mt-4 list-none border-t border-rule p-0 lg:mt-0">
              {steps.map((step, i) => (
                <ArrivalStep key={step.title} n={i + 1} title={step.title}>
                  {step.body}
                </ArrivalStep>
              ))}
              <ArrivalStep n={4} title="Running late?">
                Call {phoneThenStop} Tours start on time, rain or shine. More than 10 minutes late, and a tour may be
                shortened or cancelled at your expense (15 minutes for the spa).
              </ArrivalStep>
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}

function ArrivalStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[34px_1fr] gap-x-2 border-b border-rule py-3.5 lg:grid-cols-[48px_1fr] lg:py-4">
      <FieldNumeral n={n} className="text-[26px] lg:text-[30px]" />
      <p className="m-0 text-[14.5px] leading-[1.55] text-ink-body lg:text-[16px]">
        <span className="font-display text-[19px] font-semibold text-ink lg:text-[22px]">{title}</span> {children}
      </p>
    </li>
  );
}
