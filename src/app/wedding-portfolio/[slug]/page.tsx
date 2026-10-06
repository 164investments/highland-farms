import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ImageGallery } from "@/components/gallery/ImageGallery";
import {
  weddingPortfolio,
  seasonFromDate,
  type WeddingCouple,
} from "@/data/wedding-portfolio";
import { CONTACT, SITE } from "@/lib/constants";
import { StructuredData } from "@/components/layout/StructuredData";

export function generateStaticParams() {
  return weddingPortfolio.map((couple) => ({ slug: couple.slug }));
}

// Distinctive gallery moments per couple, drawn only from the alt captions
// that already exist in src/data/wedding-portfolio.ts (no new claims) — used
// to keep the six meta descriptions from reading as one templated sentence.
const GALLERY_HIGHLIGHTS: Record<string, string> = {
  "hannah-max": "a forest ceremony, first look, and wedding party portraits",
  "jen-ryan": "a forest ceremony, a Highland Cow photo op, and the reception",
  "sydney-casey": "a forest ceremony, first dance, and reception",
  "riley-jordan": "a forest ceremony, bridal party portraits, and reception",
  "maya-justin": "a forest ceremony, first look, and reception",
  "olivia-connor": "a forest ceremony, first dance, and celebration",
};

function monthYear(date?: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Builds a per-couple description from only verified facts: the season/date
 * embedded in the delivered photos' XMP metadata (see wedding-portfolio.ts),
 * the photographer credit embedded in that same metadata, and the gallery
 * highlights already captioned on the page. No wedding date, guest count, or
 * vendor is invented for couples where the source files don't carry one.
 */
function buildDescription(couple: WeddingCouple): string {
  const season = seasonFromDate(couple.date);
  const when = monthYear(couple.date);
  const highlight = GALLERY_HIGHLIGHTS[couple.slug] ?? "a forest ceremony and celebration";

  let description = `${couple.names}'s ${season ? `${season} wedding` : "wedding"} at Highland Farms, Oregon${
    when ? ` (${when})` : ""
  } — ${highlight} at the base of Mt. Hood.`;

  if (couple.photographer) {
    description += ` Photography by ${couple.photographer.name}.`;
  }

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

    return {
      title: `${couple.names} — Wedding Portfolio`,
      description,
      alternates: { canonical: `/wedding-portfolio/${slug}` },
      openGraph: {
        title: `${couple.names} — Highland Farms Wedding`,
        description,
        images: [
          {
            url: couple.coverImage,
            width: 1200,
            height: 630,
            alt: `${couple.names} wedding at Highland Farms`,
          },
        ],
      },
    };
  });
}

/**
 * Event + gallery structured data for one couple's page.
 *
 * Event is only emitted when a verified `date` exists (5 of 6 couples) —
 * Google's Event guidelines require startDate, and a fabricated one would be
 * worse than omitting the type entirely (see task constraints). The
 * ImageGallery/ImageObject block is emitted for every couple, using only the
 * real contentUrl + existing caption per image, plus a photographer credit
 * when one is embedded in that couple's files.
 */
function WeddingSchema({ couple }: { couple: WeddingCouple }) {
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
      name: `${couple.names} Wedding Gallery`,
      description,
      url: `${SITE.url}/wedding-portfolio/${couple.slug}`,
      associatedMedia: images,
    },
  ];

  if (couple.date) {
    graph.push({
      "@type": "Event",
      "@id": `${SITE.url}/wedding-portfolio/${couple.slug}#event`,
      name: `${couple.names} Wedding at Highland Farms`,
      description,
      startDate: couple.date,
      endDate: couple.date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: "Highland Farms Oregon",
        address,
      },
      image: images.map((image) => image.contentUrl),
      // guestCount and named vendors (florist, caterer, coordinator, DJ,
      // etc.) are intentionally omitted — no verified source for either
      // exists in this repo for any of the six couples. Populate
      // couple.guestCount / couple.vendors in wedding-portfolio.ts once
      // Hayden supplies real values and this block will pick them up.
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
    />
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

  const currentIndex = weddingPortfolio.findIndex((c) => c.slug === slug);
  const nextCouple = weddingPortfolio[(currentIndex + 1) % weddingPortfolio.length];
  const prevCouple = weddingPortfolio[(currentIndex - 1 + weddingPortfolio.length) % weddingPortfolio.length];

  const season = seasonFromDate(couple.date);
  const when = monthYear(couple.date);

  return (
    <>
      <WeddingSchema couple={couple} />
      <StructuredData pathname={`/wedding-portfolio/${couple.slug}`} />

      {/* Back link + Title */}
      <section className="pt-[calc(var(--header-h,120px)+1rem)] pb-8 bg-background">
        <Container>
          <Link
            href="/wedding-portfolio"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest transition-colors font-sans"
          >
            <ArrowLeft className="h-4 w-4" />
            All Weddings
          </Link>

          <h1 className="mt-6 text-4xl font-normal sm:text-5xl">
            {couple.names}
          </h1>
          <p className="mt-2 text-base text-muted font-sans">
            A{season ? ` ${season}` : ""} Highland Farms wedding in Brightwood, Oregon
            {when ? ` — ${when}` : ""}
          </p>

          {/* Only renders fields that have a verified value. guestCount and
              vendors stay hidden until Hayden supplies real data — see
              src/data/wedding-portfolio.ts. */}
          {(couple.photographer || couple.guestCount || (couple.vendors && couple.vendors.length > 0)) && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted font-sans">
              {couple.photographer && (
                <div className="flex gap-1.5">
                  <dt className="font-medium text-charcoal">Photography:</dt>
                  <dd>
                    {couple.photographer.url ? (
                      <a
                        href={couple.photographer.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:text-forest transition-colors"
                      >
                        {couple.photographer.name}
                      </a>
                    ) : (
                      couple.photographer.name
                    )}
                  </dd>
                </div>
              )}
              {couple.guestCount && (
                <div className="flex gap-1.5">
                  <dt className="font-medium text-charcoal">Guests:</dt>
                  <dd>{couple.guestCount}</dd>
                </div>
              )}
              {couple.vendors?.map((vendor) => (
                <div key={vendor.role} className="flex gap-1.5">
                  <dt className="font-medium text-charcoal">{vendor.role}:</dt>
                  <dd>
                    {vendor.url ? (
                      <a
                        href={vendor.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:text-forest transition-colors"
                      >
                        {vendor.name}
                      </a>
                    ) : (
                      vendor.name
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Container>
      </section>

      {/* Gallery */}
      <section className="pb-20 lg:pb-28 bg-background">
        <Container>
          <ImageGallery images={couple.images} columns={3} />
        </Container>
      </section>

      {/* Prev/Next Navigation */}
      <section className="py-12 bg-cream">
        <Container>
          <div className="flex items-center justify-between">
            <Link
              href={`/wedding-portfolio/${prevCouple.slug}`}
              className="text-sm font-light text-charcoal hover:text-forest transition-colors font-sans"
            >
              &larr; {prevCouple.names}
            </Link>
            <Link
              href="/wedding-portfolio"
              className="text-sm font-light text-muted hover:text-forest transition-colors font-sans"
            >
              All Weddings
            </Link>
            <Link
              href={`/wedding-portfolio/${nextCouple.slug}`}
              className="text-sm font-light text-charcoal hover:text-forest transition-colors font-sans"
            >
              {nextCouple.names} &rarr;
            </Link>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-background">
        <Container className="max-w-3xl text-center">
          <h2 className="text-3xl font-normal sm:text-4xl">
            Inspired? Let&apos;s Plan Yours.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted font-sans leading-relaxed">
            Every Highland Farms wedding is unique. Tell us your vision and
            we&apos;ll create the perfect all-inclusive package.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href="/weddings#contact">Get Your Custom Quote</Button>
            <Button href="/weddings" variant="outline">
              Learn About Weddings
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
