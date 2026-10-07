import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, FieldReviewTier, GOOGLE_REVIEW_LINK, resolveFieldQuote } from "@/components/field/Reviews";
import { FieldStickyBar } from "@/components/field/StickyBar";
import { WeddingCallLink } from "@/components/field/WeddingCallLink";
import {
  FieldArrow,
  FieldStars,
  PendingSlot,
  Plate,
  fieldCtaClass,
  toRoman,
} from "@/components/ui/FieldGuide";
import { cn } from "@/lib/utils";
import { CONTACT, SITE } from "@/lib/constants";
import {
  confirmedCouples,
  displayName,
  formatWeddingDate,
  isConfirmed,
  seasonFromDate,
  weddingPortfolio,
  type WeddingCouple,
  type WeddingPhoto,
} from "@/data/wedding-portfolio";
import {
  COUPLE_KATE_QUOTE,
  MAYA_LEAD_QUOTE,
  MAYA_REVIEW_OPENING,
  MAYA_REVIEW_REST,
} from "../quotes";

export function generateStaticParams() {
  return weddingPortfolio.map((couple) => ({ slug: couple.slug }));
}

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven"];

/**
 * Per-couple description from verified facts only: the date embedded in the
 * delivered photos' XMP metadata, the embedded photographer credit, and the
 * page's own story line. A set not confirmed as a wedding never names a couple.
 */
function buildDescription(couple: WeddingCouple): string {
  if (!isConfirmed(couple)) {
    return `Photographs made at Highland Farms in Brightwood, Oregon, by ${couple.photographer?.name ?? "the farm's photographers"}. ${couple.story}`;
  }
  const season = seasonFromDate(couple.date);
  const when = couple.date
    ? ` (${new Date(`${couple.date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" })})`
    : "";
  let description = `${couple.names}'s ${season ? `${season} wedding` : "wedding"} at Highland Farms in Brightwood, Oregon${when}. ${couple.story}`;
  if (couple.photographer) description += ` Photography by ${couple.photographer.name}.`;
  return description;
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const couple = weddingPortfolio.find((c) => c.slug === slug);
    if (!couple) return { title: "Not Found" };

    const description = buildDescription(couple);
    const confirmed = isConfirmed(couple);
    return {
      title: confirmed ? `${couple.names} — Wedding Portfolio` : `${displayName(couple)} at Highland Farms`,
      description,
      alternates: { canonical: `/wedding-portfolio/${slug}` },
      openGraph: {
        title: confirmed ? `${couple.names} — Highland Farms Wedding` : `${displayName(couple)} at Highland Farms`,
        description,
        images: [
          {
            url: couple.coverImage,
            width: 1200,
            height: 630,
            alt: confirmed ? `${couple.names} wedding at Highland Farms` : couple.lead.alt,
          },
        ],
      },
    };
  });
}

/**
 * ImageGallery for every page; Event only for a confirmed wedding with a
 * verified date (Google requires startDate, and a made-up one is worse than
 * none). A set that is not confirmed as a wedding emits no Event and names
 * nobody. Guest count and vendors stay out until a real source exists.
 */
function WeddingSchema({ couple }: { couple: WeddingCouple }) {
  const confirmed = isConfirmed(couple);
  const images = couple.images.map((image) => ({
    "@type": "ImageObject" as const,
    contentUrl: `${SITE.url}${image.src}`,
    caption: image.alt,
    ...(couple.photographer && {
      creator: {
        "@type": "Organization",
        name: couple.photographer.name,
        ...(couple.photographer.url && { url: couple.photographer.url }),
      },
      creditText: couple.photographer.name,
    }),
  }));

  const description = buildDescription(couple);
  const address = {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address,
    addressLocality: CONTACT.city,
    addressRegion: CONTACT.state,
    postalCode: CONTACT.zip,
    addressCountry: "US",
  };

  const graph: Record<string, unknown>[] = [
    {
      "@type": "ImageGallery",
      "@id": `${SITE.url}/wedding-portfolio/${couple.slug}#gallery`,
      name: confirmed ? `${couple.names} Wedding Gallery` : `${displayName(couple)} at Highland Farms`,
      description,
      url: `${SITE.url}/wedding-portfolio/${couple.slug}`,
      associatedMedia: images,
    },
  ];

  if (confirmed && couple.date) {
    graph.push({
      "@type": "Event",
      "@id": `${SITE.url}/wedding-portfolio/${couple.slug}#event`,
      name: `${couple.names} Wedding at Highland Farms`,
      description,
      startDate: couple.date,
      endDate: couple.date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: "Highland Farms Oregon", address },
      image: images.map((image) => image.contentUrl),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function PlateImage({ photo, sizes }: { photo: WeddingPhoto; sizes: string }) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes={sizes}
      className={cn("object-cover", photo.className)}
      style={{ objectPosition: photo.position }}
    />
  );
}

const captionClass = "text-[14px] leading-snug lg:text-[17px]";

function Numeral({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="font-display text-[16px] not-italic text-fern lg:text-[18px]">
      {toRoman(n)}
    </span>
  );
}

/** Maya & Justin's four plates, laid out as the board draws them. */
function CuratedPlates({ plates }: { plates: WeddingPhoto[] }) {
  const slots = [
    { frame: "aspect-[2/3] p-[6px] lg:p-2.5", figure: "lg:col-span-4", sizes: "(min-width: 1024px) 30vw, 46vw" },
    { frame: "aspect-[2/3] p-[6px] lg:p-2.5", figure: "lg:col-span-4", sizes: "(min-width: 1024px) 30vw, 46vw" },
    { frame: "aspect-[3/2] p-[7px] lg:aspect-[2/3] lg:p-2.5", figure: "col-span-2 lg:col-span-4", sizes: "(min-width: 1024px) 30vw, calc(100vw - 40px)" },
    { frame: "aspect-[4/3] p-[7px] lg:aspect-[16/10] lg:p-2.5", figure: "col-span-2 lg:col-span-8 lg:col-start-3", sizes: "(min-width: 1024px) 60vw, calc(100vw - 40px)" },
  ];
  return (
    <>
      {plates.slice(0, 4).map((photo, i) => (
        <Plate
          key={photo.src}
          className={slots[i].figure}
          frameClassName={slots[i].frame}
          captionClassName={captionClass}
          caption={
            <>
              <Numeral n={i + 1} />
              &ensp;{photo.caption}
            </>
          }
        >
          <PlateImage photo={photo} sizes={slots[i].sizes} />
        </Plate>
      ))}
    </>
  );
}

/** Any other set: one wide plate, then pairs on phones; two wide and three narrow from lg. */
function GridPlates({ plates, numbered }: { plates: WeddingPhoto[]; numbered?: boolean }) {
  return (
    <>
      {plates.map((photo, i) => {
        const wide = i < 2;
        return (
          <Plate
            key={photo.src}
            className={cn(i === 0 && "col-span-2", wide ? "lg:col-span-3" : "lg:col-span-2")}
            frameClassName={cn(
              i === 0 ? "aspect-[3/2]" : "aspect-[4/5]",
              wide ? "lg:aspect-[3/2]" : "lg:aspect-[4/5]",
              "p-[6px] lg:p-2.5",
            )}
            captionClassName={captionClass}
            caption={
              numbered ? (
                <>
                  <Numeral n={i + 1} />
                  &ensp;{photo.caption}
                </>
              ) : (
                photo.caption
              )
            }
          >
            <PlateImage photo={photo} sizes={wide ? "(min-width: 1024px) 46vw, 46vw" : "(min-width: 1024px) 30vw, 46vw"} />
          </Plate>
        );
      })}
    </>
  );
}

export default async function WeddingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const couple = weddingPortfolio.find((c) => c.slug === slug);
  if (!couple) notFound();

  const confirmed = isConfirmed(couple);
  const isMaya = couple.slug === "maya-justin";
  const title = displayName(couple);
  const eyebrow = confirmed ? "A real wedding at Highland Farms" : "Photographed at the farm";
  // Next in the journal: the following confirmed couple (a styled set points to the journal's first).
  const at = confirmedCouples.findIndex((c) => c.slug === couple.slug);
  const next = confirmedCouples[(at + 1) % confirmedCouples.length];
  const plateCount = couple.plates.length;
  const plateHeading = confirmed
    ? `The day, in ${NUMBER_WORDS[plateCount] ?? plateCount} plates`
    : "The set, in plates";

  // The bride's review (PF-01, pending): the opening at quote size, the rest at body size, every word kept.
  const opening = isMaya ? resolveFieldQuote(MAYA_REVIEW_OPENING, { role: "Wedding" }) : null;
  const rest = isMaya ? resolveFieldQuote(MAYA_REVIEW_REST, { role: "Wedding" }) : null;

  return (
    <>
      <WeddingSchema couple={couple} />
      <StructuredData pathname={`/wedding-portfolio/${couple.slug}`} />

      <div className="surface-paper bg-paper font-sans text-ink">
        <article aria-labelledby="couple-title">
          {/* Title and lead plate */}
          <header className="mx-auto flex max-w-[1440px] flex-col px-5 pt-[calc(var(--header-h,104px)+0.5rem)] lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16 lg:px-16 lg:pt-[calc(var(--header-h,128px)+2rem)]">
            <Link
              href="/wedding-portfolio"
              className="order-1 inline-flex min-h-11 items-center gap-2 self-start font-sans text-[14px] font-medium text-pine lg:col-span-12"
            >
              <FieldArrow size={16} className="rotate-180" />
              All real weddings
            </Link>
            <div className="order-2 mt-1 lg:col-span-7 lg:mt-6">
              <p className="font-display text-[17px] italic text-fern lg:text-[22px]">{eyebrow}</p>
              <h1
                id="couple-title"
                className={cn(
                  "field-heading mt-0.5 font-display leading-[0.98] text-ink lg:mt-2",
                  confirmed ? "text-[46px] lg:text-[84px]" : "text-[38px] lg:text-[64px]",
                )}
              >
                {title}
              </h1>
              {confirmed && couple.date && (
                <p className="mt-2 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-fern lg:mt-4 lg:text-[13px]">
                  {formatWeddingDate(couple.date, true)}
                </p>
              )}
              {confirmed &&
                (couple.photographer ? (
                  <p className="mt-1 font-sans text-[13px] text-ink-note lg:mt-2 lg:text-[14px]">
                    Photographed by{" "}
                    {couple.photographer.url ? (
                      <a
                        href={couple.photographer.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        data-outbound="photographer"
                        className="inline-flex min-h-11 items-center text-pine underline decoration-pine-line underline-offset-4 lg:min-h-0"
                      >
                        {couple.photographer.name}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      couple.photographer.name
                    )}
                  </p>
                ) : (
                  <PendingSlot note="PENDING CONNOR: photographer credit. No credit is embedded in these files. Hides the 'Photographed by' line.">
                    <p className="font-sans text-[13px] text-ink-note">Photographed by [name from Connor]</p>
                  </PendingSlot>
                ))}
            </div>
            <div className="order-4 mt-4 lg:order-3 lg:col-span-5 lg:mt-0">
              <p className="font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[18px]">
                {couple.pageStory ?? couple.story}
              </p>
              {isMaya && (
                <PendingSlot
                  className="mt-3"
                  note="PENDING CONNOR PF-01: confirm Maya C. is this bride. Hides the lead sentence under the story."
                >
                  <FieldReview
                    spec={MAYA_LEAD_QUOTE}
                    role="Wedding"
                    quoteClassName="text-[19px] leading-[1.3] lg:text-[20px]"
                  />
                </PendingSlot>
              )}
            </div>
            <Plate
              className="order-3 mt-4 lg:order-4 lg:col-span-12 lg:mt-12"
              frameClassName="aspect-square p-[7px] lg:aspect-[21/10] lg:p-2.5"
              caption={couple.lead.caption}
            >
              <Image
                src={couple.lead.src}
                alt={couple.lead.alt}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1440px) 1280px, (min-width: 1024px) 92vw, calc(100vw - 40px)"
                className={cn("object-cover", couple.lead.className)}
                style={{ objectPosition: couple.lead.position }}
              />
            </Plate>
          </header>

          {/* The day, as plates */}
          <section aria-labelledby="plates-title" className="mx-auto max-w-[1440px] px-5 pt-12 lg:px-16 lg:pt-20">
            <h2 id="plates-title" className="field-heading font-display text-[30px] leading-tight text-ink lg:text-[44px]">
              {plateHeading}
            </h2>
            <div
              className={cn(
                "mt-5 grid grid-cols-2 gap-x-3 gap-y-6 lg:mt-10 lg:gap-x-8 lg:gap-y-14",
                isMaya ? "lg:grid-cols-12" : "lg:grid-cols-6",
              )}
            >
              {isMaya ? (
                <CuratedPlates plates={couple.plates} />
              ) : (
                <GridPlates plates={couple.plates} numbered={couple.numberedPlates} />
              )}
            </div>
            {isMaya && (
              <PendingSlot
                className="mt-6"
                note="PENDING CONNOR A14: Kate Holt's full gallery of this wedding should hold a frame with the herd (a parent of the bride wrote that Connor brushed the coos for the shoot). With a release it becomes Plate V. Note never ships."
              />
            )}
          </section>

          {/* In their words. Shipped today: the photographer's sentence. PF-01 (pending): the bride's own review above it. */}
          {isMaya && (
            <section
              aria-labelledby="words-title"
              className="mt-12 border-t-[3px] border-double border-frame bg-paper-light lg:mt-20"
            >
              <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:px-16 lg:py-20">
                {opening && rest && (
                  <PendingSlot
                    className="lg:col-span-12"
                    note="PENDING CONNOR PF-01: confirm Maya C. is this bride. Hides the whole block (eyebrow, heading, stars, full review, link)."
                  >
                    <p className="font-display text-[18px] italic text-fern lg:text-[22px]">In her words</p>
                    <h2 className="field-heading mt-1 font-display text-[32px] leading-[1.04] text-ink lg:mt-2 lg:text-[48px]">
                      The bride&apos;s review
                    </h2>
                    <figure className="m-0 mt-4">
                      <FieldStars size={15} />
                      <blockquote className="m-0 mt-3">
                        <p className="m-0 font-display text-[22px] italic leading-[1.3] text-ink lg:text-[28px]">
                          &ldquo;{opening.quote}
                        </p>
                        <p className="m-0 mt-2 font-display text-[18px] italic leading-[1.4] text-ink-body lg:text-[20px]">
                          {rest.quote}&rdquo;
                        </p>
                      </blockquote>
                      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 font-sans text-[11px] uppercase tracking-[0.08em] text-ink-meta lg:text-[12px]">
                        <span>
                          {opening.name} &middot; Wedding &middot; {opening.when} &middot; Google review
                        </span>
                        <a
                          href={GOOGLE_REVIEW_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center text-[14px] font-medium normal-case tracking-normal text-pine underline decoration-pine-line underline-offset-4"
                        >
                          Read it on Google<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </figcaption>
                    </figure>
                  </PendingSlot>
                )}
                <div className="lg:col-span-4">
                  <h2
                    id="words-title"
                    className="field-heading font-display text-[32px] leading-[1.04] text-ink lg:mt-2 lg:text-[48px]"
                  >
                    From their photographer
                  </h2>
                </div>
                <FieldReview
                  spec={COUPLE_KATE_QUOTE}
                  fullName
                  role="Wedding"
                  className="mt-5 lg:col-span-8 lg:mt-0 lg:self-end"
                  quoteClassName="text-[22px] leading-[1.3] lg:text-[30px]"
                />
              </div>
            </section>
          )}
        </article>

        {/* Planning yours? The ask, right after their words, with the coos */}
        <section id="plan" aria-labelledby="plan-title" className={cn("border-t border-rule", !isMaya && "mt-12 lg:mt-20")}>
          <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-16 lg:py-20">
            <Plate
              className="lg:col-span-5"
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[4/5] lg:p-2.5"
              caption="The coos, our honorary wedding guests."
            >
              <Image
                src="/images/farm/about-hero.jpg"
                alt="A Highland cow and two calves among tall mossy trees"
                fill
                sizes="(min-width: 1024px) 40vw, calc(100vw - 40px)"
                className="object-cover object-[62%_60%]"
              />
            </Plate>
            <div className="mt-7 lg:col-span-6 lg:col-start-7 lg:mt-0">
              <h2 id="plan-title" className="field-heading font-display text-[36px] leading-[1.02] text-ink lg:text-[56px]">
                Planning yours?
              </h2>
              <p className="mt-3 font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[18px]">
                Send your month and guest count, and we&apos;ll check the farm calendar for you.
              </p>
              <Link href="/weddings#contact" className={cn(fieldCtaClass, "mt-5 w-full lg:w-auto")}>
                Check your date
                <FieldArrow />
              </Link>
              <WeddingCallLink
                content="portfolio-couple-plan"
                title="Portfolio couple page: wedding call"
                className="mt-1 flex min-h-11 items-center justify-center font-sans text-[14px] font-medium text-pine lg:justify-start"
              >
                Or book a free 45-minute call with Connor
              </WeddingCallLink>
              <FieldReviewTier
                tier="nearCta"
                className="mt-2 justify-center text-[13px] lg:justify-start"
                starSize={13}
              />
            </div>
          </div>
        </section>

        {/* Next in the journal */}
        <section aria-labelledby="next-title" className="border-t border-rule">
          <div className="mx-auto max-w-[1440px] px-5 py-10 lg:px-16 lg:py-16">
            <Link
              href={`/wedding-portfolio/${next.slug}`}
              className="group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-4 lg:max-w-[760px] lg:gap-8"
            >
              <div className="aspect-[4/5] border border-frame bg-paper-light p-[6px] lg:p-2.5">
                <div className="relative h-full w-full overflow-hidden">
                  <Image
                    src={next.lead.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 300px, 36vw"
                    className={cn("object-cover", next.lead.className)}
                    style={{ objectPosition: next.lead.position }}
                  />
                </div>
              </div>
              <div>
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-fern lg:text-[12px]">
                  Next in the journal
                </p>
                <h2
                  id="next-title"
                  className="field-heading mt-1 font-display text-[28px] leading-tight text-ink group-hover:text-pine lg:text-[40px]"
                >
                  {next.names}
                </h2>
                {next.date && (
                  <p className="mt-1 font-sans text-[14px] text-ink-note lg:text-[15px]">
                    {formatWeddingDate(next.date)}
                  </p>
                )}
                <span className="mt-2 inline-flex min-h-11 items-center gap-2 font-sans text-[15px] font-medium text-pine lg:mt-4 lg:min-h-0">
                  <span className="border-b border-pine-line pb-0.5">Read their story</span>
                  <FieldArrow size={16} />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </div>

      <FieldStickyBar primary={{ label: "Check your date", href: "/weddings#contact" }} hideWhenVisible="#plan" />
    </>
  );
}
