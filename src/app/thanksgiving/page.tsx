import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FieldArrow,
  FieldStars,
  Plate,
  fieldCtaClass,
  fieldEyebrowClass,
  fieldTextLinkClass,
} from "@/components/ui/FieldGuide";
import { FieldFaq } from "@/components/field/Faq";
import { FieldReview } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { StructuredData } from "@/components/layout/StructuredData";
import { thanksgiving, thanksgivingInquiryHref } from "@/data/thanksgiving";
import { FIVE_STAR_COUNT, REVIEW_COUNT } from "@/lib/reviews";
import { THANKSGIVING_FAMILY_QUOTE } from "@/lib/review-quotes";
import { ThanksgivingHero } from "./ThanksgivingHero";
import { PackageCompare } from "./PackageCompare";
import { CopyEmail } from "./CopyEmail";

const OG_IMAGE = "/images/thanksgiving/highland-farms-lodge-thanksgiving-dining.jpg";

export const metadata: Metadata = {
  title: "Thanksgiving Stay Package 2026",
  description:
    "Four nights at Highland Farms, November 24 to 28, 2026. Our chef and team cook Thanksgiving dinner and do the dishes. Spa, farm tour and family photos included.",
  alternates: { canonical: "/thanksgiving" },
  openGraph: {
    title: thanksgiving.title,
    description:
      "This year, the host is a guest too. Four nights on a private forest farm near Mt. Hood, with Thanksgiving dinner cooked for you. Lodge for 8, $5,000. Whole farm for 20, $11,000.",
    url: "https://highlandfarmsoregon.com/thanksgiving",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1536, height: 1024, alt: "William Wallace Lodge dining room with Thanksgiving styling added digitally" }],
  },
  twitter: {
    card: "summary_large_image",
    title: thanksgiving.title,
    description: "Four nights on the farm, November 24 to 28, 2026. Thanksgiving dinner cooked for you, dishes done.",
    images: [OG_IMAGE],
  },
};

const wrap = "mx-auto max-w-[1440px] px-5 lg:px-10 min-[90rem]:px-16";
const sectionInner = "border-t border-rule pb-12 pt-10 lg:pb-24 lg:pt-20";
const eyebrow = cn(fieldEyebrowClass, "m-0 text-[17px] lg:text-[22px]");
const h2 = "field-heading m-0 mt-1 text-[30px] leading-[1.05] text-ink lg:mt-3 lg:text-[44px]";

function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: thanksgiving.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export default function ThanksgivingPage() {
  const inquiry = thanksgivingInquiryHref();

  return (
    <div className="surface-paper bg-paper text-ink">
      <StructuredData pathname="/thanksgiving" />
      <FaqSchema />
      <ThanksgivingHero />

      {/* What's included: the team's specifics, value before price */}
      <section id="included" aria-labelledby="tg-included-title" className="scroll-mt-[calc(var(--header-h,60px)+16px)]">
        <div className={wrap}>
          <div className={cn(sectionInner, "lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16")}>
            <div className="lg:col-start-1">
              <p className={eyebrow}>Included in both packages</p>
              <h2 id="tg-included-title" className={h2}>
                What you get, down to the dishes
              </h2>
              <ol role="list" className="m-0 mt-5 list-none border-t border-rule p-0 lg:mt-8 lg:max-w-[680px]">
                {thanksgiving.inclusions.map((item, i) => {
                  const marked = "upgradeMark" in item && item.upgradeMark;
                  return (
                    <li
                      key={item.term}
                      aria-describedby={marked ? "tg-upgrade" : undefined}
                      className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-2 border-b border-rule py-4 lg:grid-cols-[44px_minmax(0,1fr)] lg:py-5"
                    >
                      <span aria-hidden="true" className="pt-[2px] font-display text-[18px] italic text-fern lg:text-[22px]">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="field-heading m-0 text-[21px] leading-[1.1] text-ink lg:text-[26px]">{item.term}</h3>
                        <p className="m-0 mt-1 font-sans text-[14px] leading-[1.55] text-ink-body lg:text-[16px]">
                          {item.detail}
                          {marked && (
                            <span aria-hidden="true" className="text-pine">
                              *
                            </span>
                          )}
                        </p>
                        {marked && (
                          <p id="tg-upgrade" className="m-0 mt-2 font-sans text-[13px] leading-[1.55] text-ink-note lg:text-[14px]">
                            <span className="text-pine">*</span>
                            {thanksgiving.upgrade}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-7 lg:sticky lg:top-[calc(var(--header-h,84px)+32px)] lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:mt-0 lg:self-start">
              <Plate frameClassName="h-[220px] lg:aspect-[4/5] lg:h-auto" caption="You meet the herd on the welcome tour.">
                <Image
                  src="/images/farm/cows.jpg"
                  alt="A Highland cow with its tongue out beside a calf near the barn"
                  fill
                  sizes="(min-width: 1440px) 520px, (min-width: 1024px) 38vw, calc(100vw - 56px)"
                  className="object-cover object-[50%_52%]"
                />
              </Plate>
              <FieldReview
                spec={THANKSGIVING_FAMILY_QUOTE}
                role={THANKSGIVING_FAMILY_QUOTE.topic}
                className="mt-6 border-t border-rule pt-5"
                quoteClassName="text-[19px] lg:text-[22px]"
              />
            </div>
          </div>
        </div>
      </section>

      <PackageCompare />

      {/* How booking works + the one action */}
      <section id="inquire" aria-labelledby="tg-inquire-title" className="scroll-mt-[calc(var(--header-h,60px)+16px)]">
        <div className={wrap}>
          <div className={cn(sectionInner, "text-center")}>
            <div className="mx-auto max-w-[640px] lg:max-w-[920px]">
              <p className={eyebrow}>{thanksgiving.dates}</p>
              <h2 id="tg-inquire-title" className="field-heading m-0 mt-1 text-[32px] leading-[1.04] text-ink lg:mt-3 lg:text-[52px]">
                Bring your people. We&apos;ll set the table.
              </h2>

              <p className="m-0 mt-6 font-sans text-[11px] uppercase tracking-[0.14em] text-ink-meta lg:mt-10 lg:text-[12px]">
                How booking works
              </p>
              <ol
                role="list"
                className="mx-auto mt-2 max-w-[520px] list-none border-t border-rule p-0 text-left lg:mt-4 lg:grid lg:max-w-none lg:grid-cols-3 lg:gap-8 lg:border-t-0"
              >
                {thanksgiving.steps.map((step, i) => (
                  <li
                    key={step.title}
                    className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-2 border-b border-rule py-3.5 lg:block lg:border-b-0 lg:border-t lg:pt-4"
                  >
                    <span aria-hidden="true" className="font-display text-[18px] italic text-fern">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="field-heading m-0 text-[20px] leading-[1.15] text-ink lg:mt-1 lg:text-[22px]">{step.title}</h3>
                      <p className="m-0 mt-1 font-sans text-[14px] leading-[1.55] text-ink-body">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="m-0 mt-7 inline-flex items-center gap-2 font-sans text-[13px] text-ink-body">
                <FieldStars size={13} />
                {FIVE_STAR_COUNT} of {REVIEW_COUNT} Google reviews are five stars
              </p>
              <div data-hero-cta className="mt-3">
                <a href={inquiry} data-cta="tg-final" className={cn(fieldCtaClass, "w-full max-w-[420px] lg:w-auto")}>
                  Check availability
                  <FieldArrow />
                </a>
                <p className="m-0 mt-3 font-sans text-[13px] leading-[1.6] text-ink-note">
                  Or email <span className="select-all break-all text-ink-body">{thanksgiving.email}</span>, or call{" "}
                  <a
                    href={`tel:${thanksgiving.phone.replace(/\D/g, "")}`}
                    data-cta="tg-final-call"
                    className="whitespace-nowrap py-3 text-ink-body underline underline-offset-2"
                  >
                    {thanksgiving.phone}
                  </a>
                  . An inquiry doesn&apos;t reserve the stay.
                </p>
                <CopyEmail email={thanksgiving.email} className="mt-1" />
              </div>
              <Link href="/stay" className="mt-4 inline-flex min-h-11 items-center">
                <span className={fieldTextLinkClass}>See the Lodge, Cottage and Camp</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" aria-labelledby="tg-faq-title">
        <div className={wrap}>
          <div className={cn(sectionInner, "lg:max-w-[760px]")}>
            <h2 id="tg-faq-title" className="field-heading m-0 mb-5 text-[30px] leading-[1.05] text-ink lg:mb-8 lg:text-[44px]">
              Before you gather
            </h2>
            <FieldFaq items={thanksgiving.faqs} />
          </div>
        </div>
      </section>

      {/* The shared sticky bar: hides over the inquiry block, lifts the chat bubble above itself. */}
      <FieldStickyBar
        primary={{ label: "Check Thanksgiving dates", sublabel: "Nov 24 to 28", href: inquiry, cta: "tg-sticky" }}
        hideWhenVisible={["#inquire", '[data-cta="tg-lodge"]', '[data-cta="tg-whole-farm"]']}
      />
      <div aria-hidden="true" className="h-20 lg:hidden" />
    </div>
  );
}
