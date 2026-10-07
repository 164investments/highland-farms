import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldFaq } from "@/components/field/Faq";
import { FieldReviewTier } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import {
  FieldArrow,
  FieldLeader,
  FieldNo,
  FieldSectionHeader,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  fieldLabelClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { FieldArrowDown, StayPhoto } from "@/components/stay/StayParts";
import { thanksgiving, thanksgivingInquiryHref } from "@/data/thanksgiving";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Thanksgiving Stay Package 2026 · Mt. Hood, Oregon",
  description: "Spend November 24–28 at Highland Farms. A four-night Thanksgiving stay with dinner, breakfast, Nordic spa, a farm tour and family photos. Packages for 8 or 20 guests.",
  alternates: { canonical: "/thanksgiving" },
  openGraph: {
    title: thanksgiving.title,
    description: "November 24–28, 2026. Four nights, a farm-to-table Thanksgiving dinner, forest spa and time together at the base of Mt. Hood. Lodge $5,000; whole farm $11,000.",
    url: "https://highlandfarmsoregon.com/thanksgiving",
    type: "website",
    images: [{ url: "/images/thanksgiving/highland-farms-lodge-thanksgiving-dining.jpg", width: 1536, height: 1024, alt: "William Wallace Lodge dining room styled for Thanksgiving" }],
  },
  twitter: { card: "summary_large_image", title: thanksgiving.title, description: "A four-night holiday on the farm, November 24–28, 2026.", images: ["/images/thanksgiving/highland-farms-lodge-thanksgiving-dining.jpg"] },
};

/** The styled (AI-edited) Lodge dining room: on /thanksgiving only, captioned as styling. */
const HERO_PHOTO = {
  src: "/images/thanksgiving/highland-farms-lodge-thanksgiving-dining.jpg",
  alt: "William Wallace Lodge dining room styled with a Thanksgiving feast, autumn flowers and candlelight",
  position: "50% 50%",
};

const COWS_PHOTO = {
  src: "/images/farm/cows.jpg",
  alt: "A Highland cow and calf near the barn at Highland Farms",
  position: "50% 40%",
};

const SPA_PHOTO = {
  src: "/images/spa/spa-4.jpg",
  alt: "Nordic spa cabin with guests visible through the window and smoke rising from its chimney",
  position: "50% 50%",
};

const lowestPrice = Math.min(...thanksgiving.packages.map((p) => p.price));
const headingClass = "field-heading m-0 font-display text-[34px] leading-[1.04] text-ink lg:text-[52px]";
const bodyClass = "m-0 font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[17px]";

export default function ThanksgivingPage() {
  return (
    <div className="surface-paper bg-paper pt-[var(--header-h,104px)] font-sans text-ink">
      <StructuredData pathname="/thanksgiving" />

      {/* Hero. One photo: after the meta line on phones, the right column from lg. */}
      <section className="px-5 pt-5 pb-9 lg:px-16 lg:pt-14 lg:pb-16">
        <div className="mx-auto flex max-w-[1312px] flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
          <div className="contents lg:col-start-1 lg:row-start-1 lg:block">
            <p className={cn("m-0 text-[18px] lg:text-[22px]", fieldEyebrowClass)}>
              {thanksgiving.dates} <span className="mx-1.5" aria-hidden="true">&middot;</span> Four nights
            </p>
            <h1 className="field-heading m-0 mt-1 font-display text-[36px] leading-[1.02] text-ink lg:mt-3 lg:text-[70px]">
              {thanksgiving.title}
            </h1>
            <p className={cn("m-0 mt-2 font-medium tracking-[0.14em] lg:mt-3", fieldLabelClass)}>
              Four nights at the farm <span aria-hidden="true">&middot;</span> Dinner, breakfast &amp; experiences included
            </p>
            <div className="order-1 mt-5 flex flex-col gap-2 lg:mt-7 lg:flex-row lg:items-center lg:gap-6">
              <a href="#packages" data-hero-cta className={cn(fieldCtaClass, "w-full lg:w-auto")}>
                See the packages
                <FieldArrowDown />
              </a>
              <p className="m-0 text-center font-sans text-[14px] text-ink-body lg:text-left">
                From <span className="font-semibold text-ink">${lowestPrice.toLocaleString("en-US")}</span> for four nights
              </p>
            </div>
            <FieldReviewTier tier="hero" className="order-2 mt-1 min-h-11 justify-center gap-2.5 text-[14px] lg:justify-start" />
            <p className="order-3 m-0 mt-4 font-sans text-[16px] leading-[1.6] text-ink-body lg:mt-6 lg:max-w-[460px] lg:text-[18px]">
              Gather around our table this year. A holiday dinner rooted in the farm, a warm sauna, and four quiet nights with the people you love.
            </p>
            <p className="order-4 m-0 mt-4 font-sans text-[14px] leading-[1.6] text-ink-note lg:mt-6 lg:max-w-[460px] lg:text-[15px]">
              At the base of Mt. Hood in Brightwood, Oregon. All the time together, without hosting the holiday yourself.
            </p>
          </div>
          <div className="mt-4 lg:col-start-2 lg:row-start-1 lg:mt-0">
            <Plate
              caption="The Lodge dining room, styled for Thanksgiving"
              captionClassName="lg:text-right"
              frameClassName="h-[176px] min-[380px]:h-[206px] lg:h-[560px]"
            >
              <StayPhoto photo={HERO_PHOTO} sizes="(min-width: 1024px) 52vw, 100vw" priority />
            </Plate>
          </div>
        </div>
      </section>

      {/* The holiday, taken care of: above the prices. */}
      <section aria-labelledby="holiday-title" className="bg-paper-shade px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:grid-rows-[auto_1fr] lg:gap-x-20">
          <div className="lg:col-start-1 lg:row-start-1">
            <h2 id="holiday-title" className={cn(headingClass, "lg:text-[52px]")}>
              The holiday,
              <br />
              taken care of.
            </h2>
            <p className={cn(bodyClass, "mt-4 lg:max-w-[420px]")}>
              A table worth lingering at. A forest to unwind in. Time to reconnect between the meals and the memories.
            </p>
          </div>
          <div className="mt-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
            <p className={cn("m-0 text-[18px] lg:text-[20px]", fieldEyebrowClass)}>Included in both packages</p>
            <ol className="m-0 mt-3 flex list-none flex-col border-t border-rule p-0">
              {thanksgiving.inclusions.map((item, i) => (
                <li key={item.title} className="border-b border-rule py-4 lg:py-5">
                  <FieldNo n={i + 1} />
                  <h3 className="field-heading m-0 mt-0.5 font-display text-[22px] leading-tight text-ink lg:text-[26px]">{item.title}</h3>
                  <p className="m-0 mt-1 font-sans text-[15px] leading-[1.55] text-ink-body lg:text-[16px]">{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-6 lg:col-start-1 lg:row-start-2 lg:mt-6 lg:self-start">
            <Plate
              caption="Meet the farm’s Highland cows on your guided tour."
              frameClassName="h-[240px] lg:h-[380px]"
            >
              <StayPhoto photo={COWS_PHOTO} sizes="(min-width: 1024px) 32vw, 100vw" />
            </Plate>
          </div>
        </div>
      </section>

      {/* Packages. */}
      <section id="packages" aria-labelledby="packages-title" className="scroll-mt-[var(--header-h,104px)] px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1312px]">
          <div className="max-w-[640px]">
            <h2 id="packages-title" className={headingClass}>
              Two ways to gather
            </h2>
            <p className={cn(bodyClass, "mt-3")}>
              Choose the Lodge for eight or reserve the whole farm for twenty. Both packages include the same Thanksgiving meals and farm experiences.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-12 lg:mt-12 lg:grid-cols-2 lg:gap-16">
            {thanksgiving.packages.map((pkg) => {
              const triptych = pkg.images.length > 1;
              return (
                <article key={pkg.id} className="flex flex-col border-t border-ink/70 pt-5 lg:pt-6">
                  <p className={cn("m-0 font-medium tracking-[0.16em]", fieldLabelClass)}>
                    {pkg.accommodation} <span aria-hidden="true">&middot;</span> Family of {pkg.guests}
                  </p>
                  <h3 className="field-heading m-0 mt-1.5 font-display text-[30px] leading-[1.05] text-ink lg:text-[40px]">{pkg.name}</h3>
                  <div className="mt-4">
                    {triptych ? (
                      <div className="grid grid-cols-3 gap-2 lg:gap-3">
                        {pkg.images.map((photo) => (
                          <Plate
                            key={photo.src}
                            caption={photo.label}
                            captionClassName="text-center"
                            frameClassName="h-[150px] lg:h-[340px]"
                          >
                            <StayPhoto
                              photo={{ src: photo.src, alt: photo.alt, position: "50% 55%" }}
                              sizes="(min-width: 1024px) 15vw, 32vw"
                            />
                          </Plate>
                        ))}
                      </div>
                    ) : (
                      <Plate frameClassName="h-[220px] lg:h-[340px]">
                        <StayPhoto
                          photo={{ src: pkg.images[0].src, alt: pkg.images[0].alt, position: "50% 50%" }}
                          sizes="(min-width: 1024px) 46vw, 100vw"
                        />
                      </Plate>
                    )}
                  </div>
                  <div className="mt-4 flex min-h-[56px] items-center gap-3 border-y border-rule">
                    <span className="font-sans text-[14px] text-ink-body lg:text-[15px]">
                      Four-night package for {pkg.guests} guests
                    </span>
                    <FieldLeader />
                    <span className="font-sans text-[20px] font-semibold leading-none text-ink lg:text-[22px]">
                      ${pkg.price.toLocaleString("en-US")}
                    </span>
                  </div>
                  <p className="m-0 mt-4 font-sans text-[16px] leading-[1.6] text-ink lg:min-h-[3.25rem]">{pkg.description}</p>
                  <a
                    href={thanksgivingInquiryHref(pkg.name, pkg.guests)}
                    className={cn(fieldCtaClass, "mt-5 w-full lg:w-auto lg:self-start")}
                  >
                    Ask about the {pkg.id === "lodge" ? "Lodge" : "whole farm"}
                    <FieldArrow />
                  </a>
                </article>
              );
            })}
          </div>
          <p className="m-0 mt-8 max-w-[760px] border-t border-rule pt-4 font-sans text-[15px] leading-[1.6] text-ink-note lg:text-[16px]">
            Optional upgrades are additional. The team will confirm availability, applicable taxes, payment details and the stay package’s cancellation terms before you book. An inquiry does not reserve the stay.
          </p>
        </div>
      </section>

      {/* A few extra comforts: upgrades, no prices (the team quotes them). */}
      <section
        aria-labelledby="comforts-title"
        className="border-t-[3px] border-double border-frame px-5 py-10 lg:px-16 lg:py-20"
      >
        <div className="mx-auto max-w-[1312px] lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <Plate frameClassName="h-[230px] lg:h-[460px]">
            <StayPhoto photo={SPA_PHOTO} sizes="(min-width: 1024px) 46vw, 100vw" />
          </Plate>
          <div className="mt-6 lg:mt-0">
            <h2 id="comforts-title" className={headingClass}>
              A few extra comforts
            </h2>
            <p className={cn(bodyClass, "mt-3")}>
              Add a little more to your holiday. Ask about pricing for these optional upgrades when you inquire.
            </p>
            <ul className="m-0 mt-5 flex list-none flex-col border-t border-rule p-0">
              {thanksgiving.upgrades.map((item) => (
                <li
                  key={item}
                  className="flex min-h-[48px] items-center border-b border-rule py-2.5 font-sans text-[15px] leading-snug text-ink lg:text-[16px]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Before you gather: hairline FAQ, first open; FAQPage JSON-LD from the same data. */}
      <section aria-labelledby="faq-title" className="bg-paper-shade px-5 py-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[860px]">
          <FieldSectionHeader id="faq-title" size="lg" title="Before you gather" titleClassName="lg:text-[52px]" />
          <FieldFaq items={thanksgiving.faqs} size="md" openIndex={0} jsonLd className="mt-6" />
        </div>
      </section>

      {/* Inquire (#inquire): the mailto is unchanged. */}
      <section id="inquire" aria-labelledby="inquire-title" data-sticky-stop className="scroll-mt-[var(--header-h,104px)] px-5 py-12 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[760px] text-center">
          <p className={cn("m-0 text-[18px] lg:text-[20px]", fieldEyebrowClass)}>{thanksgiving.dates}</p>
          <h2 id="inquire-title" className="field-heading m-0 mt-2 font-display text-[36px] leading-[1.04] text-ink lg:text-[56px]">
            Bring your people.
            <br />
            We’ll set the table.
          </h2>
          <p className="mx-auto mb-0 mt-4 max-w-[520px] font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[17px]">
            Tell us how many are coming and which package you have in mind. We’ll help you plan your Thanksgiving on the farm.
          </p>
          <a href={thanksgivingInquiryHref()} className={cn(fieldCtaClass, "mt-7 w-full lg:w-auto")}>
            Inquire about Thanksgiving
            <FieldArrow />
          </a>
          <FieldReviewTier tier="nearCta" className="mt-1 min-h-11 justify-center gap-2.5 text-[14px]" />
          <p className="m-0 mt-4 font-sans text-[14px] text-ink-note lg:text-[15px]">
            Or email{" "}
            <a className="break-all text-pine underline underline-offset-4" href={`mailto:${thanksgiving.email}`}>
              {thanksgiving.email}
            </a>
          </p>
          <Link href="/stay" className={cn("mt-5 inline-flex min-h-11 items-center text-[14px]", fieldTextLinkClass)}>
            See the accommodations
          </Link>
        </div>
      </section>

      <FieldStickyBar
        primary={{ label: "Inquire about Thanksgiving", href: "#inquire" }}
        hideWhenVisible="#inquire"
      />
    </div>
  );
}
