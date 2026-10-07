import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier, resolveFieldQuote } from "@/components/field/Reviews";
import { cancellationAnswer } from "@/components/field/Faq";
import { FieldStickyBar } from "@/components/field/StickyBar";
import {
  FieldArrow,
  FieldDrawing,
  FieldNo,
  FieldQuoteView,
  FieldRows,
  FieldSectionHeader,
  PendingSlot,
  Plate,
  fieldEyebrowClass,
  fieldLabelClass,
  fieldTextLinkClass,
  type FieldDrawingName,
} from "@/components/ui/FieldGuide";
import { FieldArrowDown, StayPhoto } from "@/components/stay/StayParts";
import { CELEBRATION_FORM_QUOTE, CELEBRATION_QUOTES } from "@/components/stay/stay-content";
import { PHONE_TEL, SPA_PRIVATE_SESSION, STAY_MINIMUM, TOUR_EACH_ADDITIONAL, TOUR_FOR_TWO } from "@/components/stay/stay-facts";
import { properties } from "@/data/properties";
import { farmTourFAQ } from "@/data/farm-tours";
import { nordicSpaFAQ } from "@/data/nordic-spa";
import { CONTACT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Celebrations & Events",
  description:
    "Host your engagement party, birthday, rehearsal dinner, anniversary, or special celebration at Highland Farms in Brightwood, Oregon. Scottish Highland Cows, forest setting, Nordic spa, and on-site lodging near Portland.",
  alternates: { canonical: "/celebrations" },
  openGraph: {
    title: "Celebrations & Events · Highland Farms Oregon",
    description:
      "Host your engagement party, birthday, rehearsal dinner, or special celebration at Highland Farms in Brightwood, Oregon.",
    images: [
      {
        url: "/images/events/celebrations-hero.jpg",
        width: 1200,
        height: 630,
        alt: "A long table on the lawn at Highland Farms, with every glass raised",
      },
    ],
  },
};

/** Up to 125 can gather on the farm (the form's top band); the farm sleeps up to 20 (properties.ts). */
const GATHERING_MAX_GUESTS = 125;

const lodge = properties.find((p) => p.slug === "lodge")!;
const cottage = properties.find((p) => p.slug === "cottage")!;
const wholeFarm = properties.find((p) => p.slug === "whole-farm")!;
/** Each house sleeps 8, so "one house" covers up to 8; the whole farm takes it from 9 to 20. */
const ONE_HOUSE_MAX = Math.max(lodge.guests, cottage.guests);
const BANDS = {
  house: `Up to ${ONE_HOUSE_MAX}`,
  farm: `${ONE_HOUSE_MAX + 1} to ${wholeFarm.guests}`,
  gathering: `${wholeFarm.guests + 1} to ${GATHERING_MAX_GUESTS}`,
};

/**
 * The same frame as weddings/olivia-connor/01.jpg (a wedding dinner), so the
 * caption says so: it never passes a wedding off as a birthday or reunion.
 */
const HERO_PHOTO = {
  src: "/images/events/celebrations-hero.jpg",
  alt: "Wedding guests raise their glasses along one long table set on the lawn under string lights, with a cabin and tall firs behind",
  position: "50% 45%",
};

const bring: { drawing: FieldDrawingName; title: string; body: string }[] = [
  {
    drawing: "highland-cow-head",
    title: "The herd",
    body: `A private hour with the Highland cows: feed, brush and pet them. 2 to 6 guests per tour, $${TOUR_FOR_TWO} for two and $${TOUR_EACH_ADDITIONAL} for each additional guest.`,
  },
  {
    drawing: "sauna-cabin",
    title: "The Nordic spa",
    body: `A wood-burning dry sauna, a wet sauna and a cold plunge for 90 minutes, ages 16 and up. Book all six spots for a private session, $${SPA_PRIVATE_SESSION}.`,
  },
  {
    drawing: "douglas-fir-sprig",
    title: "Five acres of forest",
    body: "Tall firs and ferns, a flagstone patio and a pond.",
  },
];

/** The first-screen headcount picker (phone and desktop): one short line each, so all three rows fit in 660px. */
const HEADCOUNT_ROWS = [
  { band: BANDS.house, title: "One house", note: "The Lodge or the Cottage", href: "#one-house" },
  { band: BANDS.farm, title: "The whole farm", note: `All three stays, sleeps ${wholeFarm.guests}`, href: "/stay/whole-farm#book" },
  { band: BANDS.gathering, title: "A gathering", note: "Check your date with us", href: "#contact" },
];

const ladderLinkClass = cn("mt-1 inline-flex min-h-11 items-center gap-1.5 text-[14px] lg:text-[15px]", fieldTextLinkClass);
const sizeNumClass = "font-display text-[34px] font-medium leading-none text-ink lg:text-[56px]";
const ladderRowClass =
  "scroll-mt-[var(--header-h,104px)] grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 border-b border-rule py-5 lg:grid-cols-[240px_300px_minmax(0,1fr)] lg:gap-x-12 lg:py-8";

export default function CelebrationsPage() {
  const occasions = CELEBRATION_QUOTES.flatMap(({ occasion, quote }) => {
    const q = resolveFieldQuote(quote.spec, { role: quote.role });
    return q ? [{ occasion, q }] : [];
  });
  // Both visits are sold on this page, so both strict lines show, word for word from their data files.
  const tourPolicy = cancellationAnswer(farmTourFAQ);
  const spaPolicy = cancellationAnswer(nordicSpaFAQ);

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname="/celebrations" />

      {/* 1. Hero: centred, then the headcount picker as the first step (no form first). */}
      <section className="px-5 pt-5 pb-9 lg:px-16 lg:pt-14 lg:pb-16">
        <div className="mx-auto max-w-[1312px]">
          <div className="lg:mx-auto lg:max-w-[860px] lg:text-center">
            <p className={cn("m-0 text-[17px] lg:text-[22px]", fieldEyebrowClass)}>Birthdays, reunions and retreats</p>
            <h1 className="field-heading m-0 mt-1 font-display text-[33px] leading-[1.02] text-ink lg:mt-3 lg:text-[64px]">
              Gather your people on a Highland cow farm.
            </h1>
          </div>
          <div className="mt-4 lg:mt-10">
            <Plate
              caption="A wedding dinner at one long table on the lawn by the Lodge."
              captionClassName="lg:text-center"
              frameClassName="h-[192px] min-[380px]:h-[214px] lg:h-[500px]"
            >
              <StayPhoto photo={HERO_PHOTO} sizes="(min-width: 1440px) 1312px, 100vw" priority />
            </Plate>
          </div>
          <FieldReviewTier tier="hero" link className="lg:hidden" />
          <nav aria-label="Choose by group size" data-hero-cta className="lg:hidden">
            <p className={cn("m-0 mt-1 font-medium", fieldLabelClass)}>How many are coming?</p>
            <div className="mt-2 flex flex-col border-t border-ink/70">
              {HEADCOUNT_ROWS.map((r) => (
                <ClientLink key={r.title} href={r.href} className="flex min-h-[60px] items-center gap-3 border-b border-rule py-2">
                  <span className="w-[92px] shrink-0 font-display text-[24px] font-medium leading-none text-ink">{r.band}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-[19px] font-semibold leading-tight text-ink">{r.title}</span>
                    <span className="font-sans text-[12px] text-ink-note">{r.note}</span>
                  </span>
                  <span className="text-pine">
                    <FieldArrow />
                  </span>
                </ClientLink>
              ))}
            </div>
          </nav>
          <p className="m-0 mt-4 font-sans text-[15px] leading-[1.55] text-ink-body lg:hidden">
            A private forest farm, about an hour from Portland.
          </p>
          <div className="hidden lg:mx-auto lg:mt-10 lg:block lg:max-w-[1100px]">
            <div className="flex items-baseline justify-between gap-10">
              <p className={cn("m-0 font-medium", fieldLabelClass)}>How many are coming?</p>
              <FieldReviewTier tier="hero" link />
            </div>
            <nav aria-label="Choose by group size" data-hero-cta className="mt-3 grid grid-cols-3 gap-10">
              {HEADCOUNT_ROWS.map((r) => (
                <ClientLink key={r.title} href={r.href} className="flex flex-col gap-2 border-t border-ink/70 pt-4">
                  <span className="font-display text-[44px] font-medium leading-none text-ink">{r.band}</span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-[22px] font-semibold leading-tight text-ink">{r.title}</span>
                    <span className="text-pine">
                      <FieldArrow />
                    </span>
                  </span>
                  <span className="font-sans text-[14px] text-ink-note">{r.note}</span>
                </ClientLink>
              ))}
            </nav>
            <p className="mx-auto mt-8 max-w-[760px] text-center font-sans text-[17px] leading-[1.6] text-ink-body">
              A private forest farm, about an hour from Portland.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Plan it by headcount: true capacities. */}
      <section
        aria-labelledby="plan-title"
        className="border-t-[3px] border-double border-frame px-5 pt-9 pb-10 lg:px-16 lg:pt-16 lg:pb-20"
      >
        <div className="mx-auto max-w-[1312px]">
          <FieldSectionHeader id="plan-title" size="md" eyebrow="Three ways to gather" title="Plan it by headcount" />
          <ol className="m-0 mt-6 flex list-none flex-col border-t border-ink/70 p-0 lg:mt-10">
            <li id="one-house" className={ladderRowClass}>
              <BandHead band={BANDS.house} />
              <LadderPhoto
                photo={{
                  src: "/images/properties/cottage-exterior-2.jpg",
                  alt: "Bonnie Lass Cottage, a cedar cabin with a barn-style roof, backlit among tall firs",
                  position: "50% 50%",
                }}
              />
              <div className="mt-3 lg:order-2 lg:mt-0">
                <LadderTitle>One house for the weekend</LadderTitle>
                <p className="m-0 mt-1.5 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                  The Lodge or the Cottage, each sleeping {ONE_HOUSE_MAX} with a cedar hot tub. Book it online today, then add a private farm tour or the Nordic spa.
                </p>
                <div className="mt-1 flex flex-col items-start">
                  <Link href="/stay/lodge#book" className={ladderLinkClass}>
                    Check the Lodge&apos;s dates
                    <FieldArrow size={16} />
                  </Link>
                  <Link href="/stay/cottage#book" className={ladderLinkClass}>
                    Check the Cottage&apos;s dates
                    <FieldArrow size={16} />
                  </Link>
                </div>
              </div>
            </li>
            <li id="whole-farm" className={ladderRowClass}>
              <BandHead band={BANDS.farm} />
              <LadderPhoto
                photo={{
                  src: "/images/properties/lodge-living-room.jpg",
                  alt: "The Lodge dining room, a long table and chairs beside the stone fireplace",
                  position: "50% 55%",
                }}
              />
              <div className="mt-3 lg:order-2 lg:mt-0">
                <LadderTitle>The whole farm</LadderTitle>
                <p className="m-0 mt-1.5 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                  The Lodge, the Cottage and the Camp together sleep {wholeFarm.guests}, with two cedar hot tubs and the Lodge&apos;s dining table for ten. Book it online today.
                </p>
                <div className="mt-1 flex flex-col items-start">
                  <Link href="/stay/whole-farm#book" className={ladderLinkClass}>
                    Check the whole farm&apos;s dates
                    <FieldArrow size={16} />
                  </Link>
                </div>
              </div>
            </li>
            <li id="larger" className={ladderRowClass}>
              <BandHead band={BANDS.gathering} />
              <LadderPhoto
                photo={{
                  src: "/images/events/forest-yoga.jpg",
                  alt: "A group resting on blankets on the flagstone patio under tall firs",
                  position: "50% 70%",
                }}
              />
              <div className="mt-3 lg:order-2 lg:mt-0">
                <LadderTitle>A gathering on the farm</LadderTitle>
                <p className="m-0 mt-1.5 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Tell us what you&apos;re planning.
                </p>
                <PendingSlot
                  className="mt-2"
                  note="PENDING CONNOR NEW Q: which non-wedding events over 20 guests are sold (day-only, evening), and what comes with them"
                />
                <div className="mt-1 flex flex-col items-start">
                  <a href="#contact" className={ladderLinkClass}>
                    Check your date
                    <FieldArrowDown size={16} />
                  </a>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* 3. In their words: the occasion as the term (none of these reviews is on another page). */}
      {occasions.length > 0 && (
        <section id="words" aria-labelledby="words-title" className="scroll-mt-[var(--header-h,104px)] bg-paper-shade px-5 py-10 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-[1312px]">
            <FieldSectionHeader id="words-title" size="md" eyebrow="In their words" title="What people came to celebrate" />
            <ol className="m-0 mt-6 grid list-none grid-cols-1 border-t border-rule p-0 lg:mt-10 lg:grid-cols-3 lg:gap-12 lg:border-t-0">
              {occasions.map(({ occasion, q }, i) => (
                <li key={occasion} className="border-b border-rule py-5 lg:border-b-0 lg:border-t lg:py-6">
                  <FieldNo n={i + 1} />
                  <h3 className="field-heading m-0 mt-1 font-display text-[24px] leading-tight text-ink lg:text-[28px]">{occasion}</h3>
                  <FieldQuoteView {...q} size="sm" className="mt-2" quoteClassName="text-[19px] lg:text-[21px]" />
                </li>
              ))}
            </ol>
            <FieldReviewTier tier="compact" link className="mt-3" />
          </div>
        </section>
      )}

      {/* 4. What the farm brings: three entries (the houses and hot tubs are in the ladder). */}
      <section aria-labelledby="brings-title" className="px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <FieldSectionHeader
            id="brings-title"
            size="md"
            eyebrow="On the farm"
            title="What the farm brings to the party"
            intro="Tours and spa sessions are booked and priced separately from a stay."
            introClassName="text-[15px] lg:text-[16px]"
          />
          <ol className="m-0 mt-6 flex list-none flex-col border-t border-rule p-0 lg:mt-0">
            {bring.map((b, i) => (
              <li key={b.title} className="flex items-center gap-4 border-b border-rule py-4 lg:gap-8 lg:py-6">
                <FieldDrawing
                  name={b.drawing}
                  className="h-[64px] w-[64px] shrink-0 lg:h-[96px] lg:w-[96px]"
                  sizes="(min-width: 1024px) 96px, 64px"
                />
                <div>
                  <FieldNo n={i + 1} />
                  <h3 className="field-heading m-0 mt-0.5 font-display text-[22px] leading-tight text-ink lg:text-[28px]">{b.title}</h3>
                  <p className="m-0 mt-1 font-sans text-[14px] leading-[1.5] text-ink-body lg:text-[16px]">{b.body}</p>
                  {i === 0 && (
                    <PendingSlot
                      className="mt-2"
                      note="PENDING CONNOR: for groups over six, can they book back-to-back tours (10, 12, 2, 4) or a group visit with the herd, and how does the spa work for more than six?"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Know before you plan. */}
      <section aria-labelledby="plan-know-title" className="border-t border-rule px-5 py-10 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <FieldSectionHeader id="plan-know-title" size="md" title="Know before you plan" titleClassName="lg:text-[40px]" />
          <FieldRows
            size="list"
            className="mt-5 lg:mt-0"
            rowClassName="flex-col gap-1 py-3.5 lg:flex-row lg:gap-6 lg:py-5"
            termClassName="w-auto text-[20px] lg:w-[180px] lg:text-[22px]"
            detailClassName="text-[15px] leading-[1.55] lg:text-[16px]"
            rows={[
              { term: "Stays", detail: `${STAY_MINIMUM} No outside pets.` },
              ...(tourPolicy ? [{ term: "Farm tours", detail: tourPolicy }] : []),
              ...(spaPolicy ? [{ term: "Nordic spa", detail: spaPolicy }] : []),
              { term: "Ages", detail: `The spa is for guests 16 and up. On farm tours, kids 4 and under are free.` },
              { term: "Access", detail: "Farm tours and the spa aren't wheelchair, walker or stroller accessible." },
            ]}
          />
        </div>
      </section>

      {/* 6. The form (#contact), with a matched review directly above it. */}
      <section
        id="contact"
        aria-labelledby="contact-title"
        data-sticky-stop
        className="scroll-mt-[var(--header-h,104px)] border-t-[3px] border-double border-frame px-5 py-10 lg:px-16 lg:py-20"
      >
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <p className={cn("m-0 text-[17px] lg:text-[20px]", fieldEyebrowClass)}>Check your date</p>
            <div className="mt-3">
              <FieldReview
                spec={CELEBRATION_FORM_QUOTE.spec}
                role={CELEBRATION_FORM_QUOTE.role}
                size="sm"
                rule
                quoteClassName="text-[19px] lg:text-[22px]"
              />
            </div>
            <h2
              id="contact-title"
              className="field-heading m-0 mt-6 font-display text-[32px] leading-[1.05] text-ink lg:text-[48px]"
            >
              Tell us about your gathering
            </h2>
            <p className="m-0 mt-3 font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[17px]">
              We check the farm calendar and write back with what fits. No commitment.
            </p>
            <PendingSlot
              className="mt-2"
              note='PENDING CONNOR: first name of who answers group inquiries; then the line reads "[Name] checks the farm calendar and writes back with what fits."'
            />
            <p className="m-0 mt-4 font-sans text-[14px] leading-[1.55] text-ink-note lg:text-[15px]">
              Prefer to talk? Call{" "}
              <a href={PHONE_TEL} className="whitespace-nowrap font-medium text-pine underline underline-offset-4">
                {CONTACT.phone}
              </a>
              .
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            {/* The built inquiry form in its non-wedding mode: event type preset (hidden), event guest bands, no wedding call or look book. */}
            <ContactForm
              defaultEventType="celebration"
              heading=""
              subtitle=""
              ctaText="Check my date"
              showSoftPaths={false}
              placement="celebrations"
            />
          </div>
        </div>
      </section>

      {/* 7. Wedding router. */}
      <section className="bg-paper-shade px-5 py-8 lg:px-16 lg:py-12">
        <div className="mx-auto flex max-w-[1312px] flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <p className="m-0 font-display text-[22px] leading-tight text-ink lg:text-[28px]">Planning a wedding instead?</p>
          <Link href="/weddings" className={cn("inline-flex min-h-11 items-center gap-1.5 self-start lg:self-auto", fieldTextLinkClass)}>
            See weddings at Highland Farms
            <FieldArrow size={16} />
          </Link>
        </div>
      </section>

      <FieldStickyBar
        primary={{
          label: "Check your date",
          sublabel: `Up to ${GATHERING_MAX_GUESTS} gather · up to ${wholeFarm.guests} stay the night`,
          href: "#contact",
        }}
        hideWhenVisible="#contact"
      />
    </div>
  );
}

/** A row link: a site path through next/link, a hash as a plain anchor. */
function ClientLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function BandHead({ band }: { band: string }) {
  return (
    <p className="col-span-2 m-0 flex items-baseline gap-3 lg:col-span-1 lg:flex-col lg:gap-1">
      <span className={sizeNumClass}>{band}</span>
      <span className={cn("font-medium", fieldLabelClass)}>guests</span>
    </p>
  );
}

function LadderTitle({ children }: { children: ReactNode }) {
  return <h3 className="field-heading m-0 font-display text-[23px] leading-[1.1] text-ink lg:text-[30px]">{children}</h3>;
}

function LadderPhoto({ photo }: { photo: { src: string; alt: string; position: string } }) {
  return (
    <div className="mt-3 lg:order-3 lg:mt-0">
      <Plate frameClassName="h-[104px] p-[5px] lg:h-[220px] lg:p-2">
        <StayPhoto photo={photo} sizes="(min-width: 1024px) 40vw, 40vw" />
      </Plate>
    </div>
  );
}
