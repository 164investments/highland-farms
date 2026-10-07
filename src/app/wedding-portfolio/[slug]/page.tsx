import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/layout/StructuredData";
import { FieldReview, GOOGLE_REVIEW_LINK, resolveFieldQuote } from "@/components/field/Reviews";
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
  PLANNING_OFFER,
  seasonFromDate,
  weddingPortfolio,
  type WeddingCouple,
  type WeddingPhoto,
} from "@/data/wedding-portfolio";
import {
  COUPLE_KATE_QUOTE,
  STYLED_PHOTOGRAPHER_QUOTE,
  MAYA_LEAD_QUOTE,
  MAYA_REVIEW_OPENING,
  MAYA_REVIEW_REST,
} from "../quotes";
import { WEDDING_FORM_INTRO } from "@/components/home/home-data";

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
      title: confirmed ? `${couple.names} · Wedding Portfolio` : `${displayName(couple)} at Highland Farms`,
      description,
      alternates: { canonical: `/wedding-portfolio/${slug}` },
      openGraph: {
        title: confirmed ? `${couple.names} · Highland Farms Wedding` : `${displayName(couple)} at Highland Farms`,
        description,
        images: [
          {
            url: couple.coverImage,
            width: 1200,
            height: 630,
            alt: confirmed
              ? `${couple.names} wedding at Highland Farms`
              : (couple.images.find((image) => image.src === couple.coverImage)?.alt ?? couple.lead.alt),
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

/** Maya & Justin's four plates: two up then two wide on phones, an even 2x2 from lg. */
function CuratedPlates({ plates }: { plates: WeddingPhoto[] }) {
  const slots = [
    { frame: "aspect-[2/3] p-[6px] lg:aspect-[4/3] lg:p-2.5", figure: "lg:col-span-6", sizes: "(min-width: 1024px) 45vw, 46vw" },
    { frame: "aspect-[2/3] p-[6px] lg:aspect-[4/3] lg:p-2.5", figure: "lg:col-span-6", sizes: "(min-width: 1024px) 45vw, 46vw" },
    { frame: "aspect-[3/2] p-[7px] lg:aspect-[4/3] lg:p-2.5", figure: "col-span-2 lg:col-span-6", sizes: "(min-width: 1024px) 45vw, calc(100vw - 40px)" },
    { frame: "aspect-[4/3] p-[7px] lg:p-2.5", figure: "col-span-2 lg:col-span-6", sizes: "(min-width: 1024px) 45vw, calc(100vw - 40px)" },
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
        // A short last row of narrow plates is centred on the 6-column grid, never left with a hole.
        const narrowCount = Math.max(plates.length - 2, 0);
        const lastRowStart = 2 + narrowCount - (narrowCount % 3);
        const centreStart =
          i === lastRowStart && narrowCount % 3 === 2 ? "lg:col-start-2" : i === lastRowStart && narrowCount % 3 === 1 ? "lg:col-start-3" : "";
        // Phones: the lead is full width, then pairs; an odd one out at the end goes full width too.
        const loneOnPhone = i > 0 && i === plates.length - 1 && (plates.length - 1) % 2 === 1;
        return (
          <Plate
            key={photo.src}
            className={cn((i === 0 || loneOnPhone) && "col-span-2", wide ? "lg:col-span-3" : "lg:col-span-2", centreStart)}
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
            <PlateImage
              photo={photo}
              sizes={`(min-width: 1024px) ${wide ? "46vw" : "30vw"}, ${i === 0 || loneOnPhone ? "calc(100vw - 40px)" : "46vw"}`}
            />
          </Plate>
        );
      })}
    </>
  );
}

/**
 * One name for the journal page everywhere (menu, footer, every back link): "Real weddings".
 * A styled set says "The wedding portfolio", so it never reads as a real wedding.
 */
function BackLink({ styled = false }: { styled?: boolean }) {
  return (
    <Link
      href="/wedding-portfolio"
      className="order-1 inline-flex min-h-11 items-center gap-2 self-start font-sans text-[14px] font-medium text-pine lg:col-span-12"
    >
      <FieldArrow size={16} className="rotate-180" />
      {styled ? "The wedding portfolio" : "All real weddings"}
    </Link>
  );
}

/** "Photographed by …": a credit in plain text (an exit link above the hero pulled people off the page). */
function PhotographerCredit({ couple, className }: { couple: WeddingCouple; className?: string }) {
  const photographer = couple.photographer;
  if (!photographer) {
    if (!isConfirmed(couple)) return null;
    return (
      <PendingSlot note="PENDING CONNOR: photographer credit. No credit is embedded in these files. Hides the 'Photographed by' line.">
        <p className="font-sans text-[13px] text-ink-note">Photographed by [name from Connor]</p>
      </PendingSlot>
    );
  }
  return (
    <p className={cn("font-sans text-[13px] text-ink-note lg:text-[14px]", className)}>
      Photographed by {photographer.name}
    </p>
  );
}

/**
 * A set not confirmed as a wedding (RULINGS r4 #10): the H1 says what the
 * photographs show, the credit sits beneath it, and no couple is named. The
 * lead is a portrait frame with the calf, so desktop sets it beside the title.
 */
function StyledHeader({ couple }: { couple: WeddingCouple }) {
  return (
    <header className="mx-auto flex max-w-[1440px] flex-col px-5 pt-[calc(var(--header-h,104px)+0.5rem)] lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-16 lg:pt-[calc(var(--header-h,128px)+2rem)]">
      <BackLink styled />
      <div className="order-2 mt-1 lg:col-span-7 lg:mt-6">
        <p className="font-display text-[17px] italic text-fern lg:text-[22px]">Made at Highland Farms</p>
        <h1
          id="couple-title"
          className="field-heading mt-0.5 text-balance font-display text-[32px] leading-[1.02] text-ink lg:mt-2 lg:text-[64px] lg:leading-[1.0]"
        >
          {couple.headline ?? displayName(couple)}
        </h1>
        <PhotographerCredit couple={couple} className="mt-1 lg:mt-4" />
      </div>
      <Plate
        className="order-3 mt-3 lg:col-span-5 lg:mt-6"
        frameClassName="aspect-[4/3] p-[7px] lg:aspect-square lg:p-2.5"
        caption={couple.lead.caption}
      >
        <Image
          src={couple.lead.src}
          alt={couple.lead.alt}
          fill
          priority
          fetchPriority="high"
          sizes="(min-width: 1440px) 520px, (min-width: 1024px) 36vw, calc(100vw - 40px)"
          className={cn("object-cover", couple.lead.className)}
          style={{ objectPosition: couple.lead.position }}
        />
      </Plate>
    </header>
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
          {/* Title and lead plate. A set not confirmed as a wedding has its own header. */}
          {!confirmed ? (
            <StyledHeader couple={couple} />
          ) : (
          <header className="mx-auto flex max-w-[1440px] flex-col px-5 pt-[calc(var(--header-h,104px)+0.5rem)] lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16 lg:px-16 lg:pt-[calc(var(--header-h,128px)+2rem)]">
            <BackLink />
            {/* Phones: back link, eyebrow, names, date, credit, then the couple's plate on the 660 first screen. */}
            <div className="order-2 mt-1 lg:col-span-7 lg:mt-6">
              <p className="font-display text-[17px] italic text-fern lg:text-[22px]">
                {isMaya ? "A real wedding, with a Highland cow on the invitation" : "A real wedding at Highland Farms"}
              </p>
              {/* Size before line-height: cn() drops a line-height that comes before a font size. */}
              <h1
                id="couple-title"
                className="field-heading mt-0.5 font-display text-[46px] leading-[0.98] text-ink lg:mt-2 lg:text-[84px] lg:leading-[0.98]"
              >
                {couple.names}
              </h1>
              {couple.date && (
                <p className="mt-2 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-fern lg:mt-4 lg:text-[13px]">
                  {formatWeddingDate(couple.date, true)}
                </p>
              )}
              <PhotographerCredit couple={couple} className="mt-1 lg:mt-2" />
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
              {/* Her photographer's words, after the story (r4: in the header they pushed the couple
                  below the 660 first screen). The page's only quote while PF-01 waits. */}
              {isMaya && (
                <div className="mt-6 border-t border-rule pt-5 lg:mt-8 lg:pt-6">
                  <p className="font-display text-[17px] italic text-fern lg:text-[20px]">From their photographer</p>
                  <FieldReview
                    spec={COUPLE_KATE_QUOTE}
                    fullName
                    role="Wedding"
                    className="mt-2"
                    quoteClassName="text-[20px] leading-[1.3] lg:text-[22px]"
                  />
                </div>
              )}
            </div>
            <Plate
              className="order-3 mt-4 lg:order-4 lg:col-span-12 lg:mt-12"
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[21/10] lg:p-2.5"
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
          )}

          {/* The day, as plates */}
          <section aria-labelledby="plates-title" className="mx-auto max-w-[1440px] px-5 pb-6 pt-12 lg:px-16 lg:pb-8 lg:pt-20">
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

          {/* In her words (PF-01, pending): the bride's full review. The whole section renders nothing in
              production until Connor confirms Maya C. is this bride; Kate Holt's sentence sits on the first screen. */}
          {isMaya && opening && rest && (
            <PendingSlot
              className="mx-5 mt-12 lg:mx-16 lg:mt-20"
              note="PENDING CONNOR PF-01: confirm Maya C. is this bride. Hides the whole section (eyebrow, heading, stars, full review, link)."
            >
              <section
                aria-labelledby="words-title"
                className="border-t-[3px] border-double border-frame bg-paper-light"
              >
                <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-16 lg:py-20">
                  <p className="font-display text-[18px] italic text-fern lg:text-[22px]">In her words</p>
                  <h2
                    id="words-title"
                    className="field-heading mt-1 font-display text-[32px] leading-[1.04] text-ink lg:mt-2 lg:text-[48px]"
                  >
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
                </div>
              </section>
            </PendingSlot>
          )}
        </article>

        {/* Planning yours? The ask, right after their words, with the coos */}
        <section id="plan" aria-labelledby="plan-title" className="border-t border-rule">
          <div className="mx-auto max-w-[1440px] px-5 py-12 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-16 lg:px-16 lg:py-20">
            <Plate
              className="lg:col-span-5"
              frameClassName="aspect-[4/3] p-[7px] lg:aspect-[4/5] lg:p-2.5"
              caption={confirmed ? "The coos, our honorary wedding guests." : "A calf and two of the herd, by the barn."}
            >
              {/* Two pages must not end on the same photo: confirmed couples get the forest herd, a styled set the barn. */}
              <Image
                src={confirmed ? "/images/farm/about-hero.jpg" : "/images/farm/cows.jpg"}
                alt={
                  confirmed
                    ? "A Highland cow and two calves among tall mossy trees"
                    : "A Highland calf and two shaggy Highland cows stand on straw beside a wooden barn"
                }
                fill
                sizes="(min-width: 1024px) 40vw, calc(100vw - 40px)"
                className={confirmed ? "object-cover object-[62%_60%]" : "object-cover object-[50%_60%]"}
              />
            </Plate>
            <div className="mt-7 lg:col-span-6 lg:col-start-7 lg:mt-0">
              {/* A styled set has no couple's words: a wedding photographer on the farm instead (r5). */}
              {!confirmed && (
                <div className="mb-8 border-b border-rule pb-6">
                  <p className="font-display text-[17px] italic text-fern lg:text-[20px]">A wedding photographer on the farm</p>
                  <FieldReview
                    spec={STYLED_PHOTOGRAPHER_QUOTE}
                    role="Wedding"
                    className="mt-2"
                    quoteClassName="text-[20px] leading-[1.3] lg:text-[22px]"
                  />
                </div>
              )}
              <h2 id="plan-title" className="field-heading font-display text-[36px] leading-[1.02] text-ink lg:text-[56px]">
                Planning yours?
              </h2>
              {/* The offer, then the calendar-check sentence the forms use, word for word. */}
              <p className="mt-3 font-sans text-[16px] leading-[1.6] text-ink-body lg:text-[18px]">
                {PLANNING_OFFER} {WEDDING_FORM_INTRO}
              </p>
              <div id="plan-cta" className="mt-5">
              <Link href="/weddings#contact" className={cn(fieldCtaClass, "w-full lg:w-auto")}>
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
              </div>
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

      {/* No first-screen button on this page, so the bar shows from load. */}
      <FieldStickyBar primary={{ label: "Check your date", sublabel: "Two-night weddings from $13,000", href: "/weddings#contact" }} hideWhenVisible="#plan-cta" showOnLoad />
    </>
  );
}
