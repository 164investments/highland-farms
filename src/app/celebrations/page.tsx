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
  fieldCtaClass,
  fieldEyebrowClass,
  fieldLabelClass,
  fieldTextLinkClass,
  type FieldDrawingName,
} from "@/components/ui/FieldGuide";
import { FieldArrowDown, StayPhoto } from "@/components/stay/StayParts";
import { CELEBRATION_FORM_QUOTE, CELEBRATION_QUOTES } from "@/components/stay/stay-content";
import { PHONE_TEL, STAY_MINIMUM } from "@/components/stay/stay-facts";
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
        url: "/images/events/forest-yoga.jpg",
        width: 1200,
        height: 630,
        alt: "A group resting on blankets on the flagstone patio under tall firs at Highland Farms",
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
 * Board C hero: a real guest photo, no wedding. The caption says only what the
 * frame shows (a gold 3 balloon, a cowboy hat and a Highland cow).
 */
const HERO_PHOTO = {
  src: "/images/farm/events-retreats.jpg",
  alt: "A child in a white cowboy hat and fringed denim jacket holds a gold 3 balloon beside a Highland cow",
  position: "50% 21%",
  caption: "A gold 3 balloon, a cowboy hat and a Highland cow.",
};

const bring: { drawing: FieldDrawingName; title: string; body: string }[] = [
  {
    drawing: "highland-cow-head",
    title: "The herd",
    body: "A private hour with the Highland cows, for 2 to 6 guests per tour.",
  },
  {
    drawing: "sauna-cabin",
    title: "The Nordic spa",
    body: "A wood-burning sauna, a wet sauna and a cold plunge for 90 minutes. Book all six spots for a private session.",
  },
  {
    drawing: "douglas-fir-sprig",
    title: "Five acres of forest",
    body: "Tall firs and ferns, a flagstone patio and a pond.",
  },
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
  // RULINGS #8: one closed row holds both strict answers, word for word from their data files,
  // beside the visit actions and never above the inquiry form.
  const tourPolicy = cancellationAnswer(farmTourFAQ);
  const spaPolicy = cancellationAnswer(nordicSpaFAQ);
  const visitPolicy = [
    { label: "Farm tours", text: tourPolicy },
    { label: "Nordic spa", text: spaPolicy },
  ].filter((p): p is { label: string; text: string } => Boolean(p.text));

  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname="/celebrations" />

      {/* 1. Hero (board C): the promise, the largest coo photo and one button. The headcount ladder is screen 2.
          Desktop is the home and tours split (7/5): the photo is a 2:3 portrait, and the old full-width 560px
          band kept 28% of it, cutting the cow's horns and the balloon (Hayden 2026-10-08 crop audit). */}
      <section className="px-5 pt-5 pb-9 lg:px-16 lg:pt-14 lg:pb-16">
        <div className="mx-auto flex max-w-[1312px] flex-col lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[1fr_repeat(3,auto)_1fr] lg:gap-x-16">
          <div className="lg:col-start-1 lg:row-start-2">
            <p className={cn("m-0 text-[17px] lg:text-[22px]", fieldEyebrowClass)}>Birthdays, reunions and retreats</p>
            <h1 className="field-heading m-0 mt-1 font-display text-[33px] leading-[1.02] text-ink max-[359px]:text-[29px] lg:mt-3 lg:max-w-[640px] lg:text-[64px]">
              Gather your people on a Highland cow farm.
            </h1>
          </div>
          <div className="mt-3 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:mt-0">
            <Plate
              caption={HERO_PHOTO.caption}
              frameClassName="h-[290px] max-[359px]:h-[218px] lg:aspect-[3/4] lg:h-auto"
            >
              {/* Desktop shows horn tips to boots (about 89% of the height); phones keep their 21% band. */}
              <StayPhoto
                photo={HERO_PHOTO}
                sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, 100vw"
                priority
                className="lg:![object-position:50%_30%]"
              />
            </Plate>
          </div>
          {/* Plain text, as on the other visit pages: no link out to Google on the first screen. */}
          <FieldReviewTier tier="hero" className="mt-2.5 lg:col-start-1 lg:row-start-3 lg:mt-7" />
          <div data-hero-cta className="mt-3.5 flex flex-col items-stretch lg:col-start-1 lg:row-start-4 lg:mt-7 lg:flex-row lg:items-center lg:gap-7">
            <a href="#contact" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
              Check your date
              <FieldArrow />
            </a>
            <a
              href="#headcount"
              className="mt-1 inline-flex min-h-11 items-center justify-center gap-1.5 self-center font-sans text-[14px] text-ink-note lg:mt-0 lg:text-[15px]"
            >
              Or choose by headcount
              <FieldArrowDown size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Plan it by headcount: true capacities. */}
      <section
        id="headcount"
        aria-labelledby="plan-title"
        className="scroll-mt-[var(--header-h,104px)] border-t-[3px] border-double border-frame px-5 pt-9 pb-10 lg:px-16 lg:pt-16 lg:pb-20"
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
                <LadderTitle>One house</LadderTitle>
                <p className="m-0 mt-1.5 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                  The Lodge or the Cottage, each sleeping {ONE_HOUSE_MAX} with a cedar hot tub.
                </p>
                <div className="mt-1 flex flex-col items-start">
                  <Link href="/stay" className={ladderLinkClass}>
                    See the Lodge and Cottage
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
                  The Lodge, the Cottage and the Camp together sleep {wholeFarm.guests}.
                </p>
                <div className="mt-1 flex flex-col items-start">
                  <Link href="/stay/whole-farm#book" className={ladderLinkClass}>
                    See the whole farm
                    <FieldArrow size={16} />
                  </Link>
                </div>
              </div>
            </li>
            <li id="larger" className={ladderRowClass}>
              <BandHead band={BANDS.gathering} />
              {/* The forest-yoga photo is now the hero, so this rung shows the grounds (no repeat on the page). */}
              <LadderPhoto
                photo={{
                  src: "/images/farm/farm-aerial-patio-lawn-lodge-dusk.jpg",
                  alt: "Styled aerial view at dusk: guests on the patio outside the Lodge, the lawn path and the stone patio with its dance floor",
                  position: "70% 60%",
                }}
                caption="A styled aerial view of the farm."
              />
              <div className="mt-3 lg:order-2 lg:mt-0">
                <LadderTitle>A gathering on the farm</LadderTitle>
                <p className="m-0 mt-1.5 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Tell us what you&apos;re planning.
                </p>
                <p className="m-0 mt-1 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                  Birthdays, reunions, retreats and company days.
                </p>
                {/* Jalene, 2026-10-07: every kind of event is taken; over 20 guests is an event, with these two rules. */}
                <p className="m-0 mt-1.5 font-sans text-[12.5px] leading-[1.45] text-ink-note lg:text-[14px]">
                  Over 20 guests, you&apos;ll need event insurance, and alcohol is bought through Highland Farms and served
                  by an OLCC-licensed bartender.
                </p>
                <div className="mt-1 flex flex-col items-start">
                  <a href="#contact" className={ladderLinkClass}>
                    Tell us your date
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
            {/* One real gathering photo so the band is not text only (the caption says what the frame shows). */}
            <Plate
              className="mt-6 lg:mt-10"
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[21/9] lg:p-2.5"
              caption="A group resting on blankets on the flagstone patio under tall firs."
            >
              <StayPhoto
                photo={{
                  src: "/images/events/forest-yoga.jpg",
                  alt: "A group resting on blankets on the flagstone patio under tall firs at Highland Farms",
                  position: "50% 50%",
                }}
                sizes="(min-width: 1024px) 1312px, calc(100vw - 40px)"
              />
            </Plate>
            <ol className="m-0 mt-5 grid list-none grid-cols-1 border-t border-rule p-0 lg:mt-10 lg:grid-cols-3 lg:gap-12 lg:border-t-0">
              {occasions.map(({ occasion, q }, i) => (
                <li key={occasion} className="border-b border-rule py-5 lg:border-b-0 lg:border-t lg:py-6">
                  <FieldNo n={i + 1} />
                  <h3 className="field-heading m-0 mt-1 font-display text-[24px] leading-tight text-ink lg:text-[28px]">{occasion}</h3>
                  <FieldQuoteView {...q} size="sm" className="mt-2" quoteClassName="text-[19px] lg:text-[21px]" />
                </li>
              ))}
            </ol>
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
          <div className="mt-5 lg:mt-0">
            {/* One real plate for the section (the caption says what the frame shows). */}
            <Plate
              className="mt-5 lg:mt-0"
              frameClassName="aspect-[4/3] p-[7px] lg:p-2.5"
              caption="A guide and two guests pet a Highland calf in the barn."
            >
              {/* 4:3 everywhere: at 16:9 this portrait photo kept a third of its height and cut off every
                  face (Hayden 2026-10-08 crop audit). */}
              <StayPhoto
                photo={{
                  src: "/images/farm/cow-2.jpg",
                  alt: "A guide and two guests pet a Highland calf in the barn",
                  position: "50% 48%",
                }}
                sizes="(min-width: 1024px) 60vw, calc(100vw - 40px)"
              />
            </Plate>
            <FieldRows
              size="list"
              className="mt-4 lg:mt-6"
              rowClassName="flex-col gap-1 py-3.5 lg:flex-row lg:gap-6 lg:py-5"
              termClassName="w-auto text-[20px] lg:w-[180px] lg:text-[22px]"
              detailClassName="text-[15px] leading-[1.55] lg:text-[16px]"
              rows={[
                { term: "Stays", detail: `${STAY_MINIMUM} No outside pets.` },
                {
                  term: "Ages and access",
                  detail:
                    "The spa is for guests 16 and up, and kids 4 and under are free on farm tours. Farm tours and the spa aren't wheelchair, walker or stroller accessible.",
                },
              ]}
            />
          </div>
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
            <h2
              id="contact-title"
              className="field-heading m-0 mt-1 font-display text-[32px] leading-[1.05] text-ink lg:text-[48px]"
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
            <div className="mt-5">
              <FieldReview
                spec={CELEBRATION_FORM_QUOTE.spec}
                role={CELEBRATION_FORM_QUOTE.role}
                size="sm"
                quoteClassName="text-[19px] lg:text-[22px]"
              />
            </div>
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

      {/* 7. The visit actions, with the one closed cancellation row (RULINGS #8: never above the form). */}
      <section aria-labelledby="visits-title" className="border-t border-rule px-5 py-10 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <FieldSectionHeader
            id="visits-title"
            size="md"
            title="Add a farm tour or the spa"
            titleClassName="lg:text-[40px]"
            intro="Each is booked on its own page, for up to six guests at a time."
            introClassName="text-[15px] lg:text-[16px]"
          />
          <div className="mt-4 lg:mt-0">
            <p className="m-0 flex min-h-11 flex-wrap items-center gap-x-2 font-sans text-[14px] text-ink-note lg:text-[15px]">
              <Link href="/farm-tours#choose" className="inline-flex min-h-11 items-center font-medium text-pine">
                Tour dates
              </Link>
              <span aria-hidden="true">&middot;</span>
              <Link href="/nordic-spa#availability" className="inline-flex min-h-11 items-center font-medium text-pine">
                Open spa sessions
              </Link>
            </p>
            {visitPolicy.length > 0 && (
              <div className="mt-4 border-t border-rule">
                <details className="group border-b border-rule">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-[21px] font-semibold leading-tight text-ink lg:text-[24px] [&::-webkit-details-marker]:hidden">
                    <span>Cancellation policy</span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-sans text-[22px] font-normal leading-none text-pine transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  {visitPolicy.map((p) => (
                    <div key={p.label} className="pb-5 lg:max-w-[720px]">
                      <p className="m-0 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-fern">{p.label}</p>
                      <p className="m-0 mt-1 font-sans text-[15px] leading-[1.6] text-ink-body lg:text-[16px]">
                        {p.text}
                      </p>
                    </div>
                  ))}
                </details>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. Wedding router. */}
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
        hideWhenVisible={["#contact", "#headcount"]}
      />
    </div>
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

function LadderPhoto({ photo, caption }: { photo: { src: string; alt: string; position: string }; caption?: string }) {
  return (
    <div className="mt-3 lg:order-3 lg:mt-0">
      <Plate caption={caption} captionClassName="text-[13px] leading-snug lg:text-[15px]" frameClassName="h-[104px] p-[5px] lg:h-[220px] lg:p-2">
        <StayPhoto photo={photo} sizes="(min-width: 1024px) 40vw, 40vw" />
      </Plate>
    </div>
  );
}
